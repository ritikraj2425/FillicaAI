import { chromium } from 'playwright';
import {
  SYSTEM_PROMPT,
  minimizeDOM,
  buildContextPrompt,
  callAgentAI,
  classifyActions,
} from '../services/agent.js';
import AutomationRun from '../models/automationRun.js';
import Profile from '../models/profile.js';
import Job from '../models/job.js';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { getSignedFileUrl } from '../config/s3.js';

// Active browser sessions keyed by `userId_jobId`
const activeSessions = new Map();

// Global persistent browser context
let globalBrowserContext = null;

/**
 * Initialize Socket.IO event handlers
 */
export function setupAutomationSocket(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    socket.on('start_agent', async (data) => {
      try {
        await handleStartAgent(socket, io, data);
      } catch (err) {
        console.error('[Agent] Fatal error:', err);
        socket.emit('agent_error', { error: err.message });
      }
    });

    socket.on('cancel_agent', async (data) => {
      try {
        await handleCancelAgent(socket, data);
      } catch (err) {
        console.error('[Agent] Cancel error:', err);
      }
    });

    socket.on('user_submit', async (data) => {
      try {
        await handleUserSubmit(socket, data);
      } catch (err) {
        console.error('[Agent] Submit error:', err);
        socket.emit('agent_error', { error: err.message });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });
}

/**
 * Main agent execution loop
 */
async function handleStartAgent(socket, io, { jobId, userId }) {
  if (!jobId || !userId) {
    socket.emit('agent_error', { error: 'Missing jobId or userId' });
    return;
  }

  const sessionKey = `${userId}_${jobId}`;

  // Fetch user profile and job data
  const [profile, job] = await Promise.all([
    Profile.findOne({ userId }).select('+defaultPassword +aiConfiguration.apiKey').lean(),
    Job.findById(jobId).lean(),
  ]);

  if (!profile) {
    socket.emit('agent_error', { error: 'Profile not found. Please create a profile first.' });
    return;
  }
  if (!job) {
    socket.emit('agent_error', { error: 'Job not found.' });
    return;
  }
  if (!job.applicationUrl) {
    socket.emit('agent_error', { error: 'This job has no application URL.' });
    return;
  }

  // MANDATORY: Check for AI configuration
  if (!profile.aiConfiguration || !profile.aiConfiguration.apiKey || profile.aiConfiguration.apiKey === '********') {
    socket.emit('agent_error', {
      error: 'AI Configuration Missing: Please set your personal AI Provider and API Key in the Profile section before running automation.'
    });
    return;
  }

  // Create automation run record
  const run = await AutomationRun.create({
    userId,
    jobId,
    status: 'running',
  });

  let browser;
  let context;
  let page;

  const updateStatus = async (status, message, extras = {}) => {
    socket.emit('agent_status', { status, message, ...extras });
    // Inject Comet-style glowing border + centered status bar into the Playwright browser
    if (page && !page.isClosed()) {
      try {
        const isActive = ['connecting', 'navigating', 'analyzing', 'planning', 'executing'].includes(status);
        await page.evaluate(({ msg, active }) => {
          // ─── Animated Glow Overlay ───
          let glowEl = document.getElementById('Fillica-glow');
          if (!glowEl) {
            glowEl = document.createElement('div');
            glowEl.id = 'Fillica-glow';
            Object.assign(glowEl.style, {
              position: 'fixed', top: '2px', left: '2px', right: '2px', bottom: '2px',
              zIndex: '2147483646',
              border: '4px solid transparent',
              borderRadius: '24px',
              transition: 'opacity 0.4s ease, background 0.4s ease'
            });
            document.body.appendChild(glowEl);

            if (!document.getElementById('Fillica-glow-style')) {
              const style = document.createElement('style');
              style.id = 'Fillica-glow-style';
              style.textContent = `
                @keyframes Fillica-border-glow {
                  0%, 100% { border-color: rgba(13, 148, 136, 0.8); box-shadow: inset 0 0 20px rgba(13, 148, 136, 0.15), 0 0 20px rgba(13, 148, 136, 0.2); }
                  50% { border-color: rgba(6, 182, 212, 0.9); box-shadow: inset 0 0 30px rgba(6, 182, 212, 0.2), 0 0 30px rgba(6, 182, 212, 0.3); }
                }
              `;
              document.head.appendChild(style);
            }
          }
          if (active) {
            glowEl.style.animation = 'Fillica-border-glow 2s ease-in-out infinite';
            glowEl.style.background = 'rgba(0, 0, 0, 0.1)';
            glowEl.style.opacity = '1';
            glowEl.style.pointerEvents = 'none'; // CRITICAL: Allow Playwright to click through the overlay
          } else {
            glowEl.style.animation = 'none';
            glowEl.style.background = 'transparent';
            glowEl.style.opacity = '0';
            glowEl.style.pointerEvents = 'none'; // Enable touch
          }

          // ─── Status Bar ───
          let statusBar = document.getElementById('Fillica-status');
          if (!statusBar) {
            statusBar = document.createElement('div');
            statusBar.id = 'Fillica-status';
            Object.assign(statusBar.style, {
              position: 'fixed',
              background: 'rgba(15, 23, 42, 0.92)',
              backdropFilter: 'blur(12px)',
              color: '#fff',
              zIndex: '2147483647',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace',
              fontWeight: '500',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(13, 148, 136, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              transition: 'all 0.4s ease',
              whiteSpace: 'nowrap'
            });
            document.body.appendChild(statusBar);
          }
          if (active) {
            // Centered prominent
            Object.assign(statusBar.style, {
              top: '50%', left: '50%', right: 'auto', bottom: 'auto',
              transform: 'translate(-50%, -50%)',
              padding: '24px 48px',
              borderRadius: '24px',
              fontSize: '20px',
              flexDirection: 'column',
              opacity: '1',
              pointerEvents: 'none'
            });
            statusBar.innerHTML = `
              <div style="display:flex;align-items:center;gap:12px;">
                <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#0d9488;animation:Fillica-border-glow 1.5s infinite"></span>
                <span style="font-weight:700">AI AT WORK</span>
              </div>
              <div style="font-size:15px;color:#94a3b8;margin-top:8px;font-weight:400">${msg}</div>
            `;
          } else if (msg) {
            // Top right corner (Error, Review, Idle, Cancelled, etc)
            const isError = msg.toLowerCase().includes('error') || msg.toLowerCase().includes('fail');
            Object.assign(statusBar.style, {
              top: '24px', right: '24px', left: 'auto', bottom: 'auto',
              transform: 'none',
              padding: '12px 24px',
              borderRadius: '100px',
              fontSize: '14px',
              flexDirection: 'row',
              opacity: '1',
              pointerEvents: 'all'
            });
            const dotColor = isError ? '#ef4444' : '#22c55e';
            statusBar.innerHTML = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${dotColor}"></span> ${msg}`;
          } else {
            statusBar.style.opacity = '0';
          }
        }, { msg: message, active: isActive });
      } catch (err) {
        // Ignore evaluation errors if page navigates
      }
    }
  };

  await updateStatus('connecting', 'Connecting to browser...', { sessionId: run._id.toString() });

  // Download resume to local temp file
  let localResumePath = null;
  if (profile.resumeUrl) {
    try {
      const signedUrl = await getSignedFileUrl(profile.resumeUrl);
      const fetchRes = await fetch(signedUrl);
      const buffer = Buffer.from(await fetchRes.arrayBuffer());
      const tempDir = path.join(os.tmpdir(), 'Fillica-resumes');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      localResumePath = path.join(tempDir, `${userId}_resume.pdf`);
      fs.writeFileSync(localResumePath, buffer);
      console.log(`[Agent] Downloaded resume to ${localResumePath}`);
    } catch (err) {
      console.error('[Agent] Failed to download resume:', err);
    }
  }

  // Launch or reuse Local Playwright Context
  try {
    const userDataDir = path.join(os.homedir(), '.Fillica-chrome-data');

    // Helper to check if context is valid
    const isContextValid = (ctx) => {
      try {
        return ctx && ctx.browser() && ctx.browser().isConnected();
      } catch (e) { return false; }
    };

    // If existing context is invalid, clear it
    if (globalBrowserContext && !isContextValid(globalBrowserContext)) {
      globalBrowserContext = null;
    }

    if (!globalBrowserContext) {
      try {
        globalBrowserContext = await chromium.launchPersistentContext(userDataDir, {
          headless: false,
          channel: 'chrome',
          viewport: null,
        });
      } catch (err) {
        if (err.message.includes('ProcessSingleton') || err.message.includes('locked')) {
          console.warn('[Agent] Persistent profile locked. Launching temporary non-persistent browser.');
          browser = await chromium.launch({ headless: false, channel: 'chrome' });
          context = await browser.newContext();
        } else {
          throw err;
        }
      }
    }

    if (!context && globalBrowserContext) {
      context = globalBrowserContext;
    }

    // Try to open a new tab, re-launch if context died
    try {
      const pages = context.pages();
      if (pages.length === 1 && pages[0].url() === 'about:blank') {
        page = pages[0];
      } else {
        page = await context.newPage();
      }
    } catch (e) {
      console.warn('[Agent] Browser context died, re-launching...', e.message);
      globalBrowserContext = null;
      // Recurse once to try again with fresh browser
      return handleStartAgent(socket, io, { jobId, userId });
    }

    // Store session for cleanup
    activeSessions.set(sessionKey, { browser, page, run, localResumePath });

    await updateStatus('navigating', `Navigating to ${job.applicationUrl}...`, { runId: run._id });

    // Navigate to application URL
    page.setDefaultTimeout(60000); // Increase timeout for slow job portals
    await page.goto(job.applicationUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000); // Allow dynamic content to load

    // Build user profile object for the AI (clean sensitive data formatting)
    const userProfile = {
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      password: profile.defaultPassword, // For job portal logins
      location: profile.location,
      bio: profile.bio,
      applicationUrl: job.applicationUrl,
      localResumePath: localResumePath,
      skills: profile.skills,
      education: profile.education,
      workExperience: profile.workExperience,
      projects: profile.projects,
      certifications: profile.certifications,
      achievements: profile.achievements,
      links: profile.links || {},
      demographics: profile.demographics || {},
      workAuthorization: profile.workAuthorization || {},
      expectedSalary: profile.expectedSalary || '',
    };

    // State machine loop — max 10 pages/steps
    const MAX_STEPS = 15;
    let stepNumber = 0;

    while (stepNumber < MAX_STEPS) {
      stepNumber++;

      // Check if session was cancelled
      if (!activeSessions.has(sessionKey)) {
        await updateStatus('cancelled', 'Agent cancelled by user.');
        run.status = 'cancelled';
        await run.save();
        return;
      }

      await updateStatus('analyzing', `Analyzing page (Step ${stepNumber})...`, { stepNumber });

      // Get current page state
      const currentUrl = page.url();

      // Wait for the page to be somewhat stable
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => { });
      await page.waitForTimeout(1000);

      // Inject a script to find spatial context and pierce Shadow DOM (Hyper-Vast Edition)
      const getVastDOM = async (frame) => {
        try {
          const frameDOM = await frame.evaluate(() => {
            const results = [];
            let elementIdCounter = 0;

            function walk(node) {
              if (node.shadowRoot) walk(node.shadowRoot);
              for (const child of node.children || []) {
                const tag = child.tagName?.toLowerCase();
                const role = child.getAttribute('role');
                const type = child.getAttribute('type');

                // --- CAPTURE NARRATIVE CONTEXT (Headings & Paragraphs) ---
                if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'].includes(tag)) {
                  const text = child.innerText.trim();
                  if (text.length > 3 && text.length < 200) {
                    results.push({ tag, type: 'context', text });
                  }
                  continue; // Context nodes don't need further deep processing here
                }

                const isInteractive = ['input', 'textarea', 'select', 'button'].includes(tag) ||
                  ['button', 'checkbox', 'radio', 'combobox', 'listbox', 'option'].includes(role) ||
                  (tag === 'a' && (child.href?.includes('apply') || child.href?.includes('login')));

                if (isInteractive) {
                  const style = window.getComputedStyle(child);
                  if (style.display === 'none' || style.visibility === 'hidden') continue;

                  const rect = child.getBoundingClientRect();
                  if (rect.width > 0 && rect.height > 0) {
                    const uniqueId = `Fillica-${Date.now()}-${elementIdCounter++}`;
                    child.setAttribute('data-Fillica-id', uniqueId);

                    // Find Question Context (looking upwards and backwards)
                    let question = '';
                    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
                    walker.currentNode = child;
                    let nodeText;
                    let count = 0;
                    while ((nodeText = walker.previousNode()) && count < 20) {
                      count++;
                      const text = nodeText.textContent.trim();
                      if (text.length > 3 && text.length < 300 && /[a-zA-Z]/.test(text)) {
                        question = text;
                        break;
                      }
                    }

                    // Aria-describedby support
                    let description = '';
                    const descId = child.getAttribute('aria-describedby');
                    if (descId) {
                      const descEl = document.getElementById(descId);
                      if (descEl) description = descEl.innerText.trim();
                    }

                    let optionLabel = '';
                    if (tag === 'button' || tag === 'option' || role === 'option' || type === 'submit') {
                      optionLabel = child.innerText.trim() || child.value;
                    } else {
                      optionLabel = child.parentElement?.innerText.trim().split('\n').pop().trim().substring(0, 100);
                    }

                    results.push({
                      tag, type, question, optionLabel, description,
                      id: child.id,
                      name: child.getAttribute('name'),
                      placeholder: child.getAttribute('placeholder'),
                      value: child.value || child.innerText,
                      ariaLabel: child.getAttribute('aria-label'),
                      role,
                      required: child.required || child.getAttribute('aria-required') === 'true',
                      checked: child.checked,
                      options: tag === 'select' ? Array.from(child.options).map(o => ({ value: o.value, text: o.text })) : [],
                      selector: `[data-Fillica-id="${uniqueId}"]`
                    });
                  }
                }
                walk(child);
              }
            }
            walk(document.body);
            return results;
          });
          return frameDOM;
        } catch (e) { return []; }
      };

      const allElements = [];
      for (const frame of page.frames()) {
        const frameElements = await getVastDOM(frame);
        allElements.push(...frameElements);
      }

      const dom = JSON.stringify(allElements);

      // Call Gemini
      await updateStatus('planning', 'AI is formulating an action plan...', { stepNumber });

      const contextPrompt = buildContextPrompt(currentUrl, dom, userProfile);
      let aiResponse;

      try {
        // Simple retry for the first AI call to handle cold starts or transient network blips
        let attempts = 0;
        while (attempts < 2) {
          try {
            aiResponse = await callAgentAI(SYSTEM_PROMPT, contextPrompt, profile.aiConfiguration);
            break;
          } catch (e) {
            attempts++;
            if (attempts >= 2) throw e;
            console.warn(`[Agent] AI attempt ${attempts} failed, retrying...`);
            await page.waitForTimeout(1000);
          }
        }
      } catch (err) {
        console.error('[Agent] AI call failed:', err);
        const errorMsg = err.message.includes('429')
          ? 'Gemini API quota exceeded (429). Please try again in a few minutes.'
          : 'AI failed to analyze the page. ' + err.message;

        await updateStatus('failed', errorMsg);
        socket.emit('agent_error', { error: errorMsg });

        run.status = 'failed';
        run.error = err.message;
        await run.save();
        return;
      }

      // Check if it's a job form at all, BUT allow navigation if code is provided
      if (aiResponse.is_job_form === false && !aiResponse.playwright_code) {
        await updateStatus('review', 'AI determined this is not a job form and cannot find a way to navigate to one. Browser remains open.');
        run.status = 'review';
        await run.save();
        return; // Keep browser open
      }

      socket.emit('agent_actions', {
        stepNumber,
        plan: aiResponse.plan,
        playwright_code: aiResponse.playwright_code || '',
        is_job_form: aiResponse.is_job_form,
        hasSubmitButton: aiResponse.has_submit_button || false,
      });

      // Execute generated code
      if (aiResponse.playwright_code) {
        await updateStatus('executing', 'Applying AI action plan to the browser...', { stepNumber });

        try {
          // Dangerous in production, but OK for local user desktop automation
          const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
          // Merge localResumePath into userProfile for AI convenience
          const profileWithResume = { ...userProfile, localResumePath };

          const executeCode = new AsyncFunction('page', 'userProfile', aiResponse.playwright_code);
          await executeCode(page, profileWithResume);
          await page.waitForTimeout(2000); // Wait for potential navigations
        } catch (err) {
          console.error(`[Agent] Code execution failed:`, err.message);
          await updateStatus('failed', 'Automation encountered an error: ' + err.message);
          socket.emit('agent_error', {
            error: 'Automation action failed: ' + err.message
          });
          // Set to review instead of failed so the browser stays open for manual intervention
          run.status = 'review';
          run.error = err.message;
          await run.save();
          return;
        }
      }

      // Update run totals
      run.totalActions += 1;
      await run.save();

      // Decision: continue to next page or stop?
      if (aiResponse.has_submit_button) {
        // We reached the final submit — stop and let user review
        await updateStatus('review', 'Form is filled! Browser is open on your desktop. Review and submit manually.');

        run.status = 'review';
        run.completedAt = new Date();
        await run.save();

        socket.emit('agent_complete', {
          runId: run._id,
          message: 'Agent finished filling the form. Please review and submit manually on your desktop.',
        });

        return;
      }
    }

    // If we get here, we've exhausted steps
    await updateStatus('review', 'Agent finished. Please review browser manually.');
    run.status = 'review';
    run.completedAt = new Date();
    await run.save();

    socket.emit('agent_complete', {
      runId: run._id,
      message: 'Agent finished. Please review browser manually.',
    });

  } catch (err) {
    console.error('[Agent] Execution error:', err);
    await updateStatus('failed', 'Automation error: ' + err.message);
    run.status = 'review'; // keep open
    run.error = err.message;
    await run.save();
    socket.emit('agent_error', { error: err.message });
  } finally {
    // Clean up temporary resume file in ALL cases when the function finishes
    if (localResumePath && fs.existsSync(localResumePath)) {
      try {
        fs.unlinkSync(localResumePath);
        console.log(`[Agent] Cleaned up temporary resume: ${localResumePath}`);
      } catch (e) {
        console.error(`[Agent] Failed to delete temp resume: ${e.message}`);
      }
    }

    // Clean up browser ONLY if it was explicitly cancelled or finished
    // If it's in 'review' or 'failed' state, we keep it open for the user to see/fix.
    if (run.status === 'cancelled' || run.status === 'completed') {
      try {
        if (browser) await browser.close();
        else if (page) await page.close(); // Only close the specific tab if using global context
      } catch { }
      activeSessions.delete(sessionKey);
    }
  }
}

/**
 * Execute a single action on the page
 */
async function executeAction(page, action) {
  const { selector, action: actionType, value } = action;

  // Wait for element
  await page.waitForSelector(selector, { timeout: 5000 });

  switch (actionType) {
    case 'type':
      // Clear existing value first, then type
      await page.click(selector, { clickCount: 3 }); // Select all
      await page.fill(selector, value || '');
      break;

    case 'click':
      await page.click(selector);
      break;

    case 'select':
      await page.selectOption(selector, value || '');
      break;

    default:
      console.warn(`[Agent] Unknown action type: ${actionType}`);
  }
}

/**
 * Cancel an active automation
 */
async function handleCancelAgent(socket, { userId, jobId }) {
  const sessionKey = `${userId}_${jobId}`;
  const session = activeSessions.get(sessionKey);

  if (session) {
    try {
      if (session.browser) await session.browser.close();
      else if (session.page) await session.page.close();
    } catch { }

    if (session.run) {
      session.run.status = 'cancelled';
      await session.run.save();
    }

    activeSessions.delete(sessionKey);
  }

  socket.emit('agent_status', { status: 'cancelled', message: 'Agent cancelled.' });
}

/**
 * Handle when user confirms form submission from UI
 */
async function handleUserSubmit(socket, { userId, jobId }) {
  const sessionKey = `${userId}_${jobId}`;
  const session = activeSessions.get(sessionKey);

  if (session?.run) {
    session.run.status = 'completed';
    session.run.completedAt = new Date();
    await session.run.save();
  }

  // Also mark the job as applied
  try {
    await Job.findByIdAndUpdate(jobId, { applied: true });
  } catch (err) {
    console.error('Failed to mark job as applied:', err);
  }

  // Clean up browser and temp files
  if (session?.localResumePath && fs.existsSync(session.localResumePath)) {
    try { fs.unlinkSync(session.localResumePath); } catch (e) { }
  }
  if (session?.browser) {
    try {
      await session.browser.close();
    } catch { }
  }

  activeSessions.delete(sessionKey);

  socket.emit('agent_status', {
    status: 'completed',
    message: 'Form submitted successfully!',
  });
}

/**
 * REST endpoint: get automation history for a user
 */
export async function getAutomationHistory(req, res) {
  try {
    const runs = await AutomationRun.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('jobId', 'title company')
      .lean();

    return res.json({ runs });
  } catch (err) {
    console.error('Get automation history error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function getAutomationRun(req, res) {
  try {
    const run = await AutomationRun.findById(req.params.id)
      .populate('jobId', 'title company applicationUrl')
      .lean();

    if (!run) {
      return res.status(404).json({ error: 'Automation run not found' });
    }

    return res.json({ run });
  } catch (err) {
    console.error('Get automation run error:', err);
    return res.status(500).json({ error: err.message });
  }
}
