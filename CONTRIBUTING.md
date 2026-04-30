# Contributing to Fillica AI

First off, thank you for considering contributing to Fillica! It's people like you who make this autonomous agent more powerful, reliable, and capable of dominating the ATS multiverse.

This document serves as a comprehensive guide for contributing code, adding support for new job portals, and improving the documentation.

---

## 🚀 1. Getting Started

To contribute, you will need to set up a local development environment.

1. **Fork the Repository**: Click the "Fork" button at the top right of this page to create your own copy of the repository.
2. **Clone your Fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/FillicaAI.git
   cd FillicaAI
   ```
3. **Add Upstream Remote**: Keep your fork synced with the main project.
   ```bash
   git remote add upstream https://github.com/ritikraj2425/FillicaAI.git
   ```

---

## 🛠 2. Local Development Environment

Fillica is a monorepo consisting of three interconnected apps. You must run all three to develop and test effectively.

### A. Environment Configuration
1. Look at the `.env.example` file in the root directory.
2. Create `backend/.env` and fill it with your development database (MongoDB) and OAuth credentials.
3. Create `.env.local` in the root directory and point `REACT_APP_BACKEND_URL` to `http://localhost:3001`.

### B. Installing Dependencies
Install the packages required for the Electron wrapper, the Node.js backend, and the Next.js frontend:
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

### C. Launching the Stack
Open three separate terminal windows and run the following commands from the root of the project:

```bash
# Terminal 1: Core API
cd backend && npm run dev

# Terminal 2: UI Dashboard
cd frontend && npm run dev

# Terminal 3: Electron Agent
npm run dev
```
*If successful, the Electron app will launch on your screen, ready to accept automation commands.*

---

## 🧩 3. Project Structure & Where to Code

To keep the architecture clean, ensure your code goes into the correct sector:

- **`backend/`**: Express API, MongoDB schemas, and heavy resume parsing logic (PDF text extraction, LLM interactions for profile structuring).
- **`frontend/`**: Next.js UI components. This is strictly the visual layer where users manage their profiles.
- **`electron/`**: The core desktop app.
  - **`electron/main.js`**: IPC (Inter-Process Communication) and app lifecycle (auto-updates).
  - **`electron/playwright/`**: **This is where the magic happens.** All automation scripts, DOM selectors, and ATS navigation logic live here.

---

## 🤖 4. Adding Support for a New ATS Portal

The most common contribution is adding support for a new Applicant Tracking System (ATS).

1. Navigate to `electron/playwright/`.
2. Open `agent.js` (or create a dedicated module for the new ATS).
3. **Use Explicit Selectors**: Always prefer ID, Name, or specific ARIA attributes over generic CSS paths.
   ```javascript
   // Good
   await page.fill('input[name="applicant.first_name"]', profile.firstName);
   
   // Bad
   await page.fill('div > form > div:nth-child(2) > input', profile.firstName);
   ```
4. **Leverage the AI Fallback**: If a field is dynamic, utilize the `evaluateFieldWithAI` helper function in `ai.js` rather than writing brittle, hard-coded logic.

---

## 📮 5. Submitting a Pull Request

When you're ready to share your code:

1. **Create a Feature Branch**: Never work directly on `main`.
   ```bash
   git checkout -b feature/support-greenhouse-portal
   ```
2. **Commit your Changes**: Use clear, descriptive commit messages.
   ```bash
   git commit -m "feat(playwright): add initial support for Greenhouse ATS injection"
   ```
3. **Push and Open a PR**:
   ```bash
   git push origin feature/support-greenhouse-portal
   ```
   Go to the main repository and open a Pull Request. Provide a detailed description of what you changed, why you changed it, and how you tested it (e.g., "Tested locally against 5 different Greenhouse job postings").

---

## 🐛 6. Reporting Bugs

If you find a bug but don't have the time to fix it, please open an issue! Include:
- Your Operating System (macOS, Windows, Linux).
- The exact URL of the job application that failed.
- A screenshot of the Electron console or Playwright error if possible.

Thank you for helping us automate the mundane and push the boundaries of what local AI agents can do!
