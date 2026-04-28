/**
 * Main Electron Playwright Agent
 * Handles complete automation flow for job applications
 */

import { chromium } from 'playwright';
import { callAgentAI, getPageElements, buildContextPrompt, SYSTEM_PROMPT } from './ai.js';
import { analyzeAndFillPage, clickNextButton, findSubmitButton, submitForm } from './forms.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Active browser sessions
const activeSessions = new Map();

/**
 * Fetch from backend API
 */
async function fetchFromBackend(endpoint, token) {
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
  
  const response = await fetch(`${backendUrl}${endpoint}`, {
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

/**
 * Emit status to frontend via IPC
 */
function emitStatus(event, status, message, extras = {}) {
  console.log(`[Status] ${status}: ${message}`);
  if (event && event.sender) {
    event.sender.send('agent_status', { status, message, ...extras });
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
async function downloadResume(resumeUrl, token) {
  if (!resumeUrl) return null;

  try {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
    const response = await fetch(`${backendUrl}/profile/resume-url`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) return null;

    const { signedUrl } = await response.json();
    const fileResponse = await fetch(signedUrl);
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
export async function handleStartAgent(event, { jobId, userId, token }) {
  if (!jobId || !userId) {
    emitError(event, 'Missing jobId or userId');
    return;
  }

  const sessionKey = `${userId}_${jobId}`;

  try {
    emitStatus(event, 'connecting', 'Fetching your profile and job details...');

    // Fetch data from backend
    const [profileResp, jobResp] = await Promise.all([
      fetchFromBackend('/profile', token),
      fetchFromBackend(`/jobs/${jobId}`, token),
    ]);

    const profile = profileResp;
    const job = jobResp;

    if (!profile) {
      emitError(event, 'Profile not found. Please create a profile first.');
      return;
    }

    if (!job) {
      emitError(event, 'Job not found.');
      return;
    }

    if (!job.applicationUrl) {
      emitError(event, 'This job has no application URL.');
      return;
    }

    if (!profile.aiConfiguration?.apiKey || profile.aiConfiguration.apiKey === '********') {
      emitError(event, 'AI Configuration missing. Please set your AI Provider and API Key in Profile settings.');
      return;
    }

    // Download resume if available
    emitStatus(event, 'connecting', 'Preparing automation environment...');
    let localResumePath = null;
    if (profile.resumeUrl) {
      localResumePath = await downloadResume(profile.resumeUrl, token);
    }

    // Launch browser
    emitStatus(event, 'initializing', 'Launching browser...');

    let browser, context, page;
    const userDataDir = path.join(os.homedir(), '.Fillica-chrome');

    try {
      context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        channel: 'chrome',
        viewport: null,
        args: ['--start-maximized'],
      });
    } catch (err) {
      console.warn('[Browser] Persistent context failed, using temporary:', err.message);
      browser = await chromium.launch({ headless: false, channel: 'chrome' });
      context = await browser.createBrowserContext();
    }

    page = await context.newPage();
    page.setDefaultTimeout(60000);
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Store session
    activeSessions.set(sessionKey, {
      browser,
      context,
      page,
      cancelled: false,
      localResumePath
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
    emitStatus(event, 'navigating', `Opening ${job.company} application...`);
    await page.goto(job.applicationUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    await page.waitForTimeout(2000);

    // Main automation loop
    const MAX_STEPS = 20;
    let stepNumber = 0;

    while (stepNumber < MAX_STEPS) {
      stepNumber++;

      // Check if cancelled
      if (!activeSessions.has(sessionKey)) {
        emitStatus(event, 'cancelled', 'Automation cancelled by user');
        return;
      }

      emitStatus(event, 'analyzing', `Analyzing page (Step ${stepNumber}/${MAX_STEPS})...`);

      try {
        // Analyze and fill current page
        const result = await analyzeAndFillPage(page, userProfile, profile.aiConfiguration, 
          (status, msg) => emitStatus(event, status, msg));

        // Check if there's a submit button
        if (result.hasSubmitButton) {
          emitStatus(event, 'executing', 'Preparing to submit application...');
          
          const submitSelector = await findSubmitButton(page);
          if (submitSelector) {
            emitStatus(event, 'review', 'Submit button found. Ready to complete application. Please review the browser window and confirm submission.');
            break;
          }
        }

        // Try to click next button
        const hasNext = await clickNextButton(page);
        if (!hasNext) {
          const submitSelector = await findSubmitButton(page);
          if (submitSelector) {
            emitStatus(event, 'executing', 'Form complete. Ready to submit.');
            break;
          }

          emitStatus(event, 'review', 'Page navigation not found. Please review the browser.');
          break;
        }

      } catch (err) {
        console.error('[Step Error]', err);
        emitStatus(event, 'review', `Step ${stepNumber}: ${err.message}`);
        break;
      }
    }

    emitStatus(event, 'complete', 'Automation completed. Browser remains open for review.');
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
      if (session && !session.keepOpen) {
        try {
          session.page?.close().catch(() => {});
          session.context?.close().catch(() => {});
          session.browser?.close().catch(() => {});
        } catch (err) {
          console.error('[Cleanup]', err);
        }
        activeSessions.delete(sessionKey);
      }
    }, 30000);
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
    emitStatus(event, 'cancelled', 'Automation cancelled');

  } catch (err) {
    console.error('[Cancel] Error:', err);
    emitError(event, err.message);
  }
}

/**
 * Handle user input
 */
export async function handleUserSubmit(event, { jobId, userId, userInput }) {
  const sessionKey = `${userId}_${jobId}`;
  const session = activeSessions.get(sessionKey);

  if (!session) {
    emitError(event, 'No active automation');
    return;
  }

  try {
    session.userInput = userInput;
    emitStatus(event, 'processing', 'Processing user input...');
  } catch (err) {
    console.error('[Submit] Error:', err);
    emitError(event, err.message);
  }
}
