# 📋 Electron Conversion - Quick Reference Card

Print this page or keep it open while you're coding!

---

## 🚀 Quick Commands

### Development
```bash
# Start everything
npm run dev                    # Starts backend dev server & Electron app

# Start individually  
cd backend && npm run dev      # Backend only
cd frontend && npm run dev     # Frontend dev server
npm run dev                    # Electron + frontend dev

# Build
npm run build:frontend         # Static export to frontend/out/
npm run build                  # Build Electron app
```

### Distribution
```bash
npm run dist:mac              # Create .dmg for macOS
npm run dist:win              # Create .exe for Windows
npm run dist                  # Platform-specific binary
```

---

## 📂 File Structure Reference

```
Root
├─ electron/main.js           ✅ Main process (DON'T modify)
├─ electron/preload.js        ✅ IPC Security (DON'T modify)
├─ electron/playwright/
│  ├─ agent.js               📝 TODO: Update with your logic
│  ├─ ai.js                  📝 TODO: Create (copy from guide)
│  └─ forms.js               📝 TODO: Create (copy from guide)
│
├─ frontend/
│  ├─ app/login/page.tsx     📝 TODO: Add deep link OAuth
│  ├─ app/apply/[id]/page.tsx 📝 TODO: Replace Socket.IO with IPC
│  ├─ lib/playwrightClient.ts ✅ Ready (import and use)
│  └─ next.config.ts         ✅ Updated (DON'T modify)
│
├─ backend/
│  ├─ routes/auth.js         ✅ Updated (DON'T modify)
│  ├─ utils/deepLink.js      ✅ Ready (DON'T modify)
│  └─ .env                   📝 TODO: Add JWT_SECRET
```

---

## 🔐 Environment Setup

### Backend (.env)
```
MONGO_URL=your-mongo-connection
GOOGLE_CLIENT_ID=your-google-id
GOOGLE_CLIENT_SECRET=your-google-secret
BACKEND_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-very-secret-key-32-chars-minimum
SESSION_SECRET=another-secret-key
```

### Root (.env.local) - Already Created
```
REACT_APP_BACKEND_URL=http://localhost:3001
NODE_ENV=development
```

### Frontend (.env.local)
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

---

## 🎯 Implementation Steps (Copy-Paste Friendly)

### Step 1: Install Dependencies
```bash
cd /Users/amod/FillicaAI
npm install
cd backend && npm install && cd ..
cd frontend && npm ci
```

### Step 2: Add JWT Secret
```bash
# Edit backend/.env and add:
JWT_SECRET=my-super-secret-random-key-here-change-this-in-production
```

### Step 3: Create ai.js and forms.js
See: PLAYWRIGHT_MIGRATION_GUIDE.md

### Step 4: Update Login Page
See: FRONTEND_LOGIN_EXAMPLE.md

### Step 5: Update Automation Pages
See: FRONTEND_AUTOMATION_EXAMPLE.md

### Step 6: Test
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
npm run dev
```

---

## 🧪 Testing Checklist

### OAuth Flow
- [ ] Click "Log in with Google"
- [ ] Browser opens
- [ ] See Google login screen
- [ ] After login, browser redirects
- [ ] Electron captures redirect
- [ ] Logged into app
- [ ] Token in localStorage

### Playwright
- [ ] Go to job page
- [ ] Click "Start Automation"
- [ ] Playwright browser opens
- [ ] Status updates in UI
- [ ] Form gets filled
- [ ] Application submits
- [ ] See success message

### Errors
- [ ] No JWT_SECRET → Clear error
- [ ] No AI config → Clear error
- [ ] Cancel automation → Stops gracefully
- [ ] Network error → Displays message

---

## 🐛 Debugging Commands

### Check Token
```javascript
// In browser console
localStorage.getItem('authToken')    // Should show token
localStorage.getItem('userId')       // Should show user ID
```

### Check IPC Available
```javascript
// In browser console (in Electron)
window.electronAPI                   // Should show object with methods
```

### View Electron Logs
```
Press: Cmd+Option+I (Mac) or Ctrl+Shift+I (Windows)
Look for: [IPC], [Playwright], [Main]
```

### Clear Cache
```bash
rm -rf frontend/.next frontend/out dist
npm run build:frontend
```

---

## 📋 Import Patterns

### Using IPC Client in React
```tsx
import { playwrightClient } from '@/lib/playwrightClient';

// Check if in Electron
if (playwrightClient.isElectron()) {
  // Safe to use IPC
}

// Listen for events
const unsubscribe = playwrightClient.on('status', (data) => {
  console.log(data.message);
});

// Start automation
await playwrightClient.startAutomation(jobId, userId);

// Cleanup
unsubscribe();
```

### Listen for Deep Link Auth
```tsx
if (window.electronAPI) {
  window.electronAPI.onDeepLinkAuth((data) => {
    // data.token, data.user available
  });
}
```

---

## 🔗 OAuth Flow Parameters

### Web Version
```
GET /auth/google
→ Redirect to: FRONTEND_URL
```

### Electron Version
```
GET /auth/google?app_source=electron
→ Redirect to: fillica://login-success?token=JWT&user=JSON
```

---

## 📦 Production Build

### Before Building
```bash
# Make sure frontend builds
npm run build:frontend

# Check no errors
npm run build
```

### Create Installer
```bash
# Mac
npm run dist:mac

# Windows  
npm run dist:win

# Both
npm run dist
```

### Output Files
```
dist/fillica-1.0.0.dmg         # macOS installer
dist/Fillica-Setup-1.0.0.exe   # Windows installer
dist/Fillica-1.0.0-win.zip     # Windows portable
```

---

## ⚠️ Common Errors & Fixes

### Error: "Not running in Electron"
```
Fix: Make sure you ran `npm run dev`, not `npm run dev:frontend`
```

### Error: "JWT verification failed"
```
Fix: Add JWT_SECRET to backend/.env
```

### Error: "Deep link not working"
```
Fix 1: Restart backend and Electron
Fix 2: Check JWT_SECRET is different each time
Fix 3: Look at terminal for errors
```

### Error: "IPC handler not found"
```
Fix: Make sure electron/main.js has ipcMain.handle() for your command
```

### Error: "Socket not connected"
```
Fix: Switch to IPC! Socket.IO not used in Electron
     Import playwrightClient instead
```

---

## 📊 Status Message Types

Sent from electron/playwright/agent.js:

| Status | Meaning |
|--------|---------|
| `connecting` | Fetching data from backend |
| `navigating` | Opening job URL |
| `analyzing` | Analyzing form fields |
| `executing` | Filling form/clicking buttons |
| `complete` | Success! |
| `error` | Something went wrong |
| `cancelled` | User stopped it |

---

## 🆘 If Stuck

1. **Check logs:**
   - Terminal where you ran `npm run dev`
   - Electron DevTools console

2. **Search for error + "Electron"**
   - Google it first!
   - Check Electron docs

3. **Read relevant guide:**
   - Login issue → FRONTEND_LOGIN_EXAMPLE.md
   - Automation issue → FRONTEND_AUTOMATION_EXAMPLE.md
   - Playwright issue → PLAYWRIGHT_MIGRATION_GUIDE.md

4. **Check checklist:**
   - IMPLEMENTATION_CHECKLIST.md

---

## 🎯 PRO TIPS

1. **Keep DevTools Open**
   - Cmd+Option+I auto-opens in dev mode
   - Shows main process + renderer logs

2. **Use VS Code Debugger**
   - Set breakpoints  
   - Step through code

3. **Add Logging**
   ```javascript
   console.log('[MY_COMPONENT]', message);  // Easy to find
   ```

4. **Test One Feature at a Time**
   - First: OAuth login
   - Then: Automation trigger
   - Then: Full automation flow

5. **Keep Terminal Clean**
   - Restart both when confused
   - Clear cache: `rm -rf frontend/.next dist`

---

## 📞 Key Files to Reference

- `ELECTRON_SETUP_GUIDE.md` - Architecture deep dive
- `PLAYWRIGHT_MIGRATION_GUIDE.md` - Copy Playwright logic
- `FRONTEND_LOGIN_EXAMPLE.md` - Login page code
- `FRONTEND_AUTOMATION_EXAMPLE.md` - Automation page code
- `IMPLEMENTATION_CHECKLIST.md` - Step-by-step checklist

---

## ✨ Quick Win Checklist

- [ ] Installed dependencies
- [ ] Set JWT_SECRET
- [ ] Logged in via OAuth
- [ ] Started automation
- [ ] Updated one page to use IPC
- [ ] Built frontend static export
- [ ] Created .dmg or .exe

Once all checked ✅ you have a working desktop app!

---

**Last updated:** April 26, 2026  
**Version:** 1.0.0  
**Status:** 🟢 Ready to implement
