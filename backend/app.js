import dotenv from 'dotenv';
dotenv.config();

import MongoStore from 'connect-mongo';
import cors from 'cors';
import express from 'express';
import session from 'express-session';
import passport from 'passport';

import connectDB from './config/db.js';
import configurePassport from './config/passport.js';
import { isAuthenticated } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import { getAutomationHistory, getAutomationRun } from './routes/automation.js';
import jobRoutes from './routes/jobs.js';
import profileRoutes from './routes/profile.js';

const app = express();
const port = process.env.PORT || 3001;

// --- CORS Configuration ---
// Allow the deployed frontend, local dev, and Electron desktop app
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000', // Local development
  'file://', // Electron desktop app
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Electron)
      if (!origin || allowedOrigins.some(allowed => origin.startsWith(allowed))) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// --- Body parsing ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Session Configuration ---
// MongoStore requires a valid URL. If missing (e.g. forgot env vars), fallback to memory to prevent crash, but log error.
const sessionStore = process.env.MONGO_URL 
  ? MongoStore.create({ mongoUrl: process.env.MONGO_URL, collectionName: 'sessions' })
  : undefined;

if (!process.env.MONGO_URL) {
  console.error('CRITICAL: MONGO_URL is missing. Sessions will not persist and app will fail.');
}

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'job-automation-secret-key',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    },
  })
);

// --- Passport ---
configurePassport();
app.use(passport.initialize());
app.use(passport.session());

// --- Connect to MongoDB ---
// Cache the promise so Vercel doesn't reconnect on every cold start
let dbReady = connectDB();

// --- Routes ---
app.get('/', (req, res) => {
  res.json({ message: 'Fillica AI Backend is running', status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);
app.use('/jobs', jobRoutes);

// --- Automation REST routes (history only — actual automation runs in Electron) ---
app.get('/automation/history', isAuthenticated, getAutomationHistory);
app.get('/automation/run/:id', isAuthenticated, getAutomationRun);

// --- Error handler ---
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// --- Start (local dev only — Vercel uses the export below) ---
if (!process.env.VERCEL) {
  dbReady.then(() => {
    app.listen(port, () => {
      console.log(`Server running on: http://localhost:${port}`);
      console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    });
  }).catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    // In serverless (Vercel), we don't want to process.exit(1) as it crashes the invocation
    if (!process.env.VERCEL) {
      process.exit(1);
    }
    throw err;
  });
}

// Vercel serverless: export the Express app as the default handler
export default app;
