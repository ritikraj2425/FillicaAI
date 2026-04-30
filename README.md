<!-- https://sponsorunited.breezy.hr/p/371371bba8a8-software-engineering-intern -->
# Fillica AI

AI-powered job application automation. Fillica fills job forms for you using your resume and profile data.

## Architecture

| Component | Location | Runs On |
|-----------|----------|---------|
| **Cloud Backend** | `backend/` | Render / Railway (cloud) |
| **Desktop App** | `electron/` + `frontend/` | User's machine (Electron) |

- **Backend** handles authentication (Google OAuth), MongoDB, S3 uploads, and resume parsing.
- **Desktop App** displays the UI and runs Playwright browser automation locally so you can watch forms being filled.

## Development

```bash
# 1. Start the backend
cd backend && npm install && npm run dev

# 2. Start the frontend (in another terminal)
cd frontend && npm install && npm run dev

# 3. (Optional) Run the Electron wrapper
cd .. && npm run dev
```

## Deployment

1. Deploy `backend/` to [Render](https://render.com) — set env vars in the dashboard
2. Package the desktop app: `npm run dist:mac` or `npm run dist:win`
