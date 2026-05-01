import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  companyWebsite: { type: String, default: '' },
  location: { type: String, default: '' },
  type: { type: String, enum: ['Internship', 'Full-time', 'Part-time', 'Apprenticeship', 'Contract'], default: 'Internship' },
  category: { type: String, default: 'Software Engineering' },
  workplace: { type: String, enum: ['Remote', 'Hybrid', 'Onsite'], default: 'Remote' },
  term: { type: String, default: '' },
  tags: { type: [String], default: [] },
  shortDescription: { type: String, default: '' },
  description: { type: String, default: '' },
  aboutCompany: { type: String, default: '' },
  aboutYou: { type: String, default: '' },
  applicationUrl: { type: String, default: '' },
  matchPercent: { type: Number, default: 0 },
  accentBg: { type: String, default: '#ffffff' },
  accentText: { type: String, default: '#374151' },
  applied: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  postedAt: { type: Date, default: Date.now },
}, { timestamps: true });

const Job = mongoose.model('Job', jobSchema);
export default Job;
