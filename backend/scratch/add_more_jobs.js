import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Job from '../models/job.js';
import Profile from '../models/profile.js';
import { PREMIUM_PALETTES, calculateMatch } from '../services/match.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const newJobs = [
  {
    "title": "Software Engineer Intern - Backend",
    "company": "Zepto",
    "companyWebsite": "https://www.zeptonow.com",
    "location": "Mumbai, Maharashtra, India",
    "type": "Internship",
    "category": "Software Engineering",
    "workplace": "Onsite",
    "term": "Contract",
    "tags": ["Python", "Django", "Microservices", "PostgreSQL"],
    "shortDescription": "Work on backend systems powering 10-minute grocery deliveries across India.",
    "description": "As a Backend Software Engineer Intern, you will work closely with our core engineering team to design, build, and scale microservices that handle millions of requests daily. You will help optimize our routing algorithms, manage inventory state machines, and ensure seamless API integrations. You'll gain hands-on experience writing clean, testable code in Python and deploying it in a fast-paced environment.",
    "aboutCompany": "Zepto is India's fastest growing e-grocery company, pioneering the 10-minute delivery model through optimized dark stores and hyper-local supply chains.",
    "applicationUrl": "https://boards.greenhouse.io/zepto/jobs/5123984003#app",
    "postedAt": "2026-04-20T09:00:00.000Z"
  },
  {
    "title": "Software Engineer Intern",
    "company": "WATI",
    "companyWebsite": "https://www.wati.io",
    "location": "Bengaluru, Karnataka, India",
    "type": "Internship",
    "category": "Software Engineering",
    "workplace": "Hybrid",
    "term": "Contract",
    "tags": ["Node.js", "React", "API", "WhatsApp Business"],
    "shortDescription": "Help build our core conversational commerce platform and API integrations.",
    "description": "We are looking for an enthusiastic Software Engineer Intern to join our product engineering team. You will be tasked with building out new features for our shared inbox, enhancing the WhatsApp Business API integrations, and improving platform scalability. This is an excellent opportunity to work on a product used by thousands of global brands.",
    "aboutCompany": "WATI is a comprehensive customer communication platform built on the WhatsApp Business API.",
    "applicationUrl": "https://apply.workable.com/wati-dot-i-o/j/C93F1B8A4D/apply/",
    "postedAt": "2026-04-24T14:30:00.000Z"
  },
  {
    "title": "DevOps Engineering Intern",
    "company": "Origin",
    "companyWebsite": "https://www.origin-10x.com",
    "location": "Bengaluru, Karnataka, India",
    "type": "Internship",
    "category": "DevOps",
    "workplace": "Onsite",
    "term": "Contract",
    "tags": ["Linux", "Docker", "CI/CD", "AWS", "Robotics"],
    "shortDescription": "Manage CI/CD pipelines and infrastructure for autonomous construction robots.",
    "description": "We need a DevOps Intern who wants to get their hands dirty with the infrastructure behind autonomous robots. You'll touch everything — CI/CD pipelines, Linux systems on Jetson edge devices, containers, networking, and monitoring. You will help automate build, test, and deploy workflows, directly affecting how fast we get software onto robots at real construction sites.",
    "aboutCompany": "Origin is building general-purpose autonomous robots for the construction industry to tackle safety risks and labor shortages.",
    "applicationUrl": "https://apply.workable.com/origin-10x/j/FF719A4858/apply/",
    "postedAt": "2026-04-22T10:15:00.000Z"
  },
  {
    "title": "Frontend Developer Intern",
    "company": "BrowserStack",
    "companyWebsite": "https://www.browserstack.com",
    "location": "Noida, Uttar Pradesh, India",
    "type": "Internship",
    "category": "Software Engineering",
    "workplace": "Hybrid",
    "term": "Contract",
    "tags": ["JavaScript", "React", "HTML/CSS", "Web Performance"],
    "shortDescription": "Build pixel-perfect, highly responsive user interfaces for our testing cloud.",
    "description": "Join our Frontend Engineering team as an intern and contribute to the dashboard that thousands of developers use daily. You will work on creating reusable React components, optimizing web performance, and ensuring cross-browser compatibility. Mentorship will be provided by senior engineers to help you level up your UI/UX engineering skills.",
    "aboutCompany": "BrowserStack is the industry-leading software testing platform replacing the need for teams to own and manage complex in-house test infrastructure.",
    "applicationUrl": "https://boards.greenhouse.io/browserstack/jobs/6829104002#app",
    "postedAt": "2026-04-21T08:45:00.000Z"
  },
  {
    "title": "Software Development Engineer in Test (SDET) Intern",
    "company": "Prophecy",
    "companyWebsite": "https://www.prophecy.io",
    "location": "Bengaluru, Karnataka, India",
    "type": "Internship",
    "category": "Quality Assurance",
    "workplace": "Remote",
    "term": "Contract",
    "tags": ["Automation", "Python", "Selenium", "Data Engineering"],
    "shortDescription": "Help test next-generation data engineering tools and build automated suites.",
    "description": "We are looking for an enthusiastic SDET Intern to join our India engineering team. You will be responsible for helping test next-generation data engineering tools and building out automated testing suites (API and UI) to ensure product reliability before every major release.",
    "aboutCompany": "Prophecy is the leader in AI-native data preparation and analysis for enterprise data teams.",
    "applicationUrl": "https://boards.greenhouse.io/prophecysimpledatalabs/jobs/5015372007#app",
    "postedAt": "2026-04-18T11:00:00.000Z"
  },
  {
    "title": "Data Engineering Intern",
    "company": "Atlan",
    "companyWebsite": "https://atlan.com",
    "location": "New Delhi, India",
    "type": "Internship",
    "category": "Data Engineering",
    "workplace": "Remote",
    "term": "Contract",
    "tags": ["Spark", "SQL", "Airflow", "Python"],
    "shortDescription": "Work on active metadata pipelines and big data infrastructure.",
    "description": "As a Data Engineering Intern at Atlan, you will work on ingesting, processing, and analyzing metadata from various modern data stack tools. You will assist in writing Spark jobs, managing Apache Airflow DAGs, and optimizing complex SQL queries. A passion for the modern data ecosystem is highly preferred.",
    "aboutCompany": "Atlan is an active metadata workspace for modern data teams, pioneering the concept of a collaborative data catalog.",
    "applicationUrl": "https://jobs.lever.co/atlan/c8491a1e-5d1b-42b1-9f12-9c1e18d203a1/apply",
    "postedAt": "2026-04-23T13:20:00.000Z"
  },
  {
    "title": "SDE Intern - Mobile App (React Native)",
    "company": "Postman",
    "companyWebsite": "https://www.postman.com",
    "location": "Bengaluru, Karnataka, India",
    "type": "Internship",
    "category": "Software Engineering",
    "workplace": "Hybrid",
    "term": "Contract",
    "tags": ["React Native", "Mobile", "TypeScript", "API"],
    "shortDescription": "Contribute to the Postman mobile companion app experience.",
    "description": "We are seeking a React Native intern to help improve the mobile experience for Postman users on the go. You will work on real-time API monitoring dashboards, notification systems, and offline-first mobile architecture. Experience with mobile state management and API integration is a plus.",
    "aboutCompany": "Postman is the world's leading API platform, used by more than 25 million developers to build, test, and manage APIs.",
    "applicationUrl": "https://boards.greenhouse.io/postman/jobs/5921841002#app",
    "postedAt": "2026-04-19T10:00:00.000Z"
  },
  {
    "title": "Machine Learning Intern",
    "company": "Razorpay",
    "companyWebsite": "https://razorpay.com",
    "location": "Bengaluru, Karnataka, India",
    "type": "Internship",
    "category": "Data Science & ML",
    "workplace": "Hybrid",
    "term": "Contract",
    "tags": ["Machine Learning", "Fraud Detection", "Python", "TensorFlow"],
    "shortDescription": "Build predictive models to enhance risk and fraud detection systems.",
    "description": "Join our Risk & Trust team as a Machine Learning Intern. You will analyze large volumes of transactional data to identify anomalous patterns and help deploy models that prevent fraud in real-time. You'll work with PyTorch/TensorFlow and learn how to put models into production at a massive scale.",
    "aboutCompany": "Razorpay is India's leading full-stack financial services company, helping Indian businesses with comprehensive payment and banking solutions.",
    "applicationUrl": "https://boards.greenhouse.io/razorpaysoftwareprivatelimited/jobs/4219853004#app",
    "postedAt": "2026-04-24T09:15:00.000Z"
  },
  {
    "title": "Security Engineering Intern",
    "company": "Hasura",
    "companyWebsite": "https://hasura.io",
    "location": "Bengaluru, Karnataka, India",
    "type": "Internship",
    "category": "Security Engineering",
    "workplace": "Remote",
    "term": "Contract",
    "tags": ["AppSec", "GraphQL", "Penetration Testing", "Go"],
    "shortDescription": "Identify vulnerabilities and improve the security posture of the Hasura GraphQL Engine.",
    "description": "As a Security Intern, you will work closely with our core engine team to perform code reviews, automate vulnerability scanning, and conduct penetration testing. You'll learn the intricacies of securing a high-performance GraphQL server written in Haskell and Go, and help implement advanced authorization mechanisms.",
    "aboutCompany": "Hasura is an open-source engine that connects to your databases & microservices and instantly auto-generates a production-ready GraphQL API.",
    "applicationUrl": "https://boards.greenhouse.io/hasura/jobs/6192038002#app",
    "postedAt": "2026-04-15T16:00:00.000Z"
  },
  {
    "title": "Software Engineer Intern (AI-Native)",
    "company": "Kognitos",
    "companyWebsite": "https://www.kognitos.com",
    "location": "Bengaluru, Karnataka, India",
    "type": "Internship",
    "category": "Software Engineering",
    "workplace": "Hybrid",
    "term": "Contract",
    "tags": ["AI", "LLMs", "Python", "Neurosymbolic AI"],
    "shortDescription": "Shape the future of AI-driven automation using English as code.",
    "description": "You will intern with our engineering team to help build the first hallucination-free neurosymbolic AI platform. You will experiment with LLMs, build internal automation tools, and integrate our natural language processing engine with third-party APIs. Strong foundational programming skills and a high degree of curiosity about generative AI are required.",
    "aboutCompany": "Kognitos automates business operations by turning system knowledge into documented, AI-refined automations using English as code.",
    "applicationUrl": "https://jobs.ashbyhq.com/Kognitos/8b248a1c-99f1-432a-bc9e-8c31f9d2e1b4/application",
    "postedAt": "2026-04-25T08:00:00.000Z"
  }
];

const main = async () => {
  try {
    const mongoUrl = process.env.MONGO_URL;
    await mongoose.connect(mongoUrl);
    console.log('Connected to DB');

    const profile = await Profile.findOne(); // Get first profile for initial matching

    const processedJobs = newJobs.map(job => {
      const palette = PREMIUM_PALETTES[Math.floor(Math.random() * PREMIUM_PALETTES.length)];
      return {
        ...job,
        accentBg: palette.bg,
        accentText: palette.text,
        matchPercent: profile ? calculateMatch(job, profile) : 0
      };
    });

    await Job.insertMany(processedJobs);
    console.log(`Successfully added ${processedJobs.length} more jobs.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

main();
