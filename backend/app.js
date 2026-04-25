import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';

import connectDB from './config/db.js';
import configurePassport from './config/passport.js';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import jobRoutes from './routes/jobs.js';
import { setupAutomationSocket, getAutomationHistory, getAutomationRun } from './routes/automation.js';
import { isAuthenticated } from './middleware/auth.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 3001;

// --- CORS ---
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(
  cors({
    origin: frontendUrl,
    credentials: true,
  })
);

// --- Body parsing ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Session ---
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'job-automation-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URL,
      collectionName: 'sessions',
    }),
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

// --- Routes ---
app.get('/', (req, res) => {
  res.json({ message: `Fillica AI Backend running on port ${port}` });
});

app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);
app.use('/jobs', jobRoutes);

// --- Automation REST routes ---
app.get('/automation/history', isAuthenticated, getAutomationHistory);
app.get('/automation/run/:id', isAuthenticated, getAutomationRun);

// --- Error handler ---
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// --- Socket.IO ---
const io = new SocketIO(httpServer, {
  cors: {
    origin: frontendUrl,
    credentials: true,
  },
});
setupAutomationSocket(io);

// --- Start ---
connectDB().then(() => {
  // Only start listening if NOT on Vercel
  if (process.env.VERCEL !== '1') {
    httpServer.listen(port, () => {
      console.log(`Server running on: http://localhost:${port}`);
      console.log(`Frontend URL: ${frontendUrl}`);
      console.log(`Socket.IO ready`);
    });
  } else {
    console.log('Running in Vercel environment - skipping httpServer.listen()');
  }
}).catch((err) => {
  console.error('Failed to start server:', err);
  if (process.env.VERCEL !== '1') process.exit(1);
});

export default app;
