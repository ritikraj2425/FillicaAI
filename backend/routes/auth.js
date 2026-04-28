import express from 'express';
import passport from 'passport';
import Profile from '../models/profile.js';
import { generateDeepLinkToken } from '../utils/deepLink.js';

const router = express.Router();

// Start Google OAuth login
router.get(
  '/google',
  (req, res, next) => {
    // Store the original app source in session
    if (req.query.app_source) {
      req.session.appSource = req.query.app_source;
    }
    next();
  },
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=auth_failed`,
  }),
  (req, res) => {
    const appSource = req.session.appSource;

    if (appSource === 'electron') {
      // Generate a JWT token for the electron app
      const token = generateDeepLinkToken(req.user);

      // Redirect to the deep link with token
      const deepLinkUrl = `fillica://login-success?token=${encodeURIComponent(token)}&user=${encodeURIComponent(
        JSON.stringify({
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
        })
      )}`;

      res.redirect(deepLinkUrl);
    } else {
      // Normal web redirect
      res.redirect(process.env.FRONTEND_URL || 'http://localhost:3000');
    }
  }
);

// Get current authenticated user
router.get('/me', async (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
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
