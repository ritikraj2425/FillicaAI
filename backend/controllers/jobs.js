import Job from '../models/job.js';

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

const ACCENT_COLORS = [
  { bg: '#E8F5E9', text: '#2E7D32' }, // Green
  { bg: '#FCE4EC', text: '#880E4F' }, // Pink
  { bg: '#E3F2FD', text: '#1565C0' }, // Blue
  { bg: '#FFF3E0', text: '#E65100' }, // Orange
  { bg: '#F3E5F5', text: '#6A1B9A' }, // Purple
  { bg: '#E0F2F1', text: '#00695C' }, // Teal
  { bg: '#F1F5F9', text: '#0F172A' }, // Slate
];

const getRandomAccent = () => ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)];

const SEED_DATA = [
  {
    title: 'Full-Stack AI Developer Intern',
    company: 'Revvity',
    companyWebsite: 'revvity.wd103.myworkdayjobs.com',
    location: 'CAD Remote – ON',
    type: 'Internship',
    category: 'Software Engineering',
    workplace: 'Remote',
    term: 'Summer 2026',
    tags: ['python', 'next.js', 'docker'],
    shortDescription: '',
    description: 'Build and deploy full-stack applications that leverage generative AI and large language models to transform enterprise workflows. You will work closely with senior engineers on cutting-edge ML infrastructure and contribute to production-level services.',
    aboutCompany: 'Revvity is a developer and provider of end-to-end solutions designed to help scientists, researchers, and clinicians solve the world\'s greatest health challenges. We pair the enthusiasm of an industry disruptor with the experience of a longtime leader. Our team of 11,000+ colleagues from across the globe are vital to our success and the reason we\'re able to push boundaries in pursuit of better human health.',
    aboutYou: 'You\'re passionate about artificial intelligence, with a particular interest in how generative AI and large language models (LLMs) can transform business operations. You embody our core values: Embrace the unknown — you start each day with a "What if?"',
    applicationUrl: 'https://revvity.wd103.myworkdayjobs.com',
    matchPercent: 66,
    accentBg: '#ffffff',
    accentText: '#374151',
    postedAt: daysAgo(3),
  },
  {
    title: 'Accelerated AI Engineer Apprenticeship',
    company: 'Flatiron School',
    companyWebsite: 'ats.rippling.com',
    location: 'New York, NY',
    type: 'Apprenticeship',
    category: 'Artificial Intelligence',
    workplace: 'Onsite',
    term: 'Summer 2026',
    tags: ['javascript', 'python', 'tensorflow', 'react', 'sql', 'git', 'rest-apis', 'cloud', 'agile', 'data-structures', 'algorithms', 'machine-learning'],
    shortDescription: 'programming proficiency in modern languages',
    description: 'Join our intensive apprenticeship program to master AI engineering from fundamentals to production deployment. This accelerated track covers deep learning, NLP, computer vision, and MLOps in a hands-on, project-based environment.',
    aboutCompany: 'Flatiron School is an immersive coding bootcamp offering intensive courses and online programs in software engineering, data science, cybersecurity analytics, and product design. We\'re building an inclusive community of learners.',
    aboutYou: 'You have programming proficiency in modern languages and frameworks. Strong analytical skills and a passion for AI/ML technologies. You thrive in fast-paced, collaborative environments and ship production-quality code.',
    applicationUrl: 'https://ats.rippling.com',
    matchPercent: 66,
    accentBg: '#fce4ec',
    accentText: '#880e4f',
    postedAt: daysAgo(5),
  },
  {
    title: 'Software Engineer Apprenticeship',
    company: 'Flatiron School',
    companyWebsite: 'ats.rippling.com',
    location: 'Remote',
    type: 'Apprenticeship',
    category: 'Software Engineering',
    workplace: 'Remote',
    term: 'Summer 2026',
    tags: ['javascript', 'python', 'react', 'node.js', 'sql', 'git', 'html', 'css', 'rest-apis', 'agile', 'testing', 'ci-cd'],
    shortDescription: 'programming proficiency in modern languages',
    description: 'An intensive software engineering apprenticeship covering full-stack web development, system design, and industry best practices. Build production-grade applications under expert mentorship.',
    aboutCompany: 'Flatiron School is an immersive coding bootcamp offering intensive courses and online programs in software engineering, data science, cybersecurity analytics, and product design.',
    aboutYou: 'You\'re eager to launch a career in software engineering. Comfortable with HTML/CSS/JS basics, excited to build complex applications and learn industry-grade tooling.',
    applicationUrl: 'https://ats.rippling.com',
    matchPercent: 64,
    accentBg: '#e3f0ff',
    accentText: '#1e40af',
    postedAt: daysAgo(5),
  },
  {
    title: 'Machine Learning Engineer Intern',
    company: 'Scale AI',
    companyWebsite: 'scale.com/careers',
    location: 'San Francisco, CA',
    type: 'Internship',
    category: 'Machine Learning',
    workplace: 'Onsite',
    term: 'Summer 2026',
    tags: ['python', 'pytorch', 'aws', 'kubernetes', 'mlops'],
    shortDescription: 'strong fundamentals in ML and distributed systems',
    description: 'Design, train, and deploy machine learning models at scale. Work on data quality systems that power AI for the world\'s leading technology companies. Build robust ML pipelines handling petabytes of data.',
    aboutCompany: 'Scale AI accelerates the development of AI applications by providing high-quality training data and AI infrastructure. Our technology is used by leading AI teams including OpenAI, Meta, and the U.S. Department of Defense.',
    aboutYou: 'You have strong fundamentals in machine learning, statistics, and distributed systems. Experience with PyTorch or TensorFlow, and comfort with cloud infrastructure (AWS/GCP).',
    applicationUrl: 'https://scale.com/careers',
    matchPercent: 82,
    accentBg: '#dcf5e3',
    accentText: '#166534',
    postedAt: daysAgo(2),
  },
  {
    title: 'Frontend Developer Intern',
    company: 'Figma',
    companyWebsite: 'figma.com/careers',
    location: 'San Francisco, CA',
    type: 'Internship',
    category: 'Frontend Engineering',
    workplace: 'Hybrid',
    term: 'Fall 2026',
    tags: ['react', 'typescript', 'css', 'webgl', 'performance'],
    shortDescription: '',
    description: 'Build the next generation of collaborative design tools used by millions of designers and developers. Work on the core editor, real-time collaboration features, and component systems.',
    aboutCompany: 'Figma is the leading collaborative design platform. Born on the Web, Figma helps entire product teams brainstorm, design, and build better products — from start to finish.',
    aboutYou: 'You\'re passionate about UI performance, accessibility, and delightful user experiences. Strong TypeScript skills and deep understanding of browser rendering pipelines.',
    applicationUrl: 'https://figma.com/careers',
    matchPercent: 71,
    accentBg: '#f3e5f5',
    accentText: '#6a1b9a',
    postedAt: daysAgo(3),
  },
  {
    title: 'Backend Engineer Intern',
    company: 'Stripe',
    companyWebsite: 'stripe.com/jobs',
    location: 'Remote',
    type: 'Internship',
    category: 'Backend Engineering',
    workplace: 'Remote',
    term: 'Summer 2026',
    tags: ['ruby', 'go', 'postgresql', 'distributed-systems', 'api-design'],
    shortDescription: '',
    description: 'Build reliable, scalable payment infrastructure that moves billions of dollars. Design APIs used by millions of developers and work on core financial systems with extreme reliability requirements.',
    aboutCompany: 'Stripe is a financial infrastructure platform for businesses. Millions of companies — from the world\'s largest enterprises to the most ambitious startups — use Stripe to grow their revenue.',
    aboutYou: 'Strong computer science fundamentals, experience with backend development in any language, and interest in building large-scale distributed systems. Payments experience is a plus.',
    applicationUrl: 'https://stripe.com/jobs',
    matchPercent: 75,
    accentBg: '#e0f2f1',
    accentText: '#004d40',
    postedAt: daysAgo(1),
  },
  {
    title: 'Data Science Intern',
    company: 'Spotify',
    companyWebsite: 'spotifyjobs.com',
    location: 'New York, NY',
    type: 'Internship',
    category: 'Data Science',
    workplace: 'Hybrid',
    term: 'Summer 2026',
    tags: ['python', 'sql', 'spark', 'a/b-testing', 'statistics'],
    shortDescription: 'advanced analytics and experimentation',
    description: 'Analyze listening behavior at massive scale to improve personalization algorithms. Design and analyze A/B experiments, build predictive models, and deliver actionable insights to product teams.',
    aboutCompany: 'Spotify is the world\'s most popular audio streaming subscription service with 600M+ users. We\'re transforming how people discover, manage, and enjoy audio content.',
    aboutYou: 'You\'re proficient in Python and SQL, with knowledge of statistics and experimental design. Experience with big data tools (Spark, BigQuery) and a passion for music/audio is a plus.',
    applicationUrl: 'https://spotifyjobs.com',
    matchPercent: 58,
    accentBg: '#dcf5e3',
    accentText: '#166534',
    postedAt: daysAgo(7),
  },
  {
    title: 'DevOps Engineer Intern',
    company: 'Cloudflare',
    companyWebsite: 'cloudflare.com/careers',
    location: 'Austin, TX',
    type: 'Internship',
    category: 'DevOps / Infrastructure',
    workplace: 'Onsite',
    term: 'Summer 2026',
    tags: ['docker', 'kubernetes', 'terraform', 'linux', 'ci-cd', 'monitoring', 'networking'],
    shortDescription: 'infrastructure automation and reliability',
    description: 'Build and maintain the infrastructure that powers 25M+ Internet properties. Automate deployment pipelines, improve observability, and ensure five-nines availability across a global edge network.',
    aboutCompany: 'Cloudflare is on a mission to help build a better Internet. We run one of the world\'s largest networks powering roughly 25 million Internet properties, from individual blogs to Fortune 500 companies.',
    aboutYou: 'You\'re comfortable with Linux systems, container orchestration, and infrastructure-as-code. Strong networking fundamentals and a passion for building reliable, automated systems.',
    applicationUrl: 'https://cloudflare.com/careers',
    matchPercent: 63,
    accentBg: '#fff3e0',
    accentText: '#e65100',
    postedAt: daysAgo(4),
  },
  {
    title: 'AI Research Intern',
    company: 'DeepMind',
    companyWebsite: 'deepmind.google/careers',
    location: 'London, UK',
    type: 'Internship',
    category: 'AI Research',
    workplace: 'Onsite',
    term: 'Summer 2026',
    tags: ['python', 'jax', 'transformers', 'reinforcement-learning', 'mathematics'],
    shortDescription: 'cutting-edge AI research',
    description: 'Conduct original research in deep learning, reinforcement learning, or neuroscience-inspired AI. Collaborate with world-class researchers to publish at top-tier venues (NeurIPS, ICML, ICLR).',
    aboutCompany: 'DeepMind is a scientific discovery company, committed to "solving intelligence to advance science and humanity." We\'ve achieved breakthroughs like AlphaFold, which solved the protein folding problem.',
    aboutYou: 'You\'re pursuing a PhD or have exceptional ML research experience. Strong mathematical foundations, ability to implement novel architectures, and a track record of publications preferred.',
    applicationUrl: 'https://deepmind.google/careers',
    matchPercent: 72,
    accentBg: '#e3f0ff',
    accentText: '#1e40af',
    postedAt: daysAgo(6),
  },
  {
    title: 'Cloud Engineer Intern',
    company: 'Google',
    companyWebsite: 'careers.google.com',
    location: 'Mountain View, CA',
    type: 'Internship',
    category: 'Cloud Infrastructure',
    workplace: 'Hybrid',
    term: 'Summer 2026',
    tags: ['gcp', 'python', 'kubernetes', 'terraform', 'networking'],
    shortDescription: '',
    description: 'Work on Google Cloud Platform services used by millions of developers. Design, build, and maintain cloud infrastructure components that power the world\'s most demanding workloads.',
    aboutCompany: 'Google Cloud provides organizations with leading infrastructure, platform capabilities, and industry solutions. We deliver enterprise-grade cloud solutions leveraging Google\'s cutting-edge technology.',
    aboutYou: 'Strong systems programming skills, knowledge of networking and distributed computing. Familiarity with cloud platforms (GCP, AWS, Azure) and container orchestration.',
    applicationUrl: 'https://careers.google.com',
    matchPercent: 78,
    accentBg: '#e0f2f1',
    accentText: '#004d40',
    postedAt: daysAgo(2),
  },
  {
    title: 'Mobile Developer Intern',
    company: 'Airbnb',
    companyWebsite: 'airbnb.com/careers',
    location: 'Remote',
    type: 'Internship',
    category: 'Mobile Engineering',
    workplace: 'Remote',
    term: 'Summer 2026',
    tags: ['react-native', 'typescript', 'graphql', 'ios', 'android'],
    shortDescription: '',
    description: 'Build beautiful, performant mobile experiences for Airbnb\'s 150M+ users. Work on the core booking flow, search experience, and host tools across iOS and Android platforms.',
    aboutCompany: 'Airbnb is a community-based platform for listing, discovering, and booking unique travel experiences around the world. Over 4 million hosts have welcomed over 1.5 billion guests.',
    aboutYou: 'You love mobile development and creating polished user experiences. Experience with React Native or native iOS/Android development, and comfort with GraphQL APIs.',
    applicationUrl: 'https://airbnb.com/careers',
    matchPercent: 55,
    accentBg: '#f3e5f5',
    accentText: '#6a1b9a',
    postedAt: daysAgo(8),
  },
  {
    title: 'Full-Stack Engineer Intern',
    company: 'Vercel',
    companyWebsite: 'vercel.com/careers',
    location: 'Remote',
    type: 'Internship',
    category: 'Software Engineering',
    workplace: 'Remote',
    term: 'Fall 2026',
    tags: ['next.js', 'react', 'typescript', 'node.js', 'edge-computing'],
    shortDescription: '',
    description: 'Help build the frontend cloud. Work on Next.js framework features, Vercel platform infrastructure, or developer experience tooling used by millions of developers worldwide.',
    aboutCompany: 'Vercel created Next.js and operates the leading frontend cloud platform. Our mission is to enable developers to create at the moment of inspiration. Used by companies like Washington Post, Under Armour, and Nintendo.',
    aboutYou: 'Deep knowledge of React and the modern JavaScript ecosystem. Experience building production web applications and passion for developer tools and infrastructure.',
    applicationUrl: 'https://vercel.com/careers',
    matchPercent: 80,
    accentBg: '#ffffff',
    accentText: '#374151',
    postedAt: daysAgo(1),
  },
  {
    title: 'NLP Engineer Intern',
    company: 'OpenAI',
    companyWebsite: 'openai.com/careers',
    location: 'San Francisco, CA',
    type: 'Internship',
    category: 'Natural Language Processing',
    workplace: 'Onsite',
    term: 'Summer 2026',
    tags: ['python', 'pytorch', 'transformers', 'rlhf', 'distributed-training'],
    shortDescription: 'large language model development',
    description: 'Work on the training, evaluation, and alignment of large language models. Improve model capabilities, safety, and efficiency across a range of tasks from code generation to reasoning.',
    aboutCompany: 'OpenAI\'s mission is to ensure that artificial general intelligence benefits all of humanity. We build and deploy advanced AI systems like GPT-4, DALL·E, and ChatGPT.',
    aboutYou: 'You have strong ML fundamentals, especially in NLP and transformers. Experience with large-scale distributed training, RLHF, or language model evaluation is highly valued.',
    applicationUrl: 'https://openai.com/careers',
    matchPercent: 74,
    accentBg: '#dcf5e3',
    accentText: '#166534',
    postedAt: daysAgo(3),
  },
  {
    title: 'Security Engineer Intern',
    company: 'CrowdStrike',
    companyWebsite: 'crowdstrike.com/careers',
    location: 'Remote',
    type: 'Internship',
    category: 'Cybersecurity',
    workplace: 'Remote',
    term: 'Summer 2026',
    tags: ['python', 'c++', 'linux', 'threat-detection', 'malware-analysis', 'kernel', 'forensics'],
    shortDescription: 'endpoint security and threat intelligence',
    description: 'Protect organizations from sophisticated cyber threats. Build detection engines, analyze malware samples, and develop tools for incident response and threat hunting at global scale.',
    aboutCompany: 'CrowdStrike is a global leader in cloud-native cybersecurity, powered by the CrowdStrike Falcon platform. We stop breaches for 23,000+ customers worldwide.',
    aboutYou: 'You\'re passionate about cybersecurity with knowledge of operating system internals, networking protocols, and common attack vectors. Experience with reverse engineering is a plus.',
    applicationUrl: 'https://crowdstrike.com/careers',
    matchPercent: 52,
    accentBg: '#fff3e0',
    accentText: '#e65100',
    postedAt: daysAgo(6),
  },
  {
    title: 'Systems Engineer Intern',
    company: 'Apple',
    companyWebsite: 'apple.com/careers',
    location: 'Cupertino, CA',
    type: 'Internship',
    category: 'Systems Engineering',
    workplace: 'Onsite',
    term: 'Summer 2026',
    tags: ['c', 'c++', 'swift', 'operating-systems', 'performance'],
    shortDescription: '',
    description: 'Work on the low-level systems that power Apple products. Optimize kernel performance, build driver frameworks, and contribute to the OS stack that runs on billions of devices.',
    aboutCompany: 'Apple revolutionized personal technology with the introduction of the Macintosh in 1984. Today, Apple leads the world in innovation with products like iPhone, iPad, Mac, and Apple Watch.',
    aboutYou: 'Strong C/C++ skills, knowledge of operating systems, and interest in low-level systems programming. Understanding of CPU architectures, memory management, and performance optimization.',
    applicationUrl: 'https://apple.com/careers',
    matchPercent: 60,
    accentBg: '#fce4ec',
    accentText: '#880e4f',
    postedAt: daysAgo(4),
  },
  {
    title: 'Product Manager Intern',
    company: 'Notion',
    companyWebsite: 'notion.so/careers',
    location: 'San Francisco, CA',
    type: 'Internship',
    category: 'Product Management',
    workplace: 'Hybrid',
    term: 'Fall 2026',
    tags: ['product-strategy', 'user-research', 'analytics', 'sql', 'figma'],
    shortDescription: '',
    description: 'Define and drive the product roadmap for Notion features used by millions. Conduct user research, analyze data, and work cross-functionally with engineering, design, and marketing teams.',
    aboutCompany: 'Notion is the connected workspace where better, faster work happens. We\'re building tools that blend notes, docs, wikis, project management, and AI into one unified platform.',
    aboutYou: 'You think deeply about user problems and communicate solutions clearly. Analytical mindset with SQL proficiency, and the ability to balance user needs, business goals, and technical constraints.',
    applicationUrl: 'https://notion.so/careers',
    matchPercent: 45,
    accentBg: '#ffffff',
    accentText: '#374151',
    postedAt: daysAgo(3),
  },
];

async function seedJobsInternal() {
  await Job.deleteMany({});
  const jobsWithAccents = SEED_DATA.map(job => {
    const accent = getRandomAccent();
    return {
      ...job,
      accentBg: accent.bg,
      accentText: accent.text
    };
  });
  return Job.insertMany(jobsWithAccents);
}

export const getJobs = async (req, res) => {
  try {
    let jobs = await Job.find().sort({ postedAt: -1 });

    // Auto-seed if empty
    if (jobs.length === 0) {
      await seedJobsInternal();
      jobs = await Job.find().sort({ postedAt: -1 });
    }

    return res.json({ jobs, total: jobs.length });
  } catch (err) {
    console.error('Get jobs error:', err);
    return res.status(500).json({ error: err.message });
  }
};

export const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    return res.json({ job });
  } catch (err) {
    console.error('Get job error:', err);
    return res.status(500).json({ error: err.message });
  }
};

export const seedJobs = async (req, res) => {
  try {
    const jobs = await seedJobsInternal();
    return res.json({ message: `Seeded ${jobs.length} jobs`, count: jobs.length });
  } catch (err) {
    console.error('Seed jobs error:', err);
    return res.status(500).json({ error: err.message });
  }
};

export const createCustomJob = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    let domain = '';
    try {
      domain = new URL(url).hostname;
    } catch (e) {
      domain = url;
    }

    const accent = getRandomAccent();

    const customJob = await Job.create({
      title: 'Custom Application',
      company: domain,
      companyWebsite: domain,
      location: 'Custom',
      type: 'Full-time',
      category: 'Custom',
      workplace: 'Remote',
      term: 'Custom',
      tags: [],
      shortDescription: 'Custom URL submission',
      description: 'Applying to a custom URL via Fillica AI Engine.',
      aboutCompany: '',
      aboutYou: '',
      applicationUrl: url,
      matchPercent: 100,
      accentBg: accent.bg,
      accentText: accent.text,
      postedAt: new Date()
    });

    return res.status(201).json({ job: customJob });
  } catch (err) {
    console.error('Create custom job error:', err);
    return res.status(500).json({ error: err.message });
  }
};

export const toggleAppliedStatus = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    job.applied = !job.applied;
    await job.save();

    return res.json({ success: true, applied: job.applied });
  } catch (err) {
    console.error('Toggle applied status error:', err);
    return res.status(500).json({ error: err.message });
  }
};

export const setAppliedStatus = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    if (typeof req.body.applied !== 'boolean') {
      return res.status(400).json({ error: 'Boolean applied status is required' });
    }

    job.applied = req.body.applied;
    await job.save();

    return res.json({ success: true, applied: job.applied });
  } catch (err) {
    console.error('Set applied status error:', err);
    return res.status(500).json({ error: err.message });
  }
};
