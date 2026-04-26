<!-- # 1. Install dependencies
cd /Users/amod/FillicaAI
npm install

# 2. Add JWT_SECRET to backend/.env
echo "JWT_SECRET=your-random-secret-at-least-32-chars" >> backend/.env

# 3. Start backend (Terminal 1)
cd backend && npm run dev

# 4. Start Electron app (Terminal 2)
cd /Users/amod/FillicaAI && npm run dev

BEFORE (Your Web App)           AFTER (Desktop App)
User · Browser                  User's Computer
  ↓                               ↓
Website on server       →      Electron App
  ↓                               ├─ Next.js UI
  ↓                               ├─ IPC Communication
Playwright on server    →         └─ Local Playwright
  ↓                               ↓ (user's IP)
Website API             →      Website API
⚠️ SERVER IP BLOCKED            ✅ USER IP SUCCEEDS -->


a# Electron Desktop App Conversion - Implementation Guide

## ✅ What Has Been Set Up

You now have a complete Electron architecture ready to go. Here's what was created:

### 1. **Electron Main Process** (`electron/main.js`)
- Launches the Next.js app inside an Electron window
- Handles IPC communication between frontend and Playwright
- Sets up the `fillica://` deep link protocol for OAuth
- Manages browser lifecycle

### 2. **Preload Script** (`electron/preload.js`)
- Securely exposes IPC methods to the frontend
- Prevents XSS by using `contextIsolation: true`
- Available methods:
  - `electronAPI.startAgent(jobId, userId)` - Start Playwright automation
  - `electronAPI.cancelAgent(jobId, userId)` - Cancel automation
  - `electronAPI.submitAgent(data)` - Send user input during automation
  - `electronAPI.on*` methods for event listeners

### 3. **Playwright Runner** (`electron/playwright/agent.js`)
- Runs Playwright locally on the user's machine
- Fetches data from your cloud backend via REST API
- Handles the browser automation lifecycle
- Sends real-time status updates to the frontend via IPC

### 4. **IPC Client Utility** (`frontend/lib/playwrightClient.ts`)
- React-friendly wrapper around the Electron API
- Subscribe to events: `playwrightClient.on('status', callback)`
- Start automation: `playwrightClient.startAutomation(jobId, userId)`

### 5. **Backend Deep Link Support** (`backend/utils/deepLink.js` + modified `backend/routes/auth.js`)
- Detects when OAuth request comes from Electron (`app_source=electron`)
- Generates JWT token for the deep link
- Redirects to `fillica://login-success?token=...`

### 6. **Root Package Configuration** (`package.json` + `electron-vite.config.ts`)
- Orchestrates building both frontend and Electron app
- Scripts: `npm run dev`, `npm run build`, `npm run dist`

## 🚀 Next Steps to Make It Work

### Step 1: Install Dependencies

```bash
cd /Users/amod/FillicaAI

# Install root dependencies (Electron, electron-builder, etc.)
npm install

# Install backend dependencies (add jsonwebtoken)
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install
```

### Step 2: Add JWT_SECRET to Backend Environment

Update your backend `.env` file:

```bash
JWT_SECRET=your-very-secret-key-change-this-in-production
```

### Step 3: Modify Frontend Login Page to Use Deep Link

See `FRONTEND_LOGIN_EXAMPLE.md` for how to update your login page to:
1. Detect if running in Electron
2. Add `?app_source=electron` to OAuth URL
3. Listen for deep link auth event
4. Store token in localStorage

### Step 4: Update Your Automation Pages to Use IPC

Replace Socket.IO calls with IPC calls. See `FRONTEND_AUTOMATION_EXAMPLE.md` for examples.

### Step 5: Test Locally

```bash
# Terminal 1: Start backend (REST API only, no Socket.IO needed)
cd backend && npm run dev

# Terminal 2: Start Electron app in dev mode
npm run dev
# This will:
# 1. Start Next.js dev server on localhost:3000
# 2. Open Electron window that loads the app
# 3. Open DevTools for debugging
```

### Step 6: Test OAuth Flow

1. Click "Log in with Google" in the Electron app
2. The app should open your browser
3. After successful auth, browser redirects to `fillica://login-success?token=...`
4. Electron's deep link handler captures this
5. Sends token to frontend via IPC
6. Frontend gets logged in and shows dashboard

### Step 7: Test Playwright Automation

1. In the dashboard, click "Start Automation" for a job
2. Should start Playwright locally (you'll see a browser window open)
3. Frontend should show real-time status updates
4. On completion or error, app sends event via IPC

## 📋 Important Configuration

### .env.local (Root)
Already created. Points to your cloud backend:

```
REACT_APP_BACKEND_URL=http://localhost:3001
NODE_ENV=development
```

### Frontend Changes Made
- **next.config.ts**: Added `output: 'export'` for static build
- **New file**: `lib/playwrightClient.ts` - IPC wrapper

### Backend Changes Made
- **New file**: `utils/deepLink.js` - JWT token utilities
- **Modified**: `routes/auth.js` - Deep link redirect logic
- **Modified**: `package.json` - Added `jsonwebtoken` dependency

## 🔧 Migration Checklist

- [ ] Install all dependencies
- [ ] Add `JWT_SECRET` to backend `.env`
- [ ] Update login page to use deep link OAuth
- [ ] Replace Socket.IO calls with IPC in automation pages
- [ ] Test local development: `npm run dev`
- [ ] Test OAuth redirect flow
- [ ] Test Playwright automation via IPC
- [ ] Build frontend: `npm run build:frontend`
- [ ] Build Electron app: `npm run dist`
- [ ] Test distribution build (.dmg on Mac, .exe on Windows)

## 🔌 Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│         Electron Desktop App (User's Computer)          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Electron Main Process                           │  │
│  │  - Window management                             │  │
│  │  - IPC handlers (start/cancel/submit)           │  │
│  │  - Deep link protocol handler (fillica://)      │  │
│  │  - Playwright process spawning                   │  │
│  └──────────────────────────────────────────────────┘  │
│           │                          │                  │
│           ├─► IPC ◄──────────────────┤                  │
│           │                          │                  │
│  ┌────────▼─────────────────────────▼──────────────┐   │
│  │  Next.js Frontend (React)                       │    │
│  │  - Login page with deep link OAuth             │    │
│  │  - Dashboard                                    │    │
│  │  - Job automation UI                           │    │
│  │  - Uses playwrightClient.ts utility            │    │
│  └────────┬───────────────────────────────────────┘   │
│           │                                             │
│  ┌────────▼──────────────────────────────────────┐    │
│  │  Playwright Browser                            │    │
│  │  - Runs locally on user's IP                   │    │
│  │  - Fills forms, interacts with job apps       │    │
│  │  - AI-powered via backend API                 │    │
│  └──────────┬───────────────────────────────────┘    │
│             │ HTTPS                                    │
│             │                                          │
│             └──────────────────┐                       │
│                                │                       │
│                ┌───────────────▼─────────────────┐    │
│                │   Your Cloud Backend             │    │
│                │   - MongoDB database             │    │
│                │   - REST API endpoints           │    │
│                │   - Google OAuth handling        │    │
│                │   - OpenAI/Anthropic keys       │    │
│                │   - Job/Profile data             │    │
│                └─────────────────────────────────┘    │
│                                                       │
└─────────────────────────────────────────────────────────┘
```

## 📝 API Endpoints the Electron App Uses

The Electron app connects to your backend REST API:

### Authentication
- `GET /auth/google?app_source=electron` - Start OAuth flow
- `GET /auth/google/callback` - OAuth callback (redirects to deep link)
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout

### Data Fetching
- `GET /profile` - Get user profile
- `GET /jobs/:id` - Get job details
- `GET /jobs` - Get list of jobs
- `POST /jobs/apply` - (Optional) Mark job as applied

### Automation History
- `GET /automation/history` - Get past automation runs
- `GET /automation/run/:id` - Get specific automation run details

## 🐛 Debugging

### Browser DevTools in Electron
- Press `Cmd+Option+I` (Mac) or `Ctrl+Shift+I` (Windows) to open DevTools
- DevTools auto-open in dev mode

### Main Process Logging
- Logs appear in your terminal running `npm run dev`
- Check for "[Electron]", "[IPC]", "[Playwright]" prefixes

### Check IPC Messages
In DevTools Console:
```javascript
// Verify IPC is available
window.electronAPI // Should show object with methods

// Manual test
await window.electronAPI.startAgent("job-id", "user-id")
```

## ⚠️ Important Notes

1. **Playwright Only Runs Locally**: The Playwright browser is spawned on the user's machine, not on your server. This is the key to bypassing bot detection.

2. **No Socket.IO in Electron**: We switched from Socket.IO to IPC. Socket.IO is still available on the backend for the website, but the Electron app uses IPC for lower latency.

3. **JWT Tokens on Deep Link**: OAuth tokens are passed via deep link URL. Keep `JWT_SECRET` safe and use short-lived tokens (15 minutes).

4. **CORS Not Needed**: Electron app uses REST API without CORS restrictions (same as native app).

5. **Playwright Browser Headless**: Currently set to `headless: false` so the user can see what the automation does. You can toggle this in `electron/playwright/agent.js`.

## 📚 Next Phase: Full Automation Logic

In `electron/playwright/agent.js`, there's a TODO section where you need to:
1. Move your form-filling logic from backend
2. Integrate AI decision-making
3. Handle user interactions (CAPTCHAs, confirmations)
4. Submit applications

This is where the bulk of your business logic transfers from backend to Electron.

## 🔐 Security Best Practices

1. ✅ API keys stay on backend (not in Electron app)
2. ✅ MongoDB URI stays on backend (not in Electron app)
3. ✅ JWT tokens on deep link are short-lived (15 min)
4. ✅ IPC uses `contextIsolation: true` to prevent XSS
5. ❓ Consider signing the deep link URL with HMAC to prevent tampering

## 🎯 Final Checklist Before Production

- [ ] All Playwright logic moved from backend to Electron
- [ ] Frontend pages converted to use IPC instead of Socket.IO
- [ ] OAuth deep link flow tested end-to-end
- [ ] JWT_SECRET is strong and secure
- [ ] Build production bundles: `npm run dist`
- [ ] Signed .dmg for Mac (Apple Developer Certificate)
- [ ] Signed .exe for Windows (Windows Code Signing Certificate)
- [ ] Test on clean machines (not your dev machine)
- [ ] Create installer and test:
  - Fresh install
  - Upgrade from previous version
  - Uninstall

---

Ready to start? Follow the steps in **Step 1** above to install dependencies!
