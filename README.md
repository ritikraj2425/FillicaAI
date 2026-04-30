<div align="center">
  <img src="landing/logo.png" alt="Fillica AI Logo" width="120" />
  <h1>Fillica AI</h1>
  <p><b>The Autonomous Agent for Job Application Automation</b></p>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-teal.svg?style=flat-square)](https://opensource.org/licenses/MIT)
  [![GitHub release](https://img.shields.io/github/v/release/ritikraj2425/FillicaAI?include_prereleases&style=flat-square)](https://github.com/ritikraj2425/FillicaAI/releases)
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)
</div>

<br />

Fillica is an open-source, desktop-native AI agent designed to completely automate the tedious process of applying for jobs. Instead of relying on fragile web extensions, Fillica uses **Playwright** to take control of a local Chromium browser instance, mapping your career history to complex ATS (Applicant Tracking System) portals with deterministic precision and neural reasoning.

---

## 📖 Table of Contents
- [How It Works](#-how-it-works)
- [System Architecture](#-system-architecture)
- [Installation & Setup](#-installation--setup)
- [Deployment Guide](#-deployment-guide)
- [Contributing](#-contributing)
- [Security & Privacy](#-security--privacy)

---

## 🌌 How It Works

Fillica completely eliminates manual data entry through a three-phase sequence:

1. **Upload Reality (Data Extraction)**
   You upload your resume once. The backend parses your PDF, extracting your entire career history, education, skills, and demographic data into a highly structured "Profile Matrix."
   
2. **Target Acquisition (Job Selection)**
   Using the Fillica desktop portal, you trigger the agent. The agent launches an isolated, visible Chromium browser and navigates directly to the target ATS portal (e.g., Rippling, Greenhouse, Workday).
   
3. **Ghost Execution (Auto-Fill & Synthesis)**
   - **Deterministic Mapping**: Standard fields (Name, Email, Phone) are populated instantly using high-speed DOM injection.
   - **Neural Reasoning**: Unmapped dropdowns, complex radio buttons, and custom questions are analyzed by an LLM in real-time, which deduces the correct answer based on your Profile Matrix.
   - **Dynamic Cover Letters**: If a cover letter is required, the agent reads the job description and synthesizes a tailored PDF document on-the-fly.

---

## 🏗 System Architecture

Fillica operates on a distributed architecture to ensure maximum performance and user privacy.

| Component | Technology | Directory | Responsibility |
|-----------|------------|-----------|----------------|
| **Core API** | Node.js, Express, MongoDB | `backend/` | Handles authentication, securely stores the Profile Matrix, and performs heavy AI resume parsing. |
| **User Interface** | Next.js, React, Tailwind | `frontend/` | The visual dashboard where users manage their data, connect ATS portals, and monitor automation runs. |
| **Desktop Agent** | Electron, Playwright | `electron/` | The local engine. It receives commands from the UI, opens the browser, and executes the automation scripts natively on the host OS. |

---

## 🚀 Installation & Setup

To run Fillica locally for development, you must start all three components.

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- A [MongoDB](https://www.mongodb.com/) Database (Atlas or local)
- API Keys for Google OAuth and AWS S3 (for resume storage).

### 1. Clone the Repository
```bash
git clone https://github.com/ritikraj2425/FillicaAI.git
cd FillicaAI
```

### 2. Configure Environment Variables
Copy the provided example file to the required locations:
```bash
# 1. Create backend configuration
cp .env.example backend/.env

# 2. Create desktop application configuration
cp .env.example .env.local
```
*Open `backend/.env` and fill in your MongoDB connection string, AWS credentials, and Google OAuth keys.*

### 3. Install Dependencies
Install packages across all workspaces:
```bash
npm install               # Root (Electron) dependencies
cd backend && npm install   # Backend dependencies
cd ../frontend && npm install # Frontend dependencies
```

### 4. Launch the Multiverse
You will need three separate terminal windows:

**Terminal 1: The Backend**
```bash
cd backend
npm run dev
```

**Terminal 2: The Frontend Dashboard**
```bash
cd frontend
npm run dev
```

**Terminal 3: The Desktop Agent**
```bash
# From the root directory
npm run dev
```
The Electron desktop application will launch, connect to your local backend, and is now ready to automate job portals!

---

## 🌍 Deployment Guide

If you wish to host your own version of Fillica or distribute it, follow these steps.

### 1. Deploying the Backend (Vercel / Render)
1. Push your code to a GitHub repository.
2. Import the repository into [Vercel](https://vercel.com/) or [Render](https://render.com/).
3. Set the **Root Directory** to `backend/`.
4. Add all your production `.env` variables to the Vercel dashboard.
5. Deploy. You will receive a production URL (e.g., `https://fillica-api.vercel.app`).

### 2. Distributing the Desktop App (GitHub Releases)
Fillica uses `electron-updater` to automatically push updates to your users.
1. Update `package.json` with your GitHub details (`owner` and `repo` under the `build.publish` section) and increment the `"version"`.
2. Build the production binaries:
   ```bash
   npm run dist:mac  # Build macOS .dmg
   npm run dist:win  # Build Windows .exe
   ```
3. Go to your GitHub repository -> **Releases** -> **Draft a new release**.
4. Upload all files generated in the `dist/` folder (including `.yml` files).
5. Publish the release. Existing users will automatically download the update in the background.

---

## 🤝 Contributing

We are actively looking for contributors to expand our ATS support matrix and improve the neural engine. Please read our comprehensive [Contributing Guide](./CONTRIBUTING.md) to get started with local development and pull requests.

## 🔒 Security & Privacy

Fillica is designed with a "Local First" automation philosophy. 
- **Browser Automation**: Unlike cloud-based tools, automation runs entirely on your local machine. Your session cookies, passwords, and browser state never leave your computer.
- **LLM Independence**: You can configure Fillica to use your own OpenAI or Anthropic API keys, ensuring you have total control over data sharing.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
