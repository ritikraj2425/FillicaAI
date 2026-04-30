import express from 'express';
import passport from 'passport';
import Profile from '../models/profile.js';
import { generateDeepLinkToken } from '../utils/deepLink.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

// Start Google OAuth login
router.get(
  '/google',
  (req, res, next) => {
    let state = 'web';
    if (req.query.app_source === 'electron') {
      state = `electron:${req.query.local_port}`;
    }
    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      state: state
    })(req, res, next);
  }
);

// Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=auth_failed`,
  }),
  (req, res) => {
    const state = req.query.state || '';

    if (state.startsWith('electron:')) {
      const port = state.split(':')[1];
      
      // Generate a JWT token for the electron app
      const token = generateDeepLinkToken(req.user);

      const userStr = encodeURIComponent(
        JSON.stringify({
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
        })
      );
      
      const localUrl = `http://127.0.0.1:${port}/login-success?token=${encodeURIComponent(token)}&user=${userStr}`;

      // Redirect directly to the local HTTP server running inside Electron
      res.redirect(localUrl);
    } else {
      // Normal web redirect
      res.redirect(process.env.FRONTEND_URL || 'http://localhost:3000');
    }
  }
);

// Get current authenticated user
router.get('/me', isAuthenticated, async (req, res) => {
  if (req.user) {
    try {
      const profile = await Profile.findOne({ userId: req.user._id });
      return res.json({
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          avatar: req.user.avatar,
          hasProfile: !!profile,
        },
      });
    } catch (err) {
      console.error('Error fetching profile in /me:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
  return res.status(401).json({ error: 'Not authenticated' });
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Session destroy failed' });
      }
      res.clearCookie('connect.sid');
      return res.json({ message: 'Logged out successfully' });
    });
  });
});

export default router;
