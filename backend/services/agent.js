import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import * as cheerio from 'cheerio';

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
        err.message?.includes('overloaded');

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

// ─── System Prompt (The "Architect" Prompt) ───
const SYSTEM_PROMPT = `You are a professional Web Automation Agent. Your goal is to fill job application forms based on the provided USER_PROFILE.

**Operational Rules:**

── PHASE 0: PAGE CLASSIFICATION ──
1. **Detect Page Type First:** Before doing anything, classify the current page:
   a) **Job Portal / Listing Page** — Shows a job posting with an "Apply", "Apply Now", "Quick Apply", "Apply for this job", "Easy Apply", or similar button but NO form fields. → You MUST click that apply button to reach the actual form. Write the click code and set \`is_job_form: true\`.
   b) **Login / Register Wall** — The page requires login or account creation before applying. → Use \`userProfile.email\` and \`userProfile.password\` to fill login fields, or register a new account using the user's data. Set \`is_job_form: true\`.
   c) **Job Application Form** — Has input fields, dropdowns, textareas for personal data. → Proceed to fill the form (Phase 1).
   d) **Unrelated Page** — Not related to job applications at all. → Set \`is_job_form: false\`.

── PHASE 1: FORM FILLING ──
2. **Analyze the DOM:** Look at the minimized DOM string provided. Identify inputs, checkboxes, radio buttons, selects, and buttons.
3. **Playwright Code:** You must write executable Playwright JavaScript code to fill out the current form page.
   - Assume the \`page\` object is already available in the global scope (e.g., \`await page.fill('#firstName', 'John');\`).
   - Write ONLY valid JS code inside the "playwright_code" JSON string field. Use exact string escaping for newlines.
4. **Navigation & Submit:**
   - If there is a "Next", "Continue", "Save & Continue", or "Proceed" button (multi-page form), INCLUDE \`await page.click('SELECTOR');\` at the very end of your code to advance the page.
   - If there is a final "Submit" or "Apply" button, DO NOT click it in your code! Set \`has_submit_button: true\` instead.
5. **Structured Output Only:** Always respond in the following JSON format:
{
  "plan": "Short description of what you are doing on this page",
  "is_job_form": true,
  "has_submit_button": false,
  "playwright_code": "await page.fill('#fname', 'John');\\nawait page.fill('#lname', 'Doe');\\nawait page.click('#nextBtn');"
}

── PHASE 2: FIELD STRATEGIES ──
6. **Be Precise:** Prefer ID selectors (#id), then name attributes ([name="field"]), then data-testid, then aria-label. Skip fields you don't have data for.
7. **Bypass Hidden Elements:** Many modern job portals use hidden native selects (like Bootstrap selectpicker) or checkboxes. You MUST always use \`{ force: true }\` when calling click(), check(), or selectOption() to ensure they work even if visually hidden.
   - Example: \`await page.selectOption('#txtCurrentlyEmployed', 'Yes', { force: true });\`
8. **Robust Checkboxes:** If a checkbox is part of a complex UI framework (like a toggle slider or custom div), standard \`page.check\` will fail. Use \`page.evaluate\` to click it directly via DOM:
   - Example: \`await page.evaluate(() => document.querySelector('#acceptanceCHK')?.click());\`
9. **Searchable Dropdowns / Typeaheads:** Many modern portals use React Select, Ant Design Select, or similar components where the native \`<select>\` is hidden. For these:
   - Click the dropdown container to open it
   - Type the desired value into the visible input
   - Wait briefly for options to filter (\`await page.waitForTimeout(500);\`)
   - Click the matching option from the dropdown list
   - Example: \`await page.click('.select-container'); await page.fill('.select-container input', 'United States'); await page.waitForTimeout(500); await page.click('.select-option:has-text("United States")');\`
10. **Smart Data Formatting:**
    - Phone numbers: If the form has a separate Country Code dropdown, strip the '+X' from the phone value before filling the text input.
    - Dates (DOB/Experience): Inspect whether the form uses a single text input ('MM/DD/YYYY') or separate Day/Month/Year dropdowns, and format the output accordingly.

── PHASE 3: SPECIAL FIELDS ──
11. **File Uploads (Resumes):** If you encounter an \`<input type="file">\` or a drag-and-drop zone that asks for a resume, CV, or attachment, you MUST use \`await page.setInputFiles(selector, userProfile.localResumePath);\` if \`userProfile.localResumePath\` is provided.
    - Example: \`if (userProfile.localResumePath) await page.setInputFiles('input[name="resume"]', userProfile.localResumePath);\`.
12. **Social & Portfolio Links:** Actively look for fields asking for LinkedIn, GitHub, Portfolio, or personal websites. Map them from \`userProfile.links\`.
    - LinkedIn: \`userProfile.links.linkedin\`
    - GitHub: \`userProfile.links.github\`
    - Portfolio: \`userProfile.links.portfolio\`
13. **Demographics & EEO Questions:** Use data from \`userProfile.demographics\`:
    - Gender: \`userProfile.demographics.gender\`
    - Pronouns: \`userProfile.demographics.pronouns\`
    - Race/Ethnicity: \`userProfile.demographics.race\`
    - Veteran Status: \`userProfile.demographics.veteran\`
    - Disability: \`userProfile.demographics.disability\`
    For these, match the closest available option in the dropdown/radio. If the user selected "Prefer not to say", look for "Decline to self-identify" or similar options.
14. **Open-ended Background Questions:** If a textarea asks for "Tell us about your background", "Why do you want to join?", or "Why are you a good fit?":
    - Use \`userProfile.bio\` as the primary source.
    - If \`userProfile.bio\` is empty, synthesize a 3-4 sentence professional response based on the user's \`skills\`, \`workExperience\`, and the context of the job application.
    - Keep the tone humble yet confident and professional.
15. **Work Authorization & Visa:** Use \`userProfile.workAuthorization\`:
    - Visa Status: \`userProfile.workAuthorization.visaStatus\`
    - Sponsorship Needed: \`userProfile.workAuthorization.sponsorshipNeeded\` (boolean → "Yes"/"No")
    Common question patterns: "Are you authorized to work in the US?" → answer based on visaStatus. "Will you now or in the future require sponsorship?" → answer based on sponsorshipNeeded.
15. **Salary Expectations:** If a field asks for expected/desired salary, use \`userProfile.expectedSalary\`.
16. **Cover Letter Fields:** If a textarea is explicitly for a cover letter:
    - Generate a brief, professional 3-4 sentence cover letter using the user's name, skills, and the company/role context.
    - Example: "Dear Hiring Team, I am excited to apply for this role. With experience in [skills], I am confident I can contribute meaningfully to your team. I look forward to discussing how my background aligns with your needs."

── PHASE 4: RESILIENCE ──
17. **Forgiving Execution:** You DO NOT need to fill every single field. Only fill what you are confident about. Wrap risky or complex actions in \`try { ... } catch(e) { console.warn(e) }\` blocks so that a single failed field doesn't crash the entire automation script.
18. **Specific Portals (Ashby/Greenhouse/Lever/Workday/iCIMS):** These often use hidden inputs or complex div-based selects. Prefer using \`page.evaluate\` to click options or \`{ force: true }\` for all interactions to bypass "element is not visible" errors.
19. **DOM Data Structure:** You will receive a JSON array of interactive elements. Each element has:
    - \`question\`: The semantic context (e.g. "What is your gender?", "Professional Summary").
    - \`optionLabel\`: The specific label for this choice (e.g. "Male", "I am a veteran").
    - \`tag\`, \`type\`, \`placeholder\`, \`value\`, \`options\` (for selects).
    Use the \`question\` and \`optionLabel\` as your primary guides for mapping fields to the user profile.
20. **Final Submission:** DO NOT click any button that finalizes the application (e.g., "Submit", "Finish", "Send Application"). Identify these buttons and set \`has_submit_button: true\` in your response. You SHOULD click "Apply", "Next", "Continue", or "Save & Next" buttons to navigate multi-page forms.
21. **Selector Usage:** Use the provided \`selector\` in your Playwright code. If a selector is null, use a text-based locator like \`page.locator('text="Apply"').first()\`.
22. **Navigation:** Always check for "Apply" or "Next" buttons if you are not yet on the actual form. If you are on a landing page, navigate to the form.
23. **Handle Tailwind & Special Characters:** Selectors with colons (like \`lg:hidden\`) are provided to you as escaped strings (e.g., \`lg\\:hidden\`). Use them exactly as provided or use text/role-based locators to avoid SyntaxErrors.
24. **Ultimate Click (The most rigorous method):** If a button (like "Apply Now") consistently fails to be "visible", use the DOM-level click: \`await page.evaluate((s) => document.querySelector(s)?.click(), 'SELECTOR_OR_CSS_PATH')\`. This bypasses ALL visibility, overlap, and stability checks.
25. **Custom Dropdowns (Rippling/Comboboxes):** If a field has \`role="combobox"\`, it is a custom dropdown. You MUST:
    1. Click the combobox first: \`await page.click(selector, { force: true })\`.
    2. Wait for options: \`await page.waitForTimeout(500)\`.
    3. Click the option that matches the user's data: \`await page.locator('text="OptionValue"').first().click({ force: true })\`.
26. **Inputs as Textareas:** Some portals (like Rippling) use \`<input type="text">\` for long questions like "Background" or "Why join?". You SHOULD enter your full generated response into these fields even if they aren't \`<textarea>\` tags. Use \`page.fill(selector, text)\`.`;

// ─── DOM Minimizer ───
// Extracts only interactive elements from raw HTML to reduce token usage
export function minimizeDOM(html) {
  const $ = cheerio.load(html);

  // Remove script, style, svg, noscript, link, meta tags
  $('script, style, svg, noscript, link, meta, iframe, img, video, audio').remove();

  const elements = [];

  // Extract form fields
  $('input, textarea, select, button, [role="button"], [role="checkbox"], [role="radio"], [role="combobox"], [role="listbox"], a[href*="apply"], a[href*="login"]').each((i, el) => {
    const $el = $(el);
    const tag = el.tagName?.toLowerCase();
    const type = $el.attr('type') || '';
    const name = $el.attr('name') || '';
    const id = $el.attr('id') || '';
    const placeholder = $el.attr('placeholder') || '';
    const value = $el.val() || '';
    const ariaLabel = $el.attr('aria-label') || '';
    const role = $el.attr('role') || '';
    const checked = $el.is(':checked') ? 'checked' : '';
    const disabled = $el.is(':disabled') ? 'disabled' : '';
    const required = $el.is('[required]') ? 'required' : '';
    const href = $el.attr('href') || '';
    const dataTestId = $el.attr('data-testid') || '';

    // Find associated label
    let label = '';
    if (id) {
      label = $(`label[for="${id}"]`).text().trim();
    }
    if (!label) {
      label = $el.closest('label').text().trim();
    }
    if (!label) {
      // Look for nearby text in siblings or parent's siblings
      const ancestors = $el.parents().slice(0, 3);
      for (const node of [$el, ...ancestors.toArray().map(n => $(n))]) {
        const prevText = node.prev().text().trim();
        if (prevText && prevText.length > 2 && prevText.length < 200) {
          label = prevText;
          break;
        }
      }
    }
    if (!label && placeholder) label = placeholder;
    if (!label && ariaLabel) label = ariaLabel;

    // For buttons/links/labels, capture the text content
    let buttonText = '';
    if (tag === 'button' || tag === 'a' || role === 'button' || tag === 'label') {
      buttonText = $el.text().trim().substring(0, 150);
    }

    // Build a selector
    let selector = '';
    if (id) selector = `#${id}`;
    else if (name) selector = `${tag}[name="${name}"]`;
    else if (dataTestId) selector = `[data-testid="${dataTestId}"]`;
    else selector = buildCSSPath($, $el);

    // For select elements, get options
    let options = [];
    if (tag === 'select') {
      $el.find('option').each((_, opt) => {
        options.push({
          value: $(opt).attr('value') || $(opt).text().trim(),
          text: $(opt).text().trim(),
        });
      });
    }

    const entry = {
      tag,
      selector,
      ...(type && { type }),
      ...(name && { name }),
      ...(label && { label }),
      ...(placeholder && { placeholder }),
      ...(value && { currentValue: value }),
      ...(ariaLabel && { ariaLabel }),
      ...(role && { role }),
      ...(checked && { checked }),
      ...(disabled && { disabled }),
      ...(required && { required }),
      ...(options.length > 0 && { options }),
      ...(href && { href }),
      ...(buttonText && { text: buttonText }),
      ...(dataTestId && { dataTestId }),
    };

    // Skip hidden inputs that aren't useful
    if (type === 'hidden') return;
    // Skip disabled fields
    if (disabled) return;

    elements.push(entry);
  });

  // Also look for labels that might indicate what fields are expected
  const labels = [];
  $('label').each((_, el) => {
    const text = $(el).text().trim();
    const forAttr = $(el).attr('for') || '';
    if (text && text.length < 200) {
      labels.push({ text, for: forAttr });
    }
  });

  // Extract page headings for context (helps AI understand what page we're on)
  const headings = [];
  $('h1, h2, h3').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length < 200) headings.push(text);
  });

  return JSON.stringify({ headings, interactiveElements: elements, labels }, null, 2);
}

// Build a reasonably unique CSS path for an element
function buildCSSPath($, $el) {
  const parts = [];
  let current = $el;
  for (let i = 0; i < 4 && current.length; i++) {
    const tag = current.prop('tagName')?.toLowerCase();
    if (!tag || tag === 'html' || tag === 'body') break;
    const cls = (current.attr('class') || '')
      .split(/\s+/)
      .filter(c => c && c.length < 30)
      .slice(0, 2)
      .map(c => c.replace(/:/g, '\\:')) // Escape colons for Tailwind classes like lg:hidden
      .join('.');
    const nthChild = current.index() + 1;
    parts.unshift(cls ? `${tag}.${cls}` : `${tag}:nth-child(${nthChild})`);
    current = current.parent();
  }
  return parts.join(' > ');
}

// ─── Context Prompt Builder ───
export function buildContextPrompt(url, minimizedDOM, userProfile) {
  return `Current URL: ${url}

Document Snippet (Interactive Elements Only):
${minimizedDOM}

User Profile Data:
${JSON.stringify(userProfile, null, 2)}

Based on the current page state, generate the next set of actions.
Rules:
- If this is a job listing page with an "Apply" button but no form, click the apply button.
- If this is a login/register page, use the user's email and password to log in or register.
- If this is an application form, fill the fields using the user profile data.
- NEVER click the final Submit/Apply button on a completed form. Set has_submit_button to true instead.
- If you encounter a Captcha, payment form, or identity verification, set requires_intervention to true.
- Skip fields that are already correctly filled.
- Wrap risky interactions in try/catch blocks.`;
}



// ─── Confidence Checker ───
export function classifyActions(actions, threshold = 0.7) {
  const highConfidence = [];
  const lowConfidence = [];

  for (const action of actions) {
    if (action.confidence >= threshold) {
      highConfidence.push(action);
    } else {
      lowConfidence.push(action);
    }
  }

  return { highConfidence, lowConfidence };
}

export { SYSTEM_PROMPT };
