import jwt from 'jsonwebtoken';

/**
 * Generate a short-lived JWT token for deep link authentication
 */
export function generateDeepLinkToken(user) {
  const token = jwt.sign(
    {
      id: user._id,
      email: user.email,
      name: user.name,
    },
    process.env.JWT_SECRET || 'your-secret-key',
    {
      expiresIn: '15m', // Token expires in 15 minutes
    }
  );

  return token;
}

/**
 * Verify and decode deep link token
 */
export function verifyDeepLinkToken(token) {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    );
    return decoded;
  } catch (err) {
    return null;
  }
}
