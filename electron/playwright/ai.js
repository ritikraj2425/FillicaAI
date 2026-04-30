import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

/**
 * Retry wrapper for rate limits (HTTP 429)
 */
async function withRetry(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isRetryable =
        err.status === 429 ||
        err.status === 503 ||
        err.message?.includes('429') ||
        err.message?.includes('503') ||
        err.message?.includes('Too Many Requests') ||
        err.message?.includes('high demand') ||
        err.message?.includes('overloaded') ||
        err.message?.includes('fetch failed') ||
        err.message?.includes('ECONNRESET');

      if (isRetryable && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        console.warn(`[AI] Provider busy or rate limited. Retrying in ${Math.round(delay)}ms... (Attempt ${attempt}/${maxRetries})`);
        await new Promise(res => setTimeout(res, delay));
      } else {
        throw err;
      }
    }
  }
}

/**
 * Call AI with a system prompt and user context using a specific provider
 */
export async function callAgentAI(systemPrompt, userPrompt, config = {}) {
  const { provider, model: modelName, apiKey } = config;

  if (!apiKey || apiKey === '********') {
    throw new Error(`Personal AI Configuration for ${provider || 'AI'} is missing or incomplete. Please provide your API Key in the Profile section.`);
  }

  let finalModel = modelName;
  if (provider === 'google' || !provider) {
    // Map older/restricted models to the working dynamic alias
    if (!finalModel || finalModel.includes('1.5') || finalModel.includes('2.0') || finalModel.includes('2.5')) {
      finalModel = 'gemini-flash-latest';
    }
  }

  let textResponse = '';

  try {
    if (provider === 'google' || !provider) {
      const ai = new GoogleGenAI({ apiKey });
      const response = await withRetry(() => ai.models.generateContent({
        model: finalModel,
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json"
        },
      }));
      textResponse = response.text;

    } else if (provider === 'openai') {
      const openai = new OpenAI({ apiKey });
      const response = await withRetry(() => openai.chat.completions.create({
        model: modelName || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      }));
      textResponse = response.choices[0].message.content;

    } else if (provider === 'anthropic') {
      const anthropic = new Anthropic({ apiKey });
      const response = await withRetry(() => anthropic.messages.create({
        model: modelName || "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }));
      textResponse = response.content[0].text;

    } else if (provider === 'deepseek') {
      const openai = new OpenAI({
        apiKey,
        baseURL: 'https://api.deepseek.com'
      });
      const response = await withRetry(() => openai.chat.completions.create({
        model: modelName || "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      }));
      textResponse = response.choices[0].message.content;
    }

    // Parse JSON
    try {
      return JSON.parse(textResponse);
    } catch {
      const jsonMatch = textResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) return JSON.parse(jsonMatch[1]);
      throw new Error('Failed to parse AI response as JSON');
    }
  } catch (err) {
    console.error(`[AI] ${provider} API Error:`, err.message);
    throw new Error(`AI Provider Error (${provider}): ${err.message}`);
  }
}

export async function getPageElements(page) {
  const getFrameElements = async (frame) => {
    try {
      return await frame.evaluate(() => {
        const results = [];
        let elementIdCounter = 0;

        function walk(node) {
          if (node.shadowRoot) walk(node.shadowRoot);

          for (const child of node.children || []) {
            const tag = child.tagName?.toLowerCase();
            const role = child.getAttribute('role');
            const type = child.getAttribute('type');

            if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'label'].includes(tag)) {
              const text = child.innerText?.trim();
              if (text && text.length > 3 && text.length < 300) {
                results.push({ tag, type: 'context', text });
              }
              walk(child);
              continue;
            }

            const isInteractive = ['input', 'textarea', 'select', 'button'].includes(tag) ||
              ['button', 'checkbox', 'radio', 'combobox', 'listbox', 'option'].includes(role) ||
              (tag === 'a' && (child.href?.includes('apply') || child.href?.includes('login')));

            if (isInteractive) {
              const style = window.getComputedStyle(child);
              if (style.display === 'none' || style.visibility === 'hidden') {
                if (type !== 'file') {
                  walk(child);
                  continue;
                }
              }

              const rect = child.getBoundingClientRect();
              if (rect.width === 0 || rect.height === 0) {
                if (type !== 'file') {
                  walk(child);
                  continue;
                }
              }

              const uniqueId = `Fillica-${Date.now()}-${elementIdCounter++}`;
              child.setAttribute('data-fillica-id', uniqueId);

              let question = '';
              const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
              walker.currentNode = child;

              let nodeText;
              let count = 0;
              while ((nodeText = walker.previousNode()) && count < 20) {
                  count++;
                  const text = nodeText.textContent?.trim();
                  if (text && text.length > 3 && text.length < 300 && /[a-zA-Z]/.test(text)) {
                    question = text;
                    break;
                  }
                }

                let description = '';
                const descId = child.getAttribute('aria-describedby');
                if (descId) {
                  const descEl = document.getElementById(descId);
                  if (descEl) description = descEl.innerText.trim();
                }

                let optionLabel = '';
                if (tag === 'button' || tag === 'option' || role === 'option' || type === 'submit') {
                  optionLabel = child.innerText?.trim() || child.value || '';
                } else {
                  optionLabel = child.parentElement?.innerText?.trim()?.split('\n').pop()?.trim()?.substring(0, 100) || '';
                }

                const isStableId = (id) => id && !/(:r\d+:|^react-select-|^Fillica-)/.test(id);
                let stableSelector = '';
                if (isStableId(child.id)) stableSelector = `#${CSS.escape(child.id)}`;
                else if (child.getAttribute('name')) stableSelector = `[name="${CSS.escape(child.getAttribute('name'))}"]`;
                else if (child.getAttribute('aria-label')) stableSelector = `[aria-label="${CSS.escape(child.getAttribute('aria-label'))}"]`;
                else if (child.getAttribute('placeholder')) stableSelector = `[placeholder="${CSS.escape(child.getAttribute('placeholder'))}"]`;
                else stableSelector = `[data-fillica-id="${uniqueId}"]`;

                results.push({
                  tag,
                  type: type || '',
                  question,
                  optionLabel,
                  description,
                  id: child.id,
                  name: child.getAttribute('name'),
                  placeholder: child.getAttribute('placeholder'),
                  value: child.value || child.innerText || '',
                  ariaLabel: child.getAttribute('aria-label'),
                  role,
                  required: child.required || child.getAttribute('aria-required') === 'true',
                  checked: child.checked || false,
                  options: tag === 'select'
                    ? Array.from(child.options || []).map((o) => ({ value: o.value, text: o.text }))
                    : [],
                  selector: stableSelector,
                  fallback_selector: `[data-fillica-id="${uniqueId}"]`
                });
            }

            walk(child);
          }
        }

        walk(document.body);
        return results;
      });
    } catch {
      return [];
    }
  };

  const allElements = [];
  for (const frame of page.frames()) {
    const frameElements = await getFrameElements(frame);
    allElements.push(...frameElements);
  }

  return allElements;
}

const SYSTEM_PROMPT = `You are an expert Web Automation Agent that fills job application forms using Playwright.
You receive a JSON list of page elements with their selectors and the user's profile data.
Your job: generate Playwright code that fills EVERY unfilled field on the page.

IMPORTANT: Some fields may already be filled by a previous pass. SKIP fields that already have correct values.
Focus on fields that are EMPTY or show placeholder text like "Select", "Select...", "Choose", etc.

═══════════════════════════════════════════════════
PLAYWRIGHT CODE RULES (follow exactly)
═══════════════════════════════════════════════════

1. USE THE SELECTORS FROM THE JSON. Each element has a "selector" field. USE THAT as your primary selector. If it fails, you can try "fallback_selector".

2. STANDARD INPUTS (input, textarea):
   await page.fill('selector', 'value');

3. STANDARD <select> DROPDOWNS:
   await page.selectOption('selector', { label: 'Option Text' });

4. CUSTOM DROPDOWNS (div/span with role="combobox"):
   These are NOT select elements. They are custom widgets used by ATS platforms.
   // Step 1: Click the combobox to open it
   await page.click('selector', { force: true });
   await page.waitForTimeout(600);
   // Step 2: Click the matching option
   await page.locator('[role="option"]').filter({ hasText: 'Option Text' }).first().click({ force: true });
   await page.waitForTimeout(300);
   // If role="option" fails, try:
   // await page.locator('li, div[data-value]').filter({ hasText: 'Option Text' }).first().click({ force: true });

5. SEARCHABLE COMBOBOXES (input with role="combobox"):
   await page.fill('selector', 'Search Text');
   await page.waitForTimeout(800);
   await page.locator('[role="option"]').filter({ hasText: 'Search Text' }).first().click({ force: true });
   await page.waitForTimeout(300);

6. RADIO BUTTONS (role="radio"):
   await page.click('selector', { force: true });

7. CHECKBOXES:
   await page.check('selector', { force: true });

8. FILE UPLOADS:
   You will see input[type="file"] elements in the JSON. Look at their description/id/name to know what they are for.
   FOR RESUMES (Priority):
   await safe(page.locator('selector').setInputFiles(userProfile.localResumePath));
   
   FOR COVER LETTERS:
   If a Cover Letter is requested, write a customized cover letter using the job description and userProfile.
   Use the \`createPdf(text)\` helper to convert it to a PDF on the fly:
   const clText = \`Dear Hiring Manager,\\n\\nI am very interested in this role...\\n\\nSincerely,\\n\${userProfile.name}\`;
   const clPath = await createPdf(clText);
   await safe(page.locator('selector').setInputFiles(clPath));

9. BUTTONS:
   - Click "Next", "Continue", "Save & Continue" buttons
   - Do NOT click final "Submit"/"Apply"/"Send" — set has_submit_button: true instead

10. GENERAL ERROR HANDLING (CRITICAL):
    - You MUST wrap EVERY SINGLE ACTION in the \`safe()\` helper function.
    - NEVER use try/catch blocks yourself. 
    - Example:
      await safe(page.locator('input[type="file"]').first().setInputFiles(userProfile.localResumePath));
      await safe(page.fill('selector1', 'val'));
      await safe(page.click('selectorOrFallback', { force: true }));

═══════════════════════════════════════════════════
FIELD MAPPING (what value goes where)
═══════════════════════════════════════════════════

Resume/CV/Upload → page.setInputFiles('input[type="file"]', userProfile.localResumePath) — DO FIRST
First Name → name.split(' ')[0]
Last Name → name.split(' ').slice(1).join(' ')
Full Name → full name
Email → email
Phone Country Code → Extract country from phone (e.g. '+1' or 'United States')
Phone → full phone number with country code
Location/City/Country/Address → location
LinkedIn → links.linkedin
GitHub → links.github
Portfolio/Website → links.portfolio
Current Company → experience[0].company
Job Title/Role → experience[0].title
Skills → skills.join(', ')
Expected Salary → expectedSalary
Work Authorization → workAuthorization.visaStatus
Sponsorship → "Yes"/"No" from workAuthorization.sponsorshipNeeded
Gender → demographics.gender or "Prefer not to say"
Race/Ethnicity → demographics.race or "Prefer not to say"
Veteran → demographics.veteranStatus or "Prefer not to say"
Disability → demographics.disabilityStatus or "Prefer not to say"
School/University → education[0].school or education[0].institute
Degree → education[0].degree
Field of Study → education[0].field
Cover Letter/Bio → bio
Consent/Agreement radios → Select "No" or opt-out option

═══════════════════════════════════════════════════
RESPONSE FORMAT (return ONLY valid JSON)
═══════════════════════════════════════════════════
{
  "plan": "Brief description of actions",
  "is_job_form": true,
  "has_submit_button": false,
  "playwright_code": "await page.fill(...);"
}

CRITICAL: Generate code for ALL unfilled/empty fields. Do NOT skip custom dropdowns or comboboxes. Be exhaustive.`;

export function buildContextPrompt(url, domElements, userProfile) {
  const skills = userProfile.skills?.join(', ') || 'Not provided';
  const experience = userProfile.experience?.map(e => 
    `${e.title || ''} at ${e.company || ''} (${e.startDate || ''} - ${e.endDate || 'Present'})`
  ).join('; ') || 'Not provided';
  const education = userProfile.education?.map(e => 
    `${e.degree || ''} in ${e.field || ''} from ${e.school || e.institute || ''} (${e.graduationYear || ''})`
  ).join('; ') || 'Not provided';
  const demographics = userProfile.demographics ? 
    `Gender: ${userProfile.demographics.gender || 'Not provided'}, Race: ${userProfile.demographics.race || 'Not provided'}, Veteran: ${userProfile.demographics.veteranStatus || 'Not provided'}, Disability: ${userProfile.demographics.disabilityStatus || 'Not provided'}` :
    'Not provided';
  
  // Extract country code from phone if possible
  const phoneMatch = userProfile.phone?.match(/^\+?(\d{1,3})[-.\s]?(\d+)/);
  const countryCode = phoneMatch ? `+${phoneMatch[1]}` : '';
  const phoneNumber = phoneMatch ? phoneMatch[2] : userProfile.phone || '';
  
  return `Current URL: ${url}

═══ USER PROFILE DATA ═══
Name: ${userProfile.name}
Email: ${userProfile.email}
Phone: ${userProfile.phone}
Location: ${userProfile.location}
LinkedIn: ${userProfile.links?.linkedin || 'N/A'}
GitHub: ${userProfile.links?.github || 'N/A'}
Portfolio: ${userProfile.links?.portfolio || 'N/A'}
Expected Salary: ${userProfile.expectedSalary || 'N/A'}
Work Authorization: ${userProfile.workAuthorization?.visaStatus || 'N/A'}
Sponsorship Needed: ${userProfile.workAuthorization?.sponsorshipNeeded ? 'Yes' : 'No'}
Demographics: ${demographics}
Skills: ${skills}
Experience: ${experience}
Education: ${education}
Resume File Path: ${userProfile.localResumePath || 'NOT AVAILABLE'}
Bio: ${userProfile.bio || 'N/A'}

═══ PAGE ELEMENTS (${domElements.length} total) ═══
Elements marked with ★ are EMPTY and NEED TO BE FILLED.
Elements with role="combobox" are CUSTOM DROPDOWNS — use click → wait → click option pattern.

${JSON.stringify(domElements.map(el => ({
  ...el,
  status: (!el.value || el.value === '' || el.value === 'Select' || el.value === 'Select...' || el.value === 'Choose') ? '★ EMPTY - NEEDS FILLING' : 'HAS VALUE'
})), null, 2)}

═══ YOUR TASK ═══
Generate Playwright code to fill ALL elements marked ★ EMPTY.
For custom comboboxes (role="combobox"): click to open → waitForTimeout(600) → click the role="option" with matching text.
For file uploads: use page.setInputFiles('input[type="file"]', userProfile.localResumePath).
Use the "selector" field from each element as your primary selector.
Return ONLY valid JSON.`;
}

export { SYSTEM_PROMPT };
