import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from backend
dotenv.config({ path: path.join(__dirname, '../.env') });

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
  postedAt: { type: Date, default: Date.now },
}, { timestamps: true });

const Job = mongoose.model('Job', jobSchema);

const jobs1 = [
  {
    "title": "Enterprise Customer Success Manager - India",
    "company": "Plotline",
    "companyWebsite": "https://plotline.so",
    "location": "Bengaluru, India",
    "type": "Full-time",
    "category": "Customer Success",
    "workplace": "Onsite",
    "term": "Permanent",
    "tags": ["Customer Success", "Enterprise", "SaaS", "AI", "India", "Revenue Management", "Customer Advocacy"],
    "shortDescription": "Manage $1.5M+ in ARR while driving expansion across our high-value Indian customer portfolio.",
    "description": "Join our AI platform as an Enterprise Customer Success Manager focused on our high-value Indian customer portfolio. You'll be responsible for managing $1.5M+ in ARR while driving expansion, retention, and customer advocacy across our fastest-growing market. You'll work closely with technical teams, C-level executives, and cross-functional stakeholders to ensure maximum value realization from our platform while identifying opportunities for growth and expansion.",
    "aboutCompany": "Plotline is an enterprise-grade app personalization platform serving apps like Dream11, Zepto, and Upstox globally.",
    "applicationUrl": "https://jobs.ashbyhq.com/plotlineso/bc770c1a-c38e-43f0-bdc6-c68cfb537c08/application",
    "postedAt": "2026-04-20T10:00:00.000Z"
  },
  {
    "title": "Software Engineer (Node.Js)",
    "company": "Leapwork",
    "companyWebsite": "https://leapwork.com",
    "location": "Delhi/NCR, India",
    "type": "Full-time",
    "category": "Software Engineering",
    "workplace": "Remote",
    "term": "Permanent",
    "tags": ["Node.js", "TypeScript", "Backend", "AI APIs", "Agile", "API Design", "Serverless"],
    "shortDescription": "Build backend services and APIs using Node.js and TypeScript.",
    "description": "As a Software Engineer, you will work in a fast-paced, team-oriented environment using Agile methodologies. You will build backend services and APIs using Node.js and TypeScript, and work closely with product teams to rapidly prototype and develop new product capabilities. You will also build or integrate AI-driven product features, including systems powered by AI agents.",
    "aboutCompany": "Leapwork is a global visual test automation platform.",
    "applicationUrl": "https://boards.greenhouse.io/leapwork/jobs/4825987101#app",
    "postedAt": "2026-04-21T09:30:00.000Z"
  },
  {
    "title": "Software Engineer, AI Agents",
    "company": "Cloudflare",
    "companyWebsite": "https://cloudflare.com",
    "location": "Bangalore, India",
    "type": "Full-time",
    "category": "Software Engineering",
    "workplace": "Onsite",
    "term": "Permanent",
    "tags": ["TypeScript", "Rust", "LLMs", "Distributed Systems", "Edge Computing", "Workers", "Infrastructure", "Observability"],
    "shortDescription": "Build AI directly into an edge platform that runs in 300+ cities worldwide.",
    "description": "As one of the early engineers in our India based AI team, you'll have visibility, leadership opportunities, and a direct hand in shaping Cloudflare's AI roadmap. You will create evals, guardrails, and audits, build agents that summarize, propose fixes, and escalate cleanly to humans, and design robust observability for distributed AI workflows.",
    "aboutCompany": "Cloudflare is a global network designed to make everything you connect to the Internet secure, private, fast, and reliable.",
    "applicationUrl": "https://boards.greenhouse.io/cloudflare/jobs/7831810#app",
    "postedAt": "2026-04-22T11:00:00.000Z"
  },
  {
    "title": "Staff Software Engineer",
    "company": "6sense",
    "companyWebsite": "https://6sense.com",
    "location": "India",
    "type": "Full-time",
    "category": "Software Engineering",
    "workplace": "Remote",
    "term": "Permanent",
    "tags": ["TypeScript", "GoLang", "Java", "Platform Engineering", "Distributed Systems", "B2B", "API Architecture"],
    "shortDescription": "Lead the design and evolution of our platform and framework ecosystem.",
    "description": "We are seeking a highly experienced Staff Software Engineer to lead the design and evolution of our platform and framework ecosystem. You will lead the design and development of scalable and resilient Frameworks that empower scalable customer-facing APIs, and champion best practices in software engineering across teams.",
    "aboutCompany": "6sense is a B2B predictive intelligence engine.",
    "applicationUrl": "https://boards.greenhouse.io/6sense/jobs/7100430#app",
    "postedAt": "2026-04-18T14:15:00.000Z"
  },
  {
    "title": "Software Engineer 2 - Backend",
    "company": "Abnormal Security",
    "companyWebsite": "https://abnormalsecurity.com",
    "location": "Bangalore, India",
    "type": "Full-time",
    "category": "Software Engineering",
    "workplace": "Hybrid",
    "term": "Permanent",
    "tags": ["Backend", "Python", "Go", "Cybersecurity", "Data Processing", "Anomaly Detection", "Scalability"],
    "shortDescription": "Build backend architecture for behavioral event security products.",
    "description": "Join the Behavioral Event Security Products team as a Backend Engineer. You will be responsible for building highly available distributed services that process massive scales of data to detect anomalies and protect against advanced cyber threats.",
    "aboutCompany": "Abnormal Security provides an AI-native cloud email security platform.",
    "applicationUrl": "https://abnormal.ai/careers/jobs/7548468003#app",
    "postedAt": "2026-04-23T08:45:00.000Z"
  },
  {
    "title": "Software Engineer, Back Office Systems",
    "company": "Point72",
    "companyWebsite": "https://point72.com",
    "location": "Bengaluru, India",
    "type": "Full-time",
    "category": "Software Engineering",
    "workplace": "Onsite",
    "term": "Permanent",
    "tags": [".NET", "SQL", "Angular", "React", "FinTech", "Trade Processing", "Microservices"],
    "shortDescription": "Support trade processing, position keeping, and prime broker integrations.",
    "description": "You will work with world class engineers, developing high-capacity integrations and development capabilities with in-house and vendor built applications. Responsibilities include building software applications and delivering software enhancements supporting fund accounting and trade processing technology.",
    "aboutCompany": "Point72 is a global asset management firm led by Steven A. Cohen.",
    "applicationUrl": "https://boards.greenhouse.io/point72/jobs/8372908002#app",
    "postedAt": "2026-04-19T13:00:00.000Z"
  },
  {
    "title": "Staff Software Engineer",
    "company": "Prophecy",
    "companyWebsite": "https://prophecy.io",
    "location": "India",
    "type": "Full-time",
    "category": "Software Engineering",
    "workplace": "Remote",
    "term": "Permanent",
    "tags": ["Scala", "Spark", "Data Engineering", "Backend", "Big Data", "Data Lakes", "Functional Programming"],
    "shortDescription": "Drive next-generation revolution in Data Engineering.",
    "description": "This is an amazing opportunity to be an early engineer in a high-growth startup starting in Prophecy's India engineering center. You will design, code, test, and launch a new set of features for Prophecy IDE, applying your expertise in Scala and Spark internals.",
    "aboutCompany": "Prophecy is the leader in AI-native data preparation and analysis.",
    "applicationUrl": "https://boards.greenhouse.io/prophecysimpledatalabs/jobs/5118369007#app",
    "postedAt": "2026-04-15T09:00:00.000Z"
  },
  {
    "title": "Senior Software Engineer in Test",
    "company": "Litmos",
    "companyWebsite": "https://litmos.com",
    "location": "India",
    "type": "Full-time",
    "category": "Quality Assurance",
    "workplace": "Remote",
    "term": "Permanent",
    "tags": ["Playwright", "Azure DevOps", "CI/CD", "QA", "Automation", "Testing Strategy", "Quality Assurance"],
    "shortDescription": "Own automated test execution and quality strategy.",
    "description": "You will work as part of a globally distributed Agile team, partnering closely with engineering and product, with ownership of test automation, quality strategy, and deployment validation. Design and build scalable test automation frameworks (Playwright) across UI, API, and integration layers.",
    "aboutCompany": "Litmos develops eLearning solutions for top-performing companies.",
    "applicationUrl": "https://boards.greenhouse.io/litmos/jobs/4837331101#app",
    "postedAt": "2026-04-24T10:30:00.000Z"
  },
  {
    "title": "Software Engineer, Fullstack",
    "company": "Ambient.ai",
    "companyWebsite": "https://ambient.ai",
    "location": "Bengaluru, India",
    "type": "Full-time",
    "category": "Software Engineering",
    "workplace": "Onsite",
    "term": "Permanent",
    "tags": ["Python", "Django", "React", "Kafka", "Physical Security", "Scalable Systems", "Computer Vision"],
    "shortDescription": "Contribute majorly to core platform and security engineering.",
    "description": "We are bootstrapping our India Technology Engineering division. You will contribute majorly to our core platform and security engineering of Ambient.ai, developing large-scale platform problems and owning small-to-medium platform features end-to-end.",
    "aboutCompany": "Ambient.ai is the category creator and leader in Agentic Physical Security.",
    "applicationUrl": "https://jobs.ashbyhq.com/ambient.ai/9c28dbdd-14eb-40c5-a4ef-8d23a65c53b7/application",
    "postedAt": "2026-04-22T08:00:00.000Z"
  },
  {
    "title": "Software Engineer, EHR Platform & Data",
    "company": "Commure",
    "companyWebsite": "https://commure.com",
    "location": "Gurugram, India",
    "type": "Full-time",
    "category": "Software Engineering",
    "workplace": "Onsite",
    "term": "Permanent",
    "tags": ["GCP", "AWS", "Kubernetes", "Backend", "HealthTech", "EHR", "Data Migration"],
    "shortDescription": "Help build our cutting-edge Electronic Health Record (EHR) platform.",
    "description": "Commure is seeking a back-end engineer to help build our cutting-edge Electronic Health Record (EHR) platform from the ground up. Drive end-to-end execution of complex data migrations to launch clients while minimizing downtime and ensuring integrity.",
    "aboutCompany": "Commure powers the future of healthcare with an AI-powered operations platform.",
    "applicationUrl": "https://jobs.ashbyhq.com/Commure/aff8345e-e6c8-4710-b822-8bb1039a9b90/application",
    "postedAt": "2026-04-21T15:45:00.000Z"
  },
  {
    "title": "Backend Software Engineer - India",
    "company": "Reacher",
    "companyWebsite": "https://reacher.com",
    "location": "Remote, India",
    "type": "Full-time",
    "category": "Software Engineering",
    "workplace": "Remote",
    "term": "Permanent",
    "tags": ["Backend", "AI Tools", "System Architecture", "Claude Code", "Agentic Coding", "YC Startup"],
    "shortDescription": "Build the operating system for TikTok Shop brands using agentic coding tools.",
    "description": "Our engineering team uses Claude Code and agentic coding tools as our primary development environment. You have deep understanding of modern coding tools and are proficient with various modes (Interactive, Plan, Headless). You will direct AI to build while you architect, review, and verify.",
    "aboutCompany": "Reacher is a YC backed AI SaaS platform building the operating system for TikTok Shop brands.",
    "applicationUrl": "https://jobs.ashbyhq.com/reacher/86a866da-dc3b-4d5d-ba94-599b642904ec/application",
    "postedAt": "2026-04-25T07:15:00.000Z"
  },
  {
    "title": "Senior Software Engineer",
    "company": "Summation",
    "companyWebsite": "https://summation.com",
    "location": "India",
    "type": "Full-time",
    "category": "Software Engineering",
    "workplace": "Remote",
    "term": "Permanent",
    "tags": ["SQL", "Data Modeling", "Financial Software", "Analytics", "Business Intelligence", "Automation"],
    "shortDescription": "Build the future of business planning and analytics.",
    "description": "You will be a key contributor to the development of our business planning and analytics platform. Design and implement innovative software solutions that simplify and automate business planning. Tackle complex challenges involving data processing and financial modeling.",
    "aboutCompany": "Summation empowers organizations to transform complex data into actionable business insights.",
    "applicationUrl": "https://jobs.ashbyhq.com/summation/766c0ce5-01fa-4879-8fb1-c5e04afda0ab/application",
    "postedAt": "2026-04-23T12:30:00.000Z"
  },
  {
    "title": "QA Software Engineer 790",
    "company": "Protegrity",
    "companyWebsite": "https://protegrity.com",
    "location": "Navi Mumbai, India",
    "type": "Full-time",
    "category": "Quality Assurance",
    "workplace": "Hybrid",
    "term": "Permanent",
    "tags": ["Kubernetes", "Docker", "Python", "QA", "Cloud Testing", "Automation", "Containerization"],
    "shortDescription": "Ensure robust quality for Protegrity's cloud applications.",
    "description": "You will be responsible for quality assurance in a hybrid environment, ensuring cloud applications are thoroughly tested. You will leverage Python and Bash programming, utilizing your experience in Kubernetes and Docker technologies to maintain application integrity.",
    "aboutCompany": "Protegrity provides data security solutions for enterprise protection.",
    "applicationUrl": "https://jobs.ashbyhq.com/protegrity/5e495bfe-ff98-49a9-8d94-dc287b7ace16/application",
    "postedAt": "2026-04-14T09:00:00.000Z"
  },
  {
    "title": "Software Engineer, Platform",
    "company": "Cartesia",
    "companyWebsite": "https://cartesia.ai",
    "location": "Bangalore, India",
    "type": "Full-time",
    "category": "Software Engineering",
    "workplace": "Remote",
    "term": "Permanent",
    "tags": ["Go", "Python", "Distributed Systems", "ML Platform", "MLOps", "Model Training", "Data Infrastructure"],
    "shortDescription": "Build highly parallel data processing infrastructure for foundation models.",
    "description": "Build highly parallel, high quality data processing and evaluation infrastructure for foundation model training. You're comfortable diving into new technologies and can quickly adapt your skills to our tech stack (Go and Python on the backend). Experience building large-scale distributed systems.",
    "aboutCompany": "Cartesia is an AI research company pioneering State Space Models (SSMs).",
    "applicationUrl": "https://jobs.ashbyhq.com/cartesia/9d9c6cc0-218c-4fd4-a478-3e4b37de1d76/application",
    "postedAt": "2026-04-20T16:00:00.000Z"
  },
  {
    "title": "Software Engineer, AI Applications",
    "company": "Ema",
    "companyWebsite": "https://ema.co",
    "location": "Bengaluru, India",
    "type": "Full-time",
    "category": "Software Engineering",
    "workplace": "Onsite",
    "term": "Permanent",
    "tags": ["Applied AI", "Integrations", "Enterprise Backend", "Customer Value", "AI Operating System", "Forward Deployed"],
    "shortDescription": "Build agentic AI operating systems for enterprise customers.",
    "description": "Customer Value Engineering is Ema's forward-deployed engineering group. You will implement integrations with enterprise systems (CRM, ticketing, internal APIs), debug production issues across the stack, and run evaluations using golden datasets.",
    "aboutCompany": "Ema is building the agentic AI operating system for enterprises.",
    "applicationUrl": "https://jobs.ashbyhq.com/ema/d2f5e7c4-04cd-496a-9b06-8f1ee08da954/application",
    "postedAt": "2026-04-22T14:30:00.000Z"
  },
  {
    "title": "Forward Deployed Software Engineer",
    "company": "Sarvam AI",
    "companyWebsite": "https://sarvam.ai",
    "location": "Bengaluru, India",
    "type": "Full-time",
    "category": "Software Engineering",
    "workplace": "Onsite",
    "term": "Permanent",
    "tags": ["Conversational AI", "Deployment", "Architecture", "Voice AI", "LLM Application", "WhatsApp Integration"],
    "shortDescription": "Build, deploy, and evaluate conversational AI agents across various channels.",
    "description": "Build, deploy, monitor, and evaluate conversational AI agents across channels — Voice, WhatsApp, website, and in-app — integrating them deeply into client systems. Scope and design end-to-end technical solutions for client requirements, translating business needs into clean architectures.",
    "aboutCompany": "Sarvam is building India's full-stack sovereign AI platform.",
    "applicationUrl": "https://jobs.ashbyhq.com/sarvam/ac2b835e-375c-48d8-a174-8c2935f408b2/application",
    "postedAt": "2026-04-24T11:20:00.000Z"
  }
];

const jobs2 = [
  {
    "title": "Software Engineer - Fresher (2026/2027 Batch)",
    "company": "Stadium",
    "companyWebsite": "https://www.bystadium.com",
    "location": "India",
    "type": "Full-time",
    "category": "Software Engineering",
    "workplace": "Remote",
    "term": "Permanent",
    "tags": ["Ruby on Rails", "Python", "Go", "JavaScript", "NodeJS", "Fresher", "Fullstack", "Agile Development"],
    "shortDescription": "Ideal role for freshers looking for exposure to real-world product development.",
    "description": "As a fresher joining our Web Development or QA teams, you will work on real, globally used products, learn from experienced engineers, and grow in an environment that values ownership. You will contribute to feature development across frontend, backend, or QA automation tracks, and strengthen your fundamentals in algorithms and core programming.",
    "aboutCompany": "Stadium helps businesses build automated gifting, swag, and reward experiences globally.",
    "applicationUrl": "https://apply.workable.com/bystadium/j/F92DE7EF78/apply/",
    "postedAt": "2026-04-23T00:00:00.000Z"
  },
  {
    "title": "Backend Developer",
    "company": "LiftOff Software India",
    "companyWebsite": "https://liftoff.llc",
    "location": "Bengaluru, India",
    "type": "Full-time",
    "category": "Software Engineering",
    "workplace": "Hybrid",
    "term": "Permanent",
    "tags": ["NodeJS", "Microservices", "RESTful", "GraphQL", "NestJS", "SaaS", "NestJS", "Startup"],
    "shortDescription": "Work alongside founders and engineers to build SaaS products from the ground up.",
    "description": "As a NodeJS Developer, you will work directly with our founders and alongside our engineers on a variety of software projects. Candidates with 3 to 5 years of experience with NodeJS who have experience in building products from the ground up and are comfortable with microservice architectures will thrive here.",
    "aboutCompany": "LiftOff specializes in product creation and helping businesses and entrepreneurs launch digital products.",
    "applicationUrl": "https://apply.workable.com/liftoff-software-india/j/E8C33A57CE/apply/",
    "postedAt": "2026-03-25T00:00:00.000Z"
  },
  {
    "title": "SDET Intern",
    "company": "Prophecy",
    "companyWebsite": "https://www.prophecy.io",
    "location": "Bengaluru, India",
    "type": "Internship",
    "category": "Quality Assurance",
    "workplace": "Hybrid",
    "term": "Contract",
    "tags": ["Automation", "Testing", "Data Engineering", "Internship", "QA Automation", "India Team"],
    "shortDescription": "Join the India engineering team as a Software Development Engineer in Test Intern.",
    "description": "We are looking for an enthusiastic SDET Intern to join our India engineering team. You will be responsible for helping test next-generation data engineering tools and building out automated testing suites to ensure product reliability.",
    "aboutCompany": "Prophecy is the leader in AI-native data preparation and analysis.",
    "applicationUrl": "https://boards.greenhouse.io/prophecysimpledatalabs/jobs/5015372007#app",
    "postedAt": "2026-04-20T00:00:00.000Z"
  },
  {
    "title": "Senior Software Engineer (Firewall Backend)",
    "company": "SonicWall",
    "companyWebsite": "https://www.sonicwall.com",
    "location": "Pune, India",
    "type": "Full-time",
    "category": "Software Engineering",
    "workplace": "Remote",
    "term": "Permanent",
    "tags": ["Python", "Go", "REST/gRPC", "Microservices", "Cloud Security", "Cybersecurity", "Network Security", "Cloud Native"],
    "shortDescription": "Design and develop cloud-based backend services for URL filtering and security pipelines.",
    "description": "Design and develop cloud-based backend services for URL filtering, categorization, and reputation/rating using scalable content-filtering mechanisms. Build and maintain high-performance REST and gRPC APIs using Python and/or Go for integration with firewall, gateway, and cloud management systems.",
    "aboutCompany": "SonicWall provides relentless security against cyberattacks across endpoints for remote and cloud-enabled users.",
    "applicationUrl": "https://boards.greenhouse.io/sonicwall/jobs/7704920#app",
    "postedAt": "2026-04-21T00:00:00.000Z"
  },
  {
    "title": "Data QA Engineer",
    "company": "Abacus Insights",
    "companyWebsite": "https://abacusinsights.com",
    "location": "Pune, India",
    "type": "Full-time",
    "category": "Quality Assurance",
    "workplace": "Hybrid",
    "term": "Permanent",
    "tags": ["SQL", "Python", "Data Quality", "Healthcare Data", "AWS", "Data Integrity", "HealthTech", "Validation"],
    "shortDescription": "Ensure the accuracy, reliability, and compliance of healthcare data pipelines.",
    "description": "As a Data Quality Engineer, you will ensure the accuracy, reliability, and compliance of healthcare data powering our cloud-native platform. Design automated testing procedures, build data validation solutions, and collaborate with engineering and product teams to maintain high-trust datasets for health plan clients.",
    "aboutCompany": "Abacus Insights is a healthcare data integration company that helps health plans and organizations manage data securely.",
    "applicationUrl": "https://boards.greenhouse.io/abacusinsights/jobs/8506361002#app",
    "postedAt": "2026-04-24T00:00:00.000Z"
  },
  {
    "title": "Principal Engineer",
    "company": "Litmos",
    "companyWebsite": "https://www.litmos.com",
    "location": "Pune, India",
    "type": "Full-time",
    "category": "Software Engineering",
    "workplace": "Hybrid",
    "term": "Permanent",
    "tags": ["C#", "React", "SQL Server", "Azure", "Microservices", "Architectural Leadership", "Pune", "Scrum"],
    "shortDescription": "Serve as a senior technical leader partnering with Agile teams to raise the architectural bar.",
    "description": "Serve as a senior technical leader within our Pune office. You will work across multiple Agile teams (Scrum and ShapeUp), partnering with Technical Owners to ensure consistent, high-quality delivery across the platform. This role is both hands-on and advisory.",
    "aboutCompany": "Litmos develops eLearning solutions and easy-to-use LMS platforms for top-performing companies globally.",
    "applicationUrl": "https://boards.greenhouse.io/litmos/jobs/4847537101#app",
    "postedAt": "2026-04-22T00:00:00.000Z"
  },
  {
    "title": "Database Cloud Support Engineer",
    "company": "SingleStore",
    "companyWebsite": "https://www.singlestore.com",
    "location": "Hyderabad, India",
    "type": "Full-time",
    "category": "Support Engineering",
    "workplace": "Hybrid",
    "term": "Permanent",
    "tags": ["SQL Optimization", "Linux", "Kubernetes", "Python/Bash", "Distributed Systems", "Database Internals", "Support Engineering", "High Performance"],
    "shortDescription": "Delve into database internals and memory allocators to resolve complex technical issues.",
    "description": "This Support Engineering role skews far more towards engineering than typical technical support. You will delve into database internals, investigate Linux host configurations, and diagnose SQL query behavior. Requires experience with advanced SQL query optimization and distributed systems.",
    "aboutCompany": "SingleStore empowers organizations to build and scale cutting-edge AI applications on a unified real-time data platform.",
    "applicationUrl": "https://boards.greenhouse.io/singlestore/jobs/7844366#app",
    "postedAt": "2026-04-23T00:00:00.000Z"
  },
  {
    "title": "Software Engineer",
    "company": "Navtech",
    "companyWebsite": "https://navtech.io",
    "location": "India",
    "type": "Full-time",
    "category": "Software Engineering",
    "workplace": "Remote",
    "term": "Permanent",
    "tags": ["Angular", "Django", "Flask", "MongoDB", "MySQL", "Offshore", "Full SDLC", "Database Integration"],
    "shortDescription": "Write reusable, efficient code while participating in full SDLC.",
    "description": "Write reusable, testable, and efficient code. Participate in full development lifecycle: concept, design, build, deploy, test and release. Integrate user-facing elements with server-side logic and connect data storage solutions like MongoDB and MySQL.",
    "aboutCompany": "Navtech is an offshore software engineering services company based in India.",
    "applicationUrl": "https://apply.workable.com/navtech/j/A847CBFDF4/apply/",
    "postedAt": "2026-04-18T00:00:00.000Z"
  },
  {
    "title": "Senior Software Engineer",
    "company": "NICE",
    "companyWebsite": "https://www.nice.com",
    "location": "Pune, India",
    "type": "Full-time",
    "category": "Software Engineering",
    "workplace": "Hybrid",
    "term": "Permanent",
    "tags": ["PL/SQL", "SQL", "Unix", "Python", "Actimize", "Risk Management", "Compliance", "Financial Institutions"],
    "shortDescription": "Design, configure, and enhance enterprise-scale Actimize solutions.",
    "description": "Work on designing, developing, configuring, and enhancing enterprise-scale Actimize solutions for leading financial institutions. Collaborate with architects, business analysts, and clients to deliver solutions that safeguard against risk and compliance challenges.",
    "aboutCompany": "NICE is a global enterprise software company specializing in customer relations and compliance analytics.",
    "applicationUrl": "https://boards.greenhouse.io/nice/jobs/4842983101#app",
    "postedAt": "2026-04-24T00:00:00.000Z"
  },
  {
    "title": "Professional Services Engineer, Actimize",
    "company": "NICE",
    "companyWebsite": "https://www.nice.com",
    "location": "Pune, India",
    "type": "Full-time",
    "category": "Software Engineering",
    "workplace": "Hybrid",
    "term": "Permanent",
    "tags": ["SQL", "Java", "Linux", "Docker", "AWS", "Cloud Deployment", "Consulting", "Enterprise Solutions"],
    "shortDescription": "Implement and support cloud-based financial crime and compliance solutions.",
    "description": "This role is focused on implementing, customizing, supporting, and deploying cloud-based NICE Actimize solutions for global financial services customers. You will analyze customer requirements, build components using SQL and Java, and support enterprise deployments.",
    "aboutCompany": "NICE is a global enterprise software company specializing in customer relations and compliance analytics.",
    "applicationUrl": "https://boards.greenhouse.io/nice/jobs/4847634101#app",
    "postedAt": "2026-04-24T00:00:00.000Z"
  },
  {
    "title": "Software Engineer (AI & Full Stack)",
    "company": "NICE",
    "companyWebsite": "https://www.nice.com",
    "location": "Pune, India",
    "type": "Full-time",
    "category": "Software Engineering",
    "workplace": "Hybrid",
    "term": "Permanent",
    "tags": ["Java", "Python", "GenAI", "React", "Kubernetes", "LLM", "Surveillance", "Rapid Prototyping"],
    "shortDescription": "Contribute to Surveillance domain products using Java/Python and GenAI.",
    "description": "We are looking for a passionate Full Stack (Java + AI or Python + AI) Engineer. You will leverage Generative AI models (GPT, Claude, Llama) to rapidly develop high quality code, prototypes, and automation scripts while taking ownership of complex backend modules.",
    "aboutCompany": "NICE is a global enterprise software company specializing in customer relations and compliance analytics.",
    "applicationUrl": "https://boards.greenhouse.io/nice/jobs/4833247101#app",
    "postedAt": "2026-04-24T00:00:00.000Z"
  },
  {
    "title": "DevOps Engineer",
    "company": "NICE",
    "companyWebsite": "https://www.nice.com",
    "location": "Pune, India",
    "type": "Full-time",
    "category": "DevOps",
    "workplace": "Hybrid",
    "term": "Permanent",
    "tags": ["AWS", "Azure", "Terraform", "FinOps", "GitOps", "Cloud Infrastructure", "FinOps", "Multi-Cloud"],
    "shortDescription": "Drive operational excellence, cloud security, and automation in multi-cloud infra.",
    "description": "Manage and improve our multi-cloud infrastructure (AWS & Azure), lead IAM and account creation processes, enforce FinOps practices, and support development teams through Git-based workflows and robust CI/CD environments.",
    "aboutCompany": "NICE is a global enterprise software company specializing in customer relations and compliance analytics.",
    "applicationUrl": "https://boards.greenhouse.io/nice/jobs/4832325101#app",
    "postedAt": "2026-04-24T00:00:00.000Z"
  },
  {
    "title": "Senior DevOps Engineer, CX",
    "company": "NICE",
    "companyWebsite": "https://www.nice.com",
    "location": "Pune, India",
    "type": "Full-time",
    "category": "DevOps",
    "workplace": "Hybrid",
    "term": "Permanent",
    "tags": ["AWS", "EKS", "Terraform", "Jenkins", "AI Tools", "Reliability", "Infrastructure as Code", "Copilot"],
    "shortDescription": "Automate processes and improve the reliability of pipelines and production systems.",
    "description": "Actively seek out toil, eliminate it, and continuously improve the reliability of pipelines. Manage highly available AWS infrastructure using Terraform. Experience with EKS clusters, Jenkins, GitHub Actions, and an openness to leveraging AI tools like Copilot for infrastructure automation.",
    "aboutCompany": "NICE is a global enterprise software company specializing in customer relations and compliance analytics.",
    "applicationUrl": "https://boards.greenhouse.io/nice/jobs/4846239101#app",
    "postedAt": "2026-04-24T00:00:00.000Z"
  }
];

const allJobs = [...jobs1, ...jobs2];

const main = async () => {
  try {
    const mongoUrl = process.env.MONGO_URL;
    if (!mongoUrl) throw new Error('MONGO_URL not found');
    await mongoose.connect(mongoUrl);
    console.log('Connected to DB');

    // Delete existing
    await Job.deleteMany({});
    console.log('Deleted existing jobs');

    // Insert new
    await Job.insertMany(allJobs);
    console.log(`Inserted ${allJobs.length} jobs successfully.`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

main();
