/**
 * AI Agent Logic for Playwright Automation
 * Complete implementation with all AI providers and smart form filling
 */

import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Retry wrapper for rate limits
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
        err.message?.includes('rate limit');

      if (isRetryable && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        console.log(`[AI] Rate limited. Retrying in ${Math.round(delay)}ms...`);
        await new Promise(res => setTimeout(res, delay));
      } else {
        throw err;
      }
    }
  }
}

/**
 * Call AI with a system prompt and context
 */
export async function callAgentAI(systemPrompt, userPrompt, config = {}) {
  const { provider, model: modelName, apiKey } = config;

  if (!apiKey || apiKey === '********') {
    throw new Error(`AI Configuration for ${provider} is missing.`);
  }

  let finalModel = modelName;
  if (provider === 'google' || !provider) {
    if (!finalModel || finalModel.includes('1.5') || finalModel.includes('2.0')) {
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

    try {
      return JSON.parse(textResponse);
    } catch {
      const jsonMatch = textResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) return JSON.parse(jsonMatch[1]);
      throw new Error('Failed to parse AI response');
    }
  } catch (err) {
    console.error(`[AI] ${provider} Error:`, err.message);
    throw err;
  }
}

/**
 * Extract interactive elements from page
 */
export async function getPageElements(page) {
  return await page.evaluate(() => {
    const results = [];
    let elementIdCounter = 0;

    function walk(node) {
      if (node.shadowRoot) walk(node.shadowRoot);
      
      for (const child of node.children || []) {
        const tag = child.tagName?.toLowerCase();
        const role = child.getAttribute('role');
        const type = child.getAttribute('type');

        // Capture context (headings, paragraphs)
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
            walk(child);
            continue;
          }

          const rect = child.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const uniqueId = `Fillica-${Date.now()}-${elementIdCounter++}`;
            child.setAttribute('data-fillica-id', uniqueId);

            // Find question context
            let question = '';
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
            walker.currentNode = child;
            let nodeText;
            let count = 0;
            while ((nodeText = walker.previousNode()) && count < 20) {
              count++;
              const text = nodeText.textContent?.trim();
              if (text && text.length > 3 && text.length < 300) {
                question = text;
                break;
              }
            }

            let optionLabel = '';
            if (tag === 'button' || tag === 'option' || type === 'submit') {
              optionLabel = child.innerText?.trim() || child.value || '';
            }

            const options = tag === 'select' 
              ? Array.from(child.options || []).map(o => ({ value: o.value, text: o.text }))
              : [];

            results.push({
              tag,
              type: type || '',
              question,
              optionLabel,
              id: child.id,
              name: child.getAttribute('name'),
              placeholder: child.getAttribute('placeholder'),
              value: child.value || '',
              ariaLabel: child.getAttribute('aria-label'),
              role,
              required: child.required || child.getAttribute('aria-required') === 'true',
              checked: child.checked || false,
              options,
              selector: `[data-fillica-id="${uniqueId}"]`
            });
          }
        }
        
        walk(child);
      }
    }

    walk(document.body);
    return results;
  });
}

/**
 * System prompt for AI
 */
export const SYSTEM_PROMPT = `You are a professional Web Automation Agent for job applications.

Detect page type:
1. **Job Portal**: Click "Apply", "Apply Now", "Quick Apply" button
2. **Login Wall**: Use provided email/password to login
3. **Application Form**: Fill form fields with user profile data
4. **Unrelated**: Set is_job_form: false

For forms, respond with JSON:
{
  "plan": "Brief description of actions",
  "is_job_form": true/false,
  "has_submit_button": false,
  "playwright_code": "await page.fill('#fname', 'John');\\nawait page.click('#nextBtn');"
}

Rules:
- Use selectors: id > name > data-testid > role-based
- Force click hidden elements: { force: true }
- For file uploads: await page.setInputFiles(selector, userProfile.localResumePath)
- Don't click final "Submit" button - set has_submit_button: true instead
- Click "Next", "Continue", "Apply" buttons if present
- Use force: true for custom dropdowns
- Handle both modern React components and native HTML
- Map user data: name, email, phone, skills, experience, location
- For text areas: use bio or synthesize from skills/experience
- Keep code valid JavaScript with proper escaping`;

/**
 * Build context prompt for AI analysis
 */
export function buildContextPrompt(url, domElements, userProfile) {
  return `Current URL: ${url}

User Profile:
- Name: ${userProfile.name}
- Email: ${userProfile.email}
- Phone: ${userProfile.phone}
- Location: ${userProfile.location}
- Skills: ${userProfile.skills?.join(', ') || 'Not provided'}
- Education: ${userProfile.education?.map(e => \`\${e.school} - \${e.field}\`).join(', ') || 'Not provided'}

Page Elements Found:
\`\`\`json
${JSON.stringify(domElements, null, 2)}
\`\`\`

Analyze this page and determine:
1. What type of page is this?
2. What actions should be taken?
3. Generate Playwright code to fill/navigate the form

Respond with valid JSON only.`;
}
