/**
 * Main Electron Playwright Agent
 * Handles complete automation flow for job applications
 */

import dotenv from 'dotenv';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { chromium } from 'playwright';
import { analyzeAndFillPage, clickNextButton, findSubmitButton, injectStatusOverlay } from './forms.js';

dotenv.config({ path: '.env.local' });

// Active browser sessions
const activeSessions = new Map();

function getOpenPage(session) {
  if (!session) return null;
  if (session.page && !session.page.isClosed()) return session.page;

  const fallbackPage = session.context?.pages?.().find((candidate) => !candidate.isClosed());
  if (fallbackPage) {
    session.page = fallbackPage;
    return fallbackPage;
  }

  return null;
}

async function attachPageToSession(sessionKey, nextPage) {
  const session = activeSessions.get(sessionKey);
  if (!session || !nextPage) return;

  session.page = nextPage;

  nextPage.on('domcontentloaded', async () => {
    const currentSession = activeSessions.get(sessionKey);
    if (!currentSession?.lastStatus || nextPage.isClosed()) return;
    try {
      await nextPage.waitForTimeout(200);
      await injectStatusOverlay(nextPage, currentSession.lastStatus.status, currentSession.lastStatus.message);
    } catch {
      // Ignore transient navigation races
    }
  });

  if (session.lastStatus) {
    try {
      await nextPage.waitForTimeout(200);
      await injectStatusOverlay(nextPage, session.lastStatus.status, session.lastStatus.message);
    } catch {
      // Ignore if the new page is still navigating
    }
  }
}

/**
 * Fetch from backend API
 */
async function fetchFromBackend(endpoint, token, backendUrl) {
  const url = backendUrl || process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
  
  const response = await fetch(`${url}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Backend error ${response.status}: ${text}`);
  }

  return response.json();
}

async function sendToBackend(endpoint, method, body, token, backendUrl) {
  const url = backendUrl || process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

  const response = await fetch(`${url}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Backend error ${response.status}: ${text}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

/**
 * Emit status to frontend via IPC
 */
function emitStatus(event, status, message, extras = {}) {
  console.log(`[Status] ${status}: ${message}`);
  if (event && event.sender) {
    event.sender.send('agent_status', { status, message, ...extras });
  }
}

async function emitAgentStatus(event, sessionKey, status, message, extras = {}) {
  emitStatus(event, status, message, extras);

  const session = activeSessions.get(sessionKey);
  if (!session) return;

  session.lastStatus = { status, message, extras };

  const currentPage = getOpenPage(session);
  if (currentPage) {
    try {
      await injectStatusOverlay(currentPage, status, message);
    } catch (err) {
      console.warn('[Overlay] Failed to inject status overlay:', err.message);
    }
  }
}

/**
 * Emit error to frontend
 */
function emitError(event, error) {
  console.error(`[Error] ${error}`);
  if (event && event.sender) {
    event.sender.send('agent_error', { error });
  }
}

/**
 * Emit completion to frontend
 */
function emitComplete(event, data) {
  console.log('[Complete]', data);
  if (event && event.sender) {
    event.sender.send('agent_complete', data);
  }
}

/**
 * Download resume to local file
 */
async function downloadResume(resumeUrl) {
  if (!resumeUrl) return null;

  try {
    const fileResponse = await fetch(resumeUrl);
    
    if (!fileResponse.ok) {
      console.warn(`[Resume] Failed to fetch from S3: ${fileResponse.statusText}`);
      return null;
    }

    const buffer = Buffer.from(await fileResponse.arrayBuffer());

    const tempDir = path.join(os.tmpdir(), 'Fillica-resumes');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const filePath = path.join(tempDir, `resume_${Date.now()}.pdf`);
    fs.writeFileSync(filePath, buffer);
    
    console.log(`[Resume] Downloaded to ${filePath}`);
    return filePath;
  } catch (err) {
    console.warn('[Resume] Download failed:', err.message);
    return null;
  }
}

/**
 * Main automation flow
 */
export async function handleStartAgent(event, { jobId, userId, token, backendUrl }) {
  if (!jobId || !userId) {
    emitError(event, 'Missing jobId or userId');
    return;
  }

  const sessionKey = `${userId}_${jobId}`;

  try {
    console.log(`[Agent] Starting automation for Job: ${jobId}, User: ${userId}`);
    console.log(`[Agent] Token present: ${!!token}, Backend: ${backendUrl}`);
    if (token) console.log(`[Agent] Token preview: ${token.substring(0, 10)}...`);

    await emitAgentStatus(event, sessionKey, 'connecting', 'Fetching your profile and job details...');

    // Fetch data from backend
    const [profileData, jobData] = await Promise.all([
      fetchFromBackend('/profile', token, backendUrl),
      fetchFromBackend(`/jobs/${jobId}`, token, backendUrl),
    ]);

    const profile = profileData.profile || profileData;
    const job = jobData.job || jobData;
    
    console.log(`[Agent] Profile loaded for: ${profile?.email}`);
    console.log(`[Agent] Job loaded: ${job?.title} at ${job?.company}`);

    if (!profile) {
      emitError(event, 'Profile not found. Please create a profile first.');
      return;
    }

    if (!job) {
      emitError(event, 'Job not found.');
      return;
    }

    const targetUrl = job.applicationUrl || job.url;

    if (!targetUrl) {
      emitError(event, 'This job has no application URL.');
      return;
    }

    if (!profile.aiConfiguration?.apiKey || profile.aiConfiguration.apiKey === '********') {
      emitError(event, 'AI Configuration missing. Please set your AI Provider and API Key in Profile settings.');
      return;
    }

    // Download resume if available
    await emitAgentStatus(event, sessionKey, 'connecting', 'Preparing automation environment...');
    let localResumePath = null;
    if (profile.resumeUrl) {
      localResumePath = await downloadResume(profile.resumeUrl);
    }

    // Launch browser
    await emitAgentStatus(event, sessionKey, 'initializing', 'Launching browser...');

    let browser, context, page;
    browser = await chromium.launch({
      headless: false,
      channel: 'chrome',
      args: ['--start-maximized'],
    });
    context = await browser.newContext({
      viewport: null,
      acceptDownloads: true,
    });

    const existingPages = context.pages();
    if (existingPages.length === 1 && existingPages[0].url() === 'about:blank') {
      page = existingPages[0];
    } else {
      page = await context.newPage();
    }
    page.setDefaultTimeout(60000);
    await page.bringToFront().catch(() => {});

    // Store session
    activeSessions.set(sessionKey, {
      browser,
      context,
      page,
      cancelled: false,
      localResumePath,
      token,
      backendUrl,
      lastStatus: { status: 'initializing', message: 'Launching browser...', extras: {} }
    });
    await attachPageToSession(sessionKey, page);

    context.on('page', async (newPage) => {
      const session = activeSessions.get(sessionKey);
      if (!session) return;

      try {
        await newPage.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
        await newPage.bringToFront().catch(() => {});
      } catch {
        // Ignore page readiness races
      }

      await attachPageToSession(sessionKey, newPage);
      await emitAgentStatus(event, sessionKey, 'navigating', 'Application opened in a new window. Continuing there...');
    });

    // Prepare user profile for AI
    const userProfile = {
      name: profile.name || '',
      email: profile.email || '',
      phone: profile.phone || '',
      password: profile.defaultPassword || '',
      location: profile.location || '',
      bio: profile.bio || '',
      skills: profile.skills || [],
      education: profile.education || [],
      experience: profile.workExperience || [],
      projects: profile.projects || [],
      certifications: profile.certifications || [],
      links: profile.links || {},
      demographics: profile.demographics || {},
      workAuthorization: profile.workAuthorization || {},
      expectedSalary: profile.expectedSalary || '',
      localResumePath: localResumePath || ''
    };

    // Navigate to job application
    await emitAgentStatus(event, sessionKey, 'navigating', `Opening ${job.company} application...`);
    await page.goto(targetUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });

    await emitAgentStatus(event, sessionKey, 'navigating', `Connected to ${job.company} application portal`);
    await page.waitForTimeout(2000);

    // Main automation loop
    const MAX_STEPS = 50;
    let stepNumber = 0;
    let requiresManualReview = false;

    while (stepNumber < MAX_STEPS) {
      stepNumber++;

      // Check if cancelled
      if (!activeSessions.has(sessionKey)) {
        await emitAgentStatus(event, sessionKey, 'cancelled', 'Automation cancelled by user');
        return;
      }

      await emitAgentStatus(event, sessionKey, 'analyzing', `Analyzing page (Step ${stepNumber}/${MAX_STEPS})...`);

      try {
        const sessionBefore = activeSessions.get(sessionKey);
        page = getOpenPage(sessionBefore) || page;
        const pageBefore = page;
        const urlBefore = pageBefore?.url?.() || '';
        const pageCountBefore = sessionBefore?.context?.pages?.().length || 0;

        // Analyze and fill current page
        const result = await analyzeAndFillPage(page, userProfile, profile.aiConfiguration, 
          (status, msg) => emitAgentStatus(event, sessionKey, status, msg));

        const sessionAfter = activeSessions.get(sessionKey);
        const activePage = getOpenPage(sessionAfter) || page;
        const urlAfter = activePage?.url?.() || '';
        const pageCountAfter = sessionAfter?.context?.pages?.().length || 0;
        const movedToNewPage = activePage !== pageBefore || pageCountAfter > pageCountBefore;
        const navigatedToDifferentUrl = !!urlAfter && urlAfter !== urlBefore;

        if (result.plan || result.playwrightCode) {
          await emitAgentStatus(event, sessionKey, 'executing', result.plan || 'Applying actions...', {
            plan: result.plan,
            playwright_code: result.playwrightCode,
          });
        }

        if (result.navigated || movedToNewPage || navigatedToDifferentUrl) {
          page = activePage;
          await emitAgentStatus(event, sessionKey, 'navigating', 'Action changed the page. Continuing on the application form...');
          await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
          await page.waitForTimeout(1000);
          continue;
        }

        // Check if there's a submit button
        if (result.hasSubmitButton) {
          await emitAgentStatus(event, sessionKey, 'executing', 'Preparing to submit application...');
          
          const submitSelector = await findSubmitButton(activePage);
          if (submitSelector) {
            requiresManualReview = true;
            const session = activeSessions.get(sessionKey);
            if (session) session.keepOpen = true;
            await emitAgentStatus(event, sessionKey, 'review', 'Submit button found. Ready to complete application. Please review the browser window and confirm submission.');
            break;
          }
        }

        if (result.performedAction) {
          await emitAgentStatus(event, sessionKey, 'analyzing', 'Action applied. Re-checking the current page...');
          await activePage.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
          await activePage.waitForTimeout(1000);
          continue;
        }

        // Only fall back to a generic next button when the AI did not take any action.
        const hasNext = await clickNextButton(activePage);
        if (!hasNext) {
          const submitSelector = await findSubmitButton(activePage);
          if (submitSelector) {
            requiresManualReview = true;
            const session = activeSessions.get(sessionKey);
            if (session) session.keepOpen = true;
            await emitAgentStatus(event, sessionKey, 'review', 'Form complete. Ready to submit. Please review the browser window and click Submit there.');
            break;
          }

          requiresManualReview = true;
          const session = activeSessions.get(sessionKey);
          if (session) session.keepOpen = true;
          await emitAgentStatus(event, sessionKey, 'review', 'Page navigation not found. Please review the browser.');
          break;
        }

      } catch (err) {
        console.error('[Step Error]', err);
        requiresManualReview = true;
        const session = activeSessions.get(sessionKey);
        if (session) session.keepOpen = true;
        const msg = (err && err.message) ? err.message : String(err);
        if (msg.toLowerCase().includes('timed out')) {
          await emitAgentStatus(event, sessionKey, 'review', 'AI timed out on this step. Browser is open; please review and continue manually, then click Mark as Done.');
        } else {
          await emitAgentStatus(event, sessionKey, 'review', `Step ${stepNumber}: ${msg}`);
        }
        break;
      }
    }

    if (requiresManualReview) {
      return;
    }

    const session = activeSessions.get(sessionKey);
    if (session) session.keepOpen = true;
    await emitAgentStatus(event, sessionKey, 'completed', 'Automation completed. Browser remains open for review.');
    emitComplete(event, {
      status: 'success',
      jobId,
      userId,
      message: 'Automation completed'
    });

  } catch (err) {
    console.error('[Agent] Fatal error:', err);
    emitError(event, err.message || 'Automation failed');
  } finally {
    setTimeout(() => {
      const session = activeSessions.get(sessionKey);
      if (session) {
        try {
          // Clean up downloaded resume
          if (session.localResumePath) {
            try {
              fs.unlinkSync(session.localResumePath);
              console.log('[Cleanup] Deleted resume:', session.localResumePath);
            } catch (err) {
              console.warn('[Cleanup] Could not delete resume:', err.message);
            }
          }

          if (!session.keepOpen) {
            session.page?.close().catch(() => {});
            session.context?.close().catch(() => {});
            session.browser?.close().catch(() => {});
          }
        } catch (err) {
          console.error('[Cleanup]', err);
        }
        activeSessions.delete(sessionKey);
      }
    }, 600000);
  }
}

/**
 * Cancel automation
 */
export async function handleCancelAgent(event, { jobId, userId }) {
  const sessionKey = `${userId}_${jobId}`;
  const session = activeSessions.get(sessionKey);

  if (!session) {
    emitError(event, 'No automation running');
    return;
  }

  try {
    session.cancelled = true;

    if (session.page && !session.page.isClosed()) {
      await session.page.close().catch(() => {});
    }
    if (session.context) {
      await session.context.close().catch(() => {});
    }
    if (session.browser) {
      await session.browser.close().catch(() => {});
    }

    activeSessions.delete(sessionKey);
    await emitAgentStatus(event, sessionKey, 'cancelled', 'Automation cancelled');

  } catch (err) {
    console.error('[Cancel] Error:', err);
    emitError(event, err.message);
  }
}

/**
 * Handle user input
 */
export async function handleUserSubmit(event, { jobId, userId, userInput, token, backendUrl }) {
  const sessionKey = `${userId}_${jobId}`;
  const session = activeSessions.get(sessionKey);

  if (!session) {
    emitError(event, 'No active automation');
    return;
  }

  try {
    session.userInput = userInput;
    await emitAgentStatus(event, sessionKey, 'executing', 'Finalizing application...');

    const authToken = token || session.token;
    const resolvedBackendUrl = backendUrl || session.backendUrl;

    if (!authToken) {
      throw new Error('Authentication token missing while finishing the application.');
    }

    await sendToBackend(`/jobs/${jobId}/applied`, 'PATCH', { applied: true }, authToken, resolvedBackendUrl);

    if (session.localResumePath && fs.existsSync(session.localResumePath)) {
      try {
        fs.unlinkSync(session.localResumePath);
      } catch (err) {
        console.warn('[Cleanup] Failed to remove local resume:', err.message);
      }
    }

    const currentPage = getOpenPage(session);
    if (currentPage) {
      await currentPage.close().catch(() => {});
    }
    if (session.context) {
      await session.context.close().catch(() => {});
    }
    if (session.browser) {
      await session.browser.close().catch(() => {});
    }

    activeSessions.delete(sessionKey);
    emitStatus(event, 'completed', 'Form submitted successfully!');
    emitComplete(event, {
      status: 'success',
      jobId,
      userId,
      message: 'Form submitted successfully!',
    });
  } catch (err) {
    console.error('[Submit] Error:', err);
    emitError(event, err.message);
  }
}
