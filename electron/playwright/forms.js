/**
 * Form Automation Logic
 * Handles form filling using Playwright and AI decisions
 */

import { buildContextPrompt, callAgentAI, getPageElements, SYSTEM_PROMPT } from './ai.js';
import path from 'path';
import os from 'os';

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function splitName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
  };
}

async function tryClickFirstVisible(page, selectors) {
  for (const selector of selectors) {
    try {
      const locator = page.locator(selector).first();
      if (await locator.isVisible({ timeout: 1000 })) {
        await locator.click({ force: true });
        return selector;
      }
    } catch {
      // Try next selector
    }
  }
  return null;
}

async function hasVisibleFormFields(page) {
  try {
    return await page.evaluate(() => {
      const isVisible = (el) => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };

      for (const el of Array.from(document.querySelectorAll('input, textarea, select'))) {
        if (!isVisible(el)) continue;
        if (el.disabled || el.readOnly) continue;
        const tag = el.tagName.toLowerCase();
        const type = (el.getAttribute('type') || '').toLowerCase();
        if (type === 'hidden' || type === 'submit' || type === 'button') continue;
        if (type === 'checkbox' || type === 'radio') continue;
        if (tag === 'input' && type === 'file') continue;
        return true;
      }
      return false;
    });
  } catch {
    return false;
  }
}

async function tryFastApplyNavigation(page) {
  // If we're already on a form page, don't click any "Apply ..." CTA (many portals show
  // "Apply with Resume/LinkedIn" buttons that would derail the flow).
  if (await hasVisibleFormFields(page)) {
    return { clicked: false };
  }

  // Prefer high-signal "Apply Now" CTAs. Avoid social/one-click apply variants.
  const bestSelector = await page.evaluate(() => {
    const isVisible = (el) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };

    const blocked = [
      'linkedin',
      'indeed',
      'google',
      'facebook',
      'github',
      'resume',
      'cv',
      'with',
      'share',
      'refer',
      'email',
    ];

    const candidates = [];
    const nodes = Array.from(document.querySelectorAll('button, a, [role="button"]'));

    for (const el of nodes) {
      if (!isVisible(el)) continue;
      const text = (el.textContent || '').toLowerCase().replace(/\s+/g, ' ').trim();
      if (!text) continue;

      const looksLikeApply = text.includes('apply now') || text === 'apply' || text.includes('easy apply') || text.includes('quick apply') || text.startsWith('apply ');
      if (!looksLikeApply) continue;

      if (blocked.some((w) => text.includes(w))) continue;

      const score =
        (text.includes('apply now') ? 50 : 0) +
        (text.includes('easy apply') ? 20 : 0) +
        (text.includes('quick apply') ? 10 : 0) +
        (el.tagName.toLowerCase() === 'button' ? 5 : 0);

      candidates.push({ el, score, text });
    }

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0]?.el;
    if (!best) return null;

    const attr = `data-fillica-apply-entry`;
    best.setAttribute(attr, '1');
    return `[${attr}]`;
  });

  if (!bestSelector) return { clicked: false };

  try {
    await page.locator(bestSelector).first().click({ force: true });
  } catch {
    return { clicked: false };
  }

  await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);
  return { clicked: true, selector: bestSelector };
}

async function discoverFastFillTargets(page, userProfile) {
  const { firstName, lastName } = splitName(userProfile.name);

  const actions = await page.evaluate((profile) => {
    const isVisible = (el) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };

    const getLabelText = (el) => {
      const aria = el.getAttribute('aria-label') || '';
      const placeholder = el.getAttribute('placeholder') || '';
      const label = el.id ? document.querySelector(`label[for="${el.id}"]`)?.textContent || '' : '';
      const parentLabel = el.closest('label')?.textContent || '';
      const name = el.getAttribute('name') || '';
      const id = el.getAttribute('id') || '';
      return `${aria} ${placeholder} ${label} ${parentLabel} ${name} ${id}`.toLowerCase();
    };

    // Extract country code and phone number from full phone
    const extractPhone = (fullPhone) => {
      const match = String(fullPhone || '').match(/^\+?(\d{1,3})[-.\s]?(\d+)/);
      if (match) {
        return { countryCode: `+${match[1]}`, phoneNumber: match[2] };
      }
      return { countryCode: '', phoneNumber: fullPhone };
    };

    const phone = extractPhone(profile.phone);

    const resumeActions = [];  // Will be added first
    const otherActions = [];
    let counter = 0;

    const fields = Array.from(document.querySelectorAll('input, textarea, select'));
    for (const el of fields) {
      if (!isVisible(el) || el.disabled || el.readOnly) continue;

      const tag = el.tagName.toLowerCase();
      const type = (el.getAttribute('type') || '').toLowerCase();
      if (type === 'hidden' || type === 'submit' || type === 'button' || type === 'checkbox' || type === 'radio') continue;

      const descriptor = getLabelText(el);
      const currentValue = tag === 'select' ? el.value : (el.value || '').trim();
      let value = '';
      let kind = 'fill';

      if (type === 'file') {
        // PRIORITY: Resume upload (Strict match to avoid uploading resume to cover letter fields)
        const isResumeField = (descriptor.includes('resume') || 
                               descriptor.includes('cv')) && 
                              !descriptor.includes('cover letter') &&
                              !descriptor.includes('coverletter');
        
        if (profile.localResumePath && isResumeField) {
          const attr = `data-fillica-fast-${counter++}`;
          el.setAttribute(attr, '1');
          resumeActions.push({ kind: 'file', selector: `[${attr}]`, value: profile.localResumePath, priority: 'FIRST' });
          console.log('[Resume] Found resume upload field (PRIORITY):', descriptor);
        }
        continue;
      }

      if (descriptor.includes('first name') || descriptor.includes('given name')) value = profile.firstName;
      else if (descriptor.includes('last name') || descriptor.includes('family name') || descriptor.includes('surname')) value = profile.lastName;
      else if (descriptor.includes('full name') || descriptor === 'name' || descriptor.includes('your name')) value = profile.name;
      else if (descriptor.includes('email')) value = profile.email;
      // Split phone into country code and number
      else if (descriptor.includes('country code') || descriptor.includes('area code') || (descriptor.includes('phone') && descriptor.includes('code'))) value = phone.countryCode;
      else if (descriptor.includes('phone') || descriptor.includes('mobile') || descriptor.includes('telephone') || descriptor.includes('contact number')) {
        // If this is a phone field but NOT country code, use just the number
        if (!descriptor.includes('code') && !descriptor.includes('country')) {
          value = phone.phoneNumber;
        } else {
          value = profile.phone;
        }
      }
      else if (descriptor.includes('linkedin')) value = profile.linkedin;
      else if (descriptor.includes('github')) value = profile.github;
      else if (descriptor.includes('portfolio') || descriptor.includes('website') || descriptor.includes('personal site') || descriptor.includes('personal website') || descriptor.includes('personal url')) value = profile.portfolio;
      else if (descriptor.includes('location') || descriptor.includes('city') || descriptor.includes('country') || descriptor.includes('residence') || descriptor.includes('address')) value = profile.location;
      else if (descriptor.includes('salary') || descriptor.includes('compensation') || descriptor.includes('expected salary') || descriptor.includes('salary expectation')) value = profile.expectedSalary;
      else if (descriptor.includes('summary') || descriptor.includes('about you') || descriptor.includes('cover letter') || descriptor.includes('why are you') || descriptor.includes('why do you') || descriptor.includes('tell us') || descriptor.includes('bio') || descriptor.includes('professional summary')) value = profile.bio;
      // Demographics fields
      else if (descriptor.includes('gender') || descriptor.includes('sex') || descriptor.includes('biological sex')) value = profile.gender || '';
      else if (descriptor.includes('race') || descriptor.includes('ethnicity')) value = profile.race || '';
      else if (descriptor.includes('veteran')) value = profile.veteranStatus ? 'Yes' : 'No';
      else if (descriptor.includes('disability')) value = profile.disabilityStatus ? 'Yes' : 'No';
      // Work authorization
      else if (tag === 'select' && (descriptor.includes('sponsor') || descriptor.includes('authorized') || descriptor.includes('work authorization'))) {
        kind = 'select';
        if (descriptor.includes('sponsor')) value = profile.sponsorshipNeeded ? 'Yes' : 'No';
        else value = profile.visaStatus || '';
      }
      else if (descriptor.includes('company') || descriptor.includes('employer') || descriptor.includes('current employer')) value = profile.currentCompany || '';
      else if (descriptor.includes('job title') || descriptor.includes('position') || descriptor.includes('current position') || descriptor.includes('role')) value = profile.currentJobTitle || '';
      else if (descriptor.includes('experience') && descriptor.includes('year')) {
        // Years of experience
        const exp = profile.experience || [];
        if (exp.length > 0) {
          const yearsExp = exp[0].yearsOfExperience || (new Date().getFullYear() - new Date(exp[0].startDate || new Date()).getFullYear());
          value = String(yearsExp);
        }
      }
      else if (descriptor.includes('skills')) value = profile.skills?.join(', ') || '';
      else if (descriptor.includes('education') && (descriptor.includes('school') || descriptor.includes('university') || descriptor.includes('college'))) value = profile.education?.[0]?.school || profile.education?.[0]?.institute || '';
      else if (descriptor.includes('degree') || descriptor.includes('field of study') || descriptor.includes('major')) value = profile.education?.[0]?.degree || profile.education?.[0]?.field || '';
      else if (descriptor.includes('notice') || descriptor.includes('available') || descriptor.includes('start date') || descriptor.includes('can start')) value = profile.availableStartDate || '';

      if (!value || currentValue) continue;

      const attr = `data-fillica-fast-${counter++}`;
      el.setAttribute(attr, '1');
      otherActions.push({ kind, selector: `[${attr}]`, value });
    }

    // RESUME FIRST, then other actions
    return [...resumeActions, ...otherActions];
  }, {
    name: userProfile.name || '',
    firstName,
    lastName,
    email: userProfile.email || '',
    phone: userProfile.phone || '',
    linkedin: userProfile.links?.linkedin || '',
    github: userProfile.links?.github || '',
    portfolio: userProfile.links?.portfolio || '',
    location: userProfile.location || '',
    expectedSalary: userProfile.expectedSalary || '',
    bio: userProfile.bio || '',
    localResumePath: userProfile.localResumePath || '',
    visaStatus: userProfile.workAuthorization?.visaStatus || '',
    sponsorshipNeeded: Boolean(userProfile.workAuthorization?.sponsorshipNeeded),
    currentCompany: userProfile.experience?.[0]?.company || '',
    currentJobTitle: userProfile.experience?.[0]?.title || '',
    experience: userProfile.experience || [],
    skills: userProfile.skills || [],
    education: userProfile.education || [],
    availableStartDate: userProfile.experience?.[0]?.endDate || '',
    gender: userProfile.demographics?.gender || '',
    race: userProfile.demographics?.race || '',
    veteranStatus: Boolean(userProfile.demographics?.veteranStatus),
    disabilityStatus: Boolean(userProfile.demographics?.disabilityStatus),
  });

  console.log(`[FastFill] Discovered ${actions.length} fields to fill:`, actions.map(a => `${a.selector} (${a.kind})`));
  return actions;
}

async function applyFastFillTargets(page, targets) {
  let filledCount = 0;

  for (const target of targets) {
    try {
      if (target.kind === 'file') {
        console.log('[FastFill] Uploading resume:', target.value);
        await page.setInputFiles(target.selector, target.value);
        console.log('[FastFill] Resume uploaded successfully');
        filledCount++;
      } else if (target.kind === 'select') {
        console.log('[FastFill] Selecting option:', target.value);
        await page.selectOption(target.selector, { label: target.value }).catch(async () => {
          await page.selectOption(target.selector, target.value);
        });
        console.log('[FastFill] Option selected successfully');
        filledCount++;
      } else {
        console.log('[FastFill] Filling field with:', target.value.substring(0, 50));
        await page.locator(target.selector).fill(target.value);
        console.log('[FastFill] Field filled successfully');
        filledCount++;
      }
    } catch (err) {
      console.warn('[FastFill] Error filling field:', err.message);
      // Keep going if one field is awkward
    }
  }

  return filledCount;
}

async function tryFastLogin(page, userProfile) {
  try {
    const emailLocator = page.locator('input[type="email"], input[name*="email" i], input[autocomplete="email"]').first();
    const passwordLocator = page.locator('input[type="password"]').first();

    if (await emailLocator.isVisible({ timeout: 800 }).catch(() => false) &&
        await passwordLocator.isVisible({ timeout: 800 }).catch(() => false) &&
        userProfile.email && userProfile.password) {
      await emailLocator.fill(userProfile.email);
      await passwordLocator.fill(userProfile.password);
      const clicked = await tryClickFirstVisible(page, [
        'button:has-text("Sign in")',
        'button:has-text("Log in")',
        'button:has-text("Login")',
        'button:has-text("Continue")',
        'button[type="submit"]',
      ]);
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1000);
      return { loggedIn: true, clicked };
    }
  } catch {
    // Ignore login fast path failures
  }

  return { loggedIn: false };
}

/**
 * Execute Playwright code safely in the Node.js context
 */
export async function executePlaywrightCode(page, code, userProfile) {
  if (!code || code.trim() === '') return;

  // Save original timeout
  const originalTimeout = 60000;

  try {
    // Provide a safe wrapper so one failed action doesn't crash the rest
    const safe = async (promise) => {
      try {
        await promise;
      } catch (err) {
        console.warn('[Playwright] Action failed (continuing):', err.message.split('\n')[0]);
      }
    };

    // Provide a PDF generator for Cover Letters
    const createPdf = async (text) => {
      console.log('[Playwright] Generating Cover Letter PDF...');
      const clPage = await page.context().newPage();
      const escapedText = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      await clPage.setContent(`<html><body style="font-family: Arial, sans-serif; padding: 40px; font-size: 14px; line-height: 1.6; white-space: pre-wrap; color: #333;">${escapedText}</body></html>`);
      const tempPath = path.join(os.tmpdir(), `cover_letter_${Date.now()}.pdf`);
      await clPage.pdf({ path: tempPath, format: 'A4' });
      await clPage.close();
      console.log('[Playwright] Cover Letter saved to:', tempPath);
      return tempPath;
    };

    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    
    // We parse out the try/catch if the AI wrapped the entire block despite instructions
    let executableCode = code;
    if (executableCode.trim().startsWith('try {') && executableCode.trim().endsWith('}')) {
      // It's a risk to blindly strip it, but the AI often ignores the per-line rule
    }

    const fillingFunction = new AsyncFunction('page', 'userProfile', 'safe', 'createPdf', executableCode);
    
    page.setDefaultTimeout(5000); // 5 seconds max per action
    console.log('[Playwright] Executing:', executableCode.substring(0, 200) + (executableCode.length > 200 ? '...' : ''));
    
    await fillingFunction(page, userProfile, safe, createPdf);
    console.log('[Playwright] Code execution completed successfully');

  } catch (err) {
    console.error('[Playwright] Code execution error:', err.message);
  } finally {
    // Always restore the default timeout
    page.setDefaultTimeout(originalTimeout);
  }
}

/**
 * Inject a status overlay into the browser page
 */
export async function injectStatusOverlay(page, status, message) {
  try {
    await page.evaluate(({ status, message }) => {
      const isActive = ['connecting', 'navigating', 'analyzing', 'planning', 'executing', 'initializing'].includes(status);

      let glowEl = document.getElementById('Fillica-glow');
      if (!glowEl) {
        glowEl = document.createElement('div');
        glowEl.id = 'Fillica-glow';
        Object.assign(glowEl.style, {
          position: 'fixed',
          top: '2px',
          left: '2px',
          right: '2px',
          bottom: '2px',
          zIndex: '2147483646',
          border: '4px solid transparent',
          borderRadius: '24px',
          transition: 'opacity 0.4s ease, background 0.4s ease',
          pointerEvents: 'none'
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

      if (isActive) {
        glowEl.style.animation = 'Fillica-border-glow 2s ease-in-out infinite';
        glowEl.style.background = 'rgba(0, 0, 0, 0.1)';
        glowEl.style.opacity = '1';
      } else {
        glowEl.style.animation = 'none';
        glowEl.style.background = 'transparent';
        glowEl.style.opacity = '0';
      }

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
          whiteSpace: 'nowrap',
          pointerEvents: 'none'
        });
        document.body.appendChild(statusBar);
      }

      if (isActive) {
        Object.assign(statusBar.style, {
          top: '50%',
          left: '50%',
          right: 'unset',
          bottom: 'unset',
          transform: 'translate(-50%, -50%)',
          padding: '24px 48px',
          borderRadius: '24px',
          fontSize: '20px',
          flexDirection: 'column',
          opacity: '1',
          width: 'max-content',
          maxWidth: 'min(80vw, 720px)',
          textAlign: 'center'
        });
        statusBar.innerHTML = `
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#0d9488;animation:Fillica-border-glow 1.5s infinite"></span>
            <span style="font-weight:700">FILLICA</span>
          </div>
          <div style="font-size:15px;color:#94a3b8;margin-top:8px;font-weight:400">${message}</div>
        `;
      } else if (message) {
        const isError = message.toLowerCase().includes('error') || message.toLowerCase().includes('fail');
        Object.assign(statusBar.style, {
          top: '24px',
          right: '24px',
          left: 'unset',
          bottom: 'unset',
          transform: 'none',
          padding: '12px 24px',
          borderRadius: '100px',
          fontSize: '14px',
          flexDirection: 'row',
          opacity: '1',
          width: 'auto',
          maxWidth: '70vw'
        });
        const dotColor = isError ? '#ef4444' : '#22c55e';
        statusBar.innerHTML = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${dotColor}"></span> ${message}`;
      } else {
        statusBar.style.opacity = '0';
      }
    }, { status, message });
  } catch (err) {
    // Ignore if page is navigating
  }
}

/**
 * Analyze and fill current form page
 * 
 * TWO-PASS STRATEGY:
 * Pass 1 (Fast Fill): Deterministically fills standard <input>, <textarea>, <select> fields
 * Pass 2 (AI Fill): Uses AI to handle EVERYTHING the fast fill missed — custom dropdowns,
 *                   comboboxes, file uploads, radios, and any other non-standard elements.
 * BOTH passes ALWAYS run. The AI sees what's already filled and focuses on the rest.
 */
export async function analyzeAndFillPage(page, userProfile, aiConfig, emitStatus) {
  try {
    const startingUrl = page.url();

    // Get current page content
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(500);

    emitStatus('navigating', 'Checking for an application entry point...');
    await injectStatusOverlay(page, 'navigating', 'Checking for an application entry point...');

    const fastApply = await tryFastApplyNavigation(page);
    if (fastApply.clicked) {
      return {
        success: true,
        plan: 'Clicked apply button',
        hasSubmitButton: false,
        playwrightCode: '',
        performedAction: true,
        navigated: true
      };
    }

    const loginResult = await tryFastLogin(page, userProfile);
    if (loginResult.loggedIn) {
      return {
        success: true,
        plan: 'Logged into the application portal',
        hasSubmitButton: false,
        playwrightCode: '',
        performedAction: true,
        navigated: page.url() !== startingUrl
      };
    }

    // ═══════════════════════════════════════════════════════════════
    // PASS 1: Fast deterministic fill for standard HTML inputs
    // ═══════════════════════════════════════════════════════════════
    emitStatus('executing', 'Filling standard fields...');
    await injectStatusOverlay(page, 'executing', 'Filling standard fields (name, email, phone...)');

    const fastTargets = await discoverFastFillTargets(page, userProfile);
    const fastFilledCount = await applyFastFillTargets(page, fastTargets);
    console.log(`[Pass 1] Fast-filled ${fastFilledCount} standard fields`);

    if (fastFilledCount > 0) {
      await page.waitForTimeout(500);
    }

    // If we navigated away (e.g. clicked a link), stop here
    if (page.url() !== startingUrl && page.url() !== page.url()) {
      return {
        success: true,
        plan: `Filled ${fastFilledCount} fields and navigated`,
        hasSubmitButton: false,
        playwrightCode: '',
        performedAction: true,
        navigated: true
      };
    }

    // ═══════════════════════════════════════════════════════════════
    // PASS 2: AI-powered fill for EVERYTHING else
    // Custom dropdowns, comboboxes, file uploads, radios, etc.
    // ═══════════════════════════════════════════════════════════════
    emitStatus('analyzing', 'Deep-scanning page for remaining fields...');
    await injectStatusOverlay(page, 'analyzing', 'Deep-scanning for custom dropdowns, uploads, and remaining fields...');

    // Re-extract elements AFTER fast fill so AI sees current state
    const pageElements = await getPageElements(page);
    const currentUrl = page.url();

    emitStatus('planning', 'AI is analyzing remaining fields...');
    await injectStatusOverlay(page, 'planning', 'AI is planning actions for remaining fields...');

    const contextPrompt = buildContextPrompt(currentUrl, pageElements, userProfile);
    const aiResponse = await Promise.race([
      callAgentAI(SYSTEM_PROMPT, contextPrompt, {
        provider: aiConfig.provider,
        model: aiConfig.model,
        apiKey: aiConfig.apiKey
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('AI planning timed out after 90 seconds')), 90000))
    ]);

    console.log('[AI Decision]', JSON.stringify(aiResponse, null, 2));

    // Check if this is a job form
    if (aiResponse.is_job_form === false && !aiResponse.playwright_code && fastFilledCount === 0) {
      throw new Error('This does not appear to be a job application form');
    }

    // Execute playwright code if provided
    let aiActioned = false;
    if (aiResponse.playwright_code) {
      emitStatus('executing', 'AI is filling remaining fields...');
      await injectStatusOverlay(page, 'executing', 'Filling custom dropdowns, uploads, and other fields...');
      await executePlaywrightCode(page, aiResponse.playwright_code, userProfile);
      aiActioned = true;

      // Wait for page to settle after AI actions
      await page.waitForTimeout(2000);
    }

    const totalActions = fastFilledCount + (aiActioned ? 1 : 0);

    return {
      success: true,
      plan: aiResponse.plan || `Filled ${fastFilledCount} standard fields` + (aiActioned ? ' + AI filled remaining' : ''),
      hasSubmitButton: aiResponse.has_submit_button || false,
      playwrightCode: aiResponse.playwright_code || '',
      performedAction: totalActions > 0,
      navigated: page.url() !== startingUrl
    };

  } catch (err) {
    console.error('[Form Analysis] Error:', err);
    throw err;
  }
}

/**
 * Check if there's a next button and click it
 */
export async function clickNextButton(page) {
  try {
    // Look for common next button patterns
    const nextSelectors = [
      'button:has-text("Next")',
      'button:has-text("Continue")',
      'button:has-text("Proceed")',
      'button:has-text("Save & Continue")',
      'button[aria-label*="Next"]',
      '[role="button"]:has-text("Next")',
    ];

    for (const selector of nextSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible()) {
          await button.click({ force: true });
          await page.waitForTimeout(2000);
          return true;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    return false;
  } catch (err) {
    console.warn('[Navigation] No next button found:', err.message);
    return false;
  }
}

/**
 * Check if there's a submit button
 */
export async function findSubmitButton(page) {
  try {
    const submitSelectors = [
      'button:has-text("Submit")',
      'button:has-text("Apply")',
      'button:has-text("Send")',
      'button:has-text("Finish")',
      'button:has-text("Review")',
      'button[type="submit"]',
      'input[type="submit"]',
      '[role="button"]:has-text("Submit")',
      '[role="button"]:has-text("Apply")',
    ];

    for (const selector of submitSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 1000 })) {
          return selector;
        }
      } catch (e) {
        // Continue
      }
    }

    return null;
  } catch (err) {
    console.warn('[Submit] Could not find submit button:', err.message);
    return null;
  }
}

/**
 * Click submit button
 */
export async function submitForm(page, submitSelector) {
  try {
    if (!submitSelector) throw new Error('No submit button found');
    
    const button = page.locator(submitSelector).first();
    await button.click({ force: true });
    
    // Wait for navigation or success
    await Promise.race([
      page.waitForNavigation({ timeout: 30000 }).catch(() => {}),
      page.waitForTimeout(5000)
    ]);

    return true;
  } catch (err) {
    console.error('[Submit] Error:', err);
    throw err;
  }
}
