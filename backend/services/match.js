import Job from '../models/job.js';
import Profile from '../models/profile.js';

/**
 * Calculates match percentage between a job and a user profile
 * A simple but effective keyword-overlap algorithm
 */
export const calculateMatch = (job, profile) => {
  if (!profile) return 0;
  
  const profileSkills = (profile.skills || []).map(s => s.toLowerCase());
  const jobTags = (job.tags || []).map(t => t.toLowerCase());
  
  // 1. Skill Match Score (Based on Job Tags)
  // How many of the job's required tags does the user have?
  let tagMatches = 0;
  jobTags.forEach(tag => {
    // Check if tag is in user skills
    if (profileSkills.some(s => s.includes(tag) || tag.includes(s))) {
      tagMatches++;
    } else {
      // Check if tag is in user's bio, projects, or experience
      const profileText = [
        profile.bio,
        ...(profile.projects || []).map(p => `${p.title} ${p.description} ${p.techStack?.join(' ')}`),
        ...(profile.workExperience || []).map(w => `${w.role} ${w.description}`),
        ...(profile.extraSections || []).map(e => `${e.title} ${e.content}`)
      ].join(' ').toLowerCase();
      
      if (profileText.includes(tag)) {
        tagMatches++;
      }
    }
  });

  const tagMatchScore = jobTags.length > 0 
    ? (tagMatches / jobTags.length) * 100 
    : 100;

  // 2. Keyword Overlap (Bonus)
  // How many of the user's skills are mentioned in the job description?
  const jobText = `${job.title} ${job.shortDescription} ${job.description}`.toLowerCase();
  let keywordMatches = 0;
  profileSkills.forEach(skill => {
    if (jobText.includes(skill)) keywordMatches++;
  });
  
  const keywordScore = profileSkills.length > 0 
    ? Math.min(100, (keywordMatches / Math.max(3, jobTags.length)) * 100)
    : 0;

  // Combined Skill Score
  const skillScore = (tagMatchScore * 0.7) + (keywordScore * 0.3);

  // 3. Preferences (Type & Workplace)
  let typeScore = 80; // Default
  if (profile.commonData?.jobTypes?.includes(job.type)) typeScore = 100;
  else if (job.type === 'Full-time') typeScore = 80;

  let workplaceScore = 50; // Default
  if (profile.commonData?.workplacePreferences?.includes(job.workplace)) workplaceScore = 100;

  // Weights
  const totalScore = (skillScore * 0.7) + (typeScore * 0.15) + (workplaceScore * 0.15);
  
  return Math.round(Math.min(100, totalScore));
};

export const updateAllMatches = async (userId) => {
  const profile = await Profile.findOne({ userId });
  if (!profile) return;
  
  const jobs = await Job.find({});
  const updates = jobs.map(job => {
    const matchPercent = calculateMatch(job, profile);
    return Job.updateOne({ _id: job._id }, { $set: { matchPercent } });
  });
  
  await Promise.all(updates);
};

export const PREMIUM_PALETTES = [
  { bg: '#f0fdf4', text: '#166534' }, // Emerald
  { bg: '#f0f9ff', text: '#0369a1' }, // Sky
  { bg: '#fef2f2', text: '#991b1b' }, // Rose
  { bg: '#fff7ed', text: '#9a3412' }, // Orange
  { bg: '#faf5ff', text: '#6b21a8' }, // Purple
  { bg: '#f5f3ff', text: '#5b21b6' }, // Violet
  { bg: '#fdf2f7', text: '#9d174d' }, // Pink
  { bg: '#ecfdf5', text: '#065f46' }, // Teal
  { bg: '#eff6ff', text: '#1e40af' }, // Blue
];

export const assignRandomColors = async () => {
  const jobs = await Job.find({});
  const updates = jobs.map(job => {
    const palette = PREMIUM_PALETTES[Math.floor(Math.random() * PREMIUM_PALETTES.length)];
    return Job.updateOne({ _id: job._id }, { 
      $set: { 
        accentBg: palette.bg, 
        accentText: palette.text 
      } 
    });
  });
  await Promise.all(updates);
};
