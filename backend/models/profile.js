import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    name: String,
    email: String,
    phone: String,
    defaultPassword: {
      type: String,
      select: false // Don't return password in normal queries
    },
    resumeUrl: String,
    location: String,
    bio: String,
    skills: [String],
    education: [
      {
        institute: String,
        degree: String,
        field: String,
        startYear: Number,
        endYear: Number,
      },
    ],
    workExperience: [
      {
        company: String,
        role: String,
        startDate: Date,
        endDate: Date,
        description: String,
      },
    ],
    projects: [
      {
        title: String,
        description: String,
        techStack: [String],
        link: String,
      },
    ],
    certifications: [
      {
        name: String,
        issuer: String,
        date: Date,
      },
    ],
    achievements: [String],
    extraSections: [
      {
        title: String,
        content: String,
      },
    ],
    links: {
      linkedin: String,
      github: String,
      portfolio: String,
      twitter: String,
      other: [String]
    },
    demographics: {
      gender: String,
      pronouns: String,
      race: String,
      veteran: String,
      disability: String
    },
    workAuthorization: {
      visaStatus: String,
      sponsorshipNeeded: Boolean
    },
    expectedSalary: String,
    aiConfiguration: {
      provider: { type: String, enum: ['google', 'openai', 'anthropic', 'deepseek'], default: 'google' },
      model: { type: String, default: 'gemini-1.5-flash' },
      apiKey: { type: String, select: false }
    }
  },
  { timestamps: true }
);

const Profile = mongoose.model('Profile', profileSchema);
export default Profile;
