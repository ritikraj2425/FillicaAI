import { verifyDeepLinkToken } from '../utils/deepLink.js';
import User from '../models/user.js';

export const isAuthenticated = async (req, res, next) => {
  // 1. Check Passport session (cookies)
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  // 2. Check Authorization header (Bearer Token)
  const authHeader = req.headers.authorization;
  console.log(`[Auth] Path: ${req.path}, Method: ${req.method}`);
  console.log(`[Auth] Authorization Header: ${authHeader ? 'Present' : 'Missing'}`);
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    console.log(`[Auth] Token received: ${token ? token.substring(0, 10) : 'null'}...`);
    const decoded = verifyDeepLinkToken(token);
    console.log(`[Auth] Decoded: ${decoded ? 'Success (User ' + decoded.id + ')' : 'Failed'}`);

    if (decoded) {
      try {
        const user = await User.findById(decoded.id);
        if (user) {
          req.user = user;
          return next();
        }
      } catch (err) {
        console.error('Token auth error:', err);
      }
    }
  }

  return res.status(401).json({ error: 'Not authenticated. Please log in.' });
};

/**
 * Optional auth — sets req.user if logged in, but allows unauthenticated requests through.
 * Use this for endpoints that work for everyone but return extra data for logged-in users.
 */
export const optionalAuth = async (req, res, next) => {
  // 1. Check Passport session
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  // 2. Check Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const decoded = verifyDeepLinkToken(token);
    if (decoded) {
      try {
        const user = await User.findById(decoded.id);
        if (user) {
          req.user = user;
        }
      } catch (err) {
        // Silently continue without user
      }
    }
  }

  return next();
};
