import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import { PDFParse } from 'pdf-parse';
import bcrypt from 'bcryptjs';
import { uploadFile, getSignedFileUrl } from '../config/s3.js';
import Profile from '../models/profile.js';
import { updateAllMatches } from '../services/match.js';

async function withRetry(fn, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if ((err.status === 503 || err.status === 429) && i < retries - 1) {
        const wait = delay * Math.pow(2, i);
        console.log(`AI busy (${err.status}), retrying in ${wait}ms...`);
        await new Promise((resolve) => setTimeout(resolve, wait));
        continue;
      }
      throw err;
    }
  }
}

const RESUME_PROMPT = `
    Extract structured data from this resume.
    Return ONLY valid JSON in the exact following format:
    {
      "name": String,
      "email": String,
      "phone": String,
      "location": String,
      "skills": [String],
      "education": [{
        "institute": String,
        "degree": String,
        "field": String,
        "startYear": Number,
        "endYear": Number
      }],
      "workExperience": [{
        "company": String,
        "role": String,
        "startDate": "YYYY-MM-DD",
        "endDate": "YYYY-MM-DD",
        "description": String
      }],
      "projects": [{
        "title": String,
        "description": String,
        "techStack": [String],
        "link": String
      }],
      "certifications": [{
        "name": String,
        "issuer": String,
        "date": "YYYY-MM-DD"
      }],
      "achievements": [String],
      "links": {
        "linkedin": String,
        "github": String,
        "portfolio": String,
        "twitter": String,
        "other": [String]
      },
      "expectedSalary": String,
      "workAuthorization": {
        "visaStatus": String,
        "sponsorshipNeeded": Boolean
      },
      "extraSections": [{
        "title": String,
        "content": String
      }]
    }
    Important: 
    1. Only return the JSON object, no markdown fencing or extra text.
    2. Extract EVERY piece of information. If there are sections that do not fit into the standard arrays, put them in "extraSections".
`;

/**
 * Shared helper: parse a resume PDF with AI and return structured data.
 * Supports Google Gemini, OpenAI, Anthropic, and DeepSeek.
 */
async function parseResumeWithAI(resume, aiConfig = {}) {
  const apiKey = aiConfig.apiKey;
  const provider = aiConfig.provider || 'google';
  let modelName = aiConfig.model;
  
  // Auto-upgrade legacy models
  if (provider === 'google' && modelName && modelName.includes('gemini-1.5')) {
    modelName = 'gemini-2.0-flash';
  }

  if (!apiKey || apiKey === '********') {
    throw new Error('AI Configuration Missing: Please set your personal AI API Key in the Profile section before uploading a resume.');
  }

  const pdfBuffer = fs.readFileSync(resume.path);
  const base64Pdf = pdfBuffer.toString('base64');

  try {
    let text = '';

    if (provider === 'google') {
      // ─── Google Gemini ───
      let finalModel = modelName;
      if (!finalModel || finalModel.includes('1.5') || finalModel.includes('2.0') || finalModel.includes('2.5')) {
        finalModel = 'gemini-flash-latest';
      }
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await withRetry(() =>
        ai.models.generateContent({
          model: finalModel,
          contents: [
            {
              inlineData: {
                data: base64Pdf,
                mimeType: 'application/pdf'
              }
            },
            { text: RESUME_PROMPT }
          ],
          config: { responseMimeType: 'application/json' }
        })
      );
      text = response.text;

    } else if (provider === 'openai') {
      // ─── OpenAI (GPT-4o vision supports PDF via base64 data URI) ───
      const openai = new OpenAI({ apiKey });
      const response = await withRetry(() =>
        openai.chat.completions.create({
          model: modelName || 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:application/pdf;base64,${base64Pdf}`,
                    detail: 'auto'
                  }
                },
                { type: 'text', text: RESUME_PROMPT }
              ]
            }
          ],
          response_format: { type: 'json_object' }
        })
      );
      text = response.choices[0].message.content;

    } else if (provider === 'anthropic') {
      // ─── Anthropic Claude (native PDF support via document blocks) ───
      const anthropic = new Anthropic({ apiKey });
      const response = await withRetry(() =>
        anthropic.messages.create({
          model: modelName || 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'document',
                  source: {
                    type: 'base64',
                    media_type: 'application/pdf',
                    data: base64Pdf
                  }
                },
                { type: 'text', text: RESUME_PROMPT }
              ]
            }
          ]
        })
      );
      text = response.content[0].text;

    } else if (provider === 'deepseek') {
      // ─── DeepSeek (text-only — extract PDF text first) ───
      const parser = new PDFParse();
      const pdfData = await parser.loadPDF(pdfBuffer);
      const resumeText = pdfData.pages.map(p => p.text).join('\n');

      const openai = new OpenAI({
        apiKey,
        baseURL: 'https://api.deepseek.com'
      });
      const response = await withRetry(() =>
        openai.chat.completions.create({
          model: modelName || 'deepseek-chat',
          messages: [
            { role: 'system', content: 'You are a resume parsing assistant. Extract structured data from the provided resume text.' },
            { role: 'user', content: `${RESUME_PROMPT}\n\nRESUME TEXT:\n${resumeText}` }
          ],
          response_format: { type: 'json_object' }
        })
      );
      text = response.choices[0].message.content;

    } else {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }

    // Clean up temp file
    if (fs.existsSync(resume.path)) fs.unlinkSync(resume.path);

    // Extract JSON from response (some providers wrap in markdown)
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
    return JSON.parse(jsonMatch[1]);
  } catch (err) {
    if (fs.existsSync(resume.path)) fs.unlinkSync(resume.path);
    console.error(`[AI] Resume Parsing Error (${provider}):`, err.message);
    throw new Error(`AI Parsing Failed (${provider}): ${err.message}`);
  }
}

export const createProfile = async (req, res) => {
  try {
    const resume = req.file;
    if (!resume) {
      return res.status(400).json({ error: 'Resume file required' });
    }

    // Check if profile already exists for this user
    const existingProfile = await Profile.findOne({ userId: req.user._id });
    if (existingProfile) {
      return res.status(409).json({
        error: 'Profile already exists. Use PUT /profile/resume to update.',
      });
    }

    // Upload resume to S3
    const { url } = await uploadFile(resume);

    // Parse resume with AI - fetch aiConfig if possible
    let extracted;
    try {
      // If aiConfig is passed in body, use it.
      let aiConfig = null;
      if (req.body.aiConfiguration) {
        try { aiConfig = JSON.parse(req.body.aiConfiguration); } catch { }
      }
      
      extracted = await parseResumeWithAI(resume, aiConfig);
    } catch (err) {
      console.error('Failed to parse resume:', err);
      return res.status(400).json({ error: err.message });
    }

    // Save profile linked to authenticated user
    const profile = await Profile.create({
      ...extracted,
      userId: req.user._id,
      resumeUrl: url,
      aiConfiguration: aiConfig,
    });

    // Trigger match recalculation
    updateAllMatches(req.user._id).catch(err => console.error('Match calc error:', err));
    
    // Generate signed url to return immediately
    const profileJson = profile.toJSON();
    if (profileJson.resumeUrl) {
      profileJson.resumeUrl = await getSignedFileUrl(profileJson.resumeUrl);
    }

    return res.status(201).json({
      message: 'Profile created successfully',
      profile: profileJson,
    });
  } catch (err) {
    console.error('Profile creation error:', err);
    return res.status(500).json({ error: err.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    // Explicitly select defaultPassword and aiConfiguration.apiKey because they have select: false in schema
    const profileDoc = await Profile.findOne({ userId: req.user._id }).select('+defaultPassword +aiConfiguration.apiKey');
    
    if (!profileDoc) {
      return res.status(404).json({ error: 'Profile not found. Please upload your resume.' });
    }
    
    const profile = profileDoc.toObject();
    
    // Replace sensitive values with placeholders for frontend detection
    if (profile.defaultPassword) {
      profile.defaultPassword = '********';
    }
    if (profile.aiConfiguration?.apiKey) {
      profile.aiConfiguration.apiKey = '********';
    }
    
    // Generate signed url
    if (profile.resumeUrl) {
      profile.resumeUrl = await getSignedFileUrl(profile.resumeUrl);
    }
    
    return res.json({ profile });
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({ error: err.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // Handle password hashing if provided
    if (updateData.defaultPassword && updateData.defaultPassword !== '********') {
      const salt = await bcrypt.genSalt(10);
      updateData.defaultPassword = await bcrypt.hash(updateData.defaultPassword, salt);
    } else if (updateData.defaultPassword === '********') {
      delete updateData.defaultPassword;
    }

    // Handle AI API Key - if it's the mask, don't update it
    if (updateData.aiConfiguration?.apiKey === '********') {
      delete updateData.aiConfiguration.apiKey;
    }

    const profile = await Profile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: updateData },
      { returnDocument: 'after', runValidators: true, upsert: true }
    );

    // Trigger match recalculation
    updateAllMatches(req.user._id).catch(err => console.error('Match calc error:', err));
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    return res.json({ message: 'Profile updated successfully', profile });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * Update profile by re-uploading a resume.
 * Re-parses the PDF with the user's configured AI provider and replaces all profile fields.
 */
export const updateProfileWithResume = async (req, res) => {
  try {
    const resume = req.file;
    if (!resume) {
      return res.status(400).json({ error: 'Resume file required' });
    }

    // Upload new resume to S3
    const { url } = await uploadFile(resume);

    // Parse resume with AI - must fetch existing config
    const profileDoc = await Profile.findOne({ userId: req.user._id }).select('+aiConfiguration.apiKey');
    
    let extracted;
    try {
      extracted = await parseResumeWithAI(resume, profileDoc?.aiConfiguration);
    } catch (err) {
      console.error('Failed to parse resume:', err);
      return res.status(400).json({ error: err.message });
    }

    // Update (or upsert) the profile with new data
    const profile = await Profile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: { ...extracted, userId: req.user._id, resumeUrl: url } },
      { returnDocument: 'after', runValidators: true, upsert: true }
    );

    // Trigger match recalculation
    updateAllMatches(req.user._id).catch(err => console.error('Match calc error:', err));
    
    const profileJson = profile.toJSON();
    if (profileJson.resumeUrl) {
      profileJson.resumeUrl = await getSignedFileUrl(profileJson.resumeUrl);
    }

    return res.json({
      message: 'Profile updated successfully',
      profile: profileJson,
    });
  } catch (err) {
    console.error('Profile update with resume error:', err);
    return res.status(500).json({ error: err.message });
  }
};