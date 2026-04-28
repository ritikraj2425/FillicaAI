/**
 * Form Automation Logic
 * Handles form filling using Playwright and AI decisions
 */

import { callAgentAI, getPageElements, buildContextPrompt, SYSTEM_PROMPT } from './ai.js';

/**
 * Execute Playwright code safely
 */
export async function executePlaywrightCode(page, code) {
  if (!code || code.trim() === '') return;

  try {
    // Wrap code to provide page context
    const wrappedCode = `(async () => {
      ${code}
    })()`;

    await page.evaluate(wrappedCode);
  } catch (err) {
    console.warn('[Playwright] Code execution warning:', err.message);
    // Don't throw - allow automation to continue with other fields
  }
}

/**
 * Analyze and fill current form page
 */
export async function analyzeAndFillPage(page, userProfile, aiConfig, emitStatus) {
  try {
    // Get current page content
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1000);

    emitStatus('analyzing', 'Analyzing page elements...');

    // Extract interactive elements
    const pageElements = await getPageElements(page);
    const currentUrl = page.url();

    // Ask AI what to do
    emitStatus('planning', 'AI is planning actions...');

    const contextPrompt = buildContextPrompt(currentUrl, pageElements, userProfile);
    const aiResponse = await callAgentAI(SYSTEM_PROMPT, contextPrompt, {
      provider: aiConfig.provider,
      model: aiConfig.model,
      apiKey: aiConfig.apiKey
    });

    console.log('[AI Decision]', aiResponse);

    // Check if this is a job form
    if (aiResponse.is_job_form === false) {
      throw new Error('This does not appear to be a job application form');
    }

    // Execute playwright code if provided
    if (aiResponse.playwright_code) {
      emitStatus('executing', 'Filling form fields...');
      await executePlaywrightCode(page, aiResponse.playwright_code);
      
      // Wait for page to settle
      await page.waitForTimeout(2000);
    }

    return {
      success: true,
      plan: aiResponse.plan || 'Form filled',
      hasSubmitButton: aiResponse.has_submit_button || false,
      playwrightCode: aiResponse.playwright_code || ''
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
      'button[type="submit"]',
      'input[type="submit"]',
      '[role="button"]:has-text("Submit")',
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
