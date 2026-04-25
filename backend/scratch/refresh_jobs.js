import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Job from '../models/job.js';
import Profile from '../models/profile.js';
import { assignRandomColors, calculateMatch } from '../services/match.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const main = async () => {
  try {
    const mongoUrl = process.env.MONGO_URL;
    if (!mongoUrl) throw new Error('MONGO_URL not found');
    await mongoose.connect(mongoUrl);
    console.log('Connected to DB');

    // 1. Assign random premium colors
    console.log('Assigning random colors...');
    await assignRandomColors();

    // 2. Standardize Job Types (Title Case)
    console.log('Standardizing job types...');
    const jobs = await Job.find({});
    for (const job of jobs) {
      if (job.type === 'full-time') job.type = 'Full-time';
      if (job.type === 'internship') job.type = 'Internship';
      await job.save();
    }

    // 3. Calculate matches for all profiles
    console.log('Calculating matches for all profiles...');
    const profiles = await Profile.find({});
    for (const profile of profiles) {
      for (const job of jobs) {
        const matchPercent = calculateMatch(job, profile);
        await Job.updateOne({ _id: job._id }, { $set: { matchPercent } });
      }
    }

    console.log('Refresh complete!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

main();
