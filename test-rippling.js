import { chromium } from 'playwright';
import { getPageElements, buildContextPrompt, SYSTEM_PROMPT, callAgentAI } from './electron/playwright/ai.js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  console.log("Navigating...");
  await page.goto('https://ats.rippling.com/en-GB/flatiron-school/jobs/418d088d-0a40-4e63-b19e-2a2c91bb6152/apply?src=LinkedIn&jobBoardSlug=flatiron-school&jobId=418d088d-0a40-4e63-b19e-2a2c91bb6152&step=application', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  
  console.log("Extracting elements...");
  const elements = await getPageElements(page);
  
  const userProfile = {
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "+1-555-123-4567",
    location: "New York, NY",
    localResumePath: "/tmp/fake-resume.pdf",
    demographics: { gender: "Male", race: "Asian", veteranStatus: false, disabilityStatus: false },
    workAuthorization: { visaStatus: "US Citizen", sponsorshipNeeded: false },
    education: [{ school: "NYU", degree: "BS", field: "Computer Science" }],
    experience: [{ company: "Tech Inc", title: "Engineer" }]
  };
  
  const prompt = buildContextPrompt(page.url(), elements, userProfile);
  console.log("Calling AI...");
  const result = await callAgentAI(SYSTEM_PROMPT, prompt, {
    provider: 'google',
    model: 'gemini-1.5-flash',
    apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
  });
  
  console.log(JSON.stringify(result, null, 2));
  
  await browser.close();
})();
