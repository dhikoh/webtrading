import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { parse } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_jwt_secret_for_local_development_12345';

/**
 * Hash a plain text password using bcryptjs
 */
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare plain text password with hashed value
 */
export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Sign user payload into a JWT
 */
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Verify a JWT string
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Helper to retrieve user details from request headers or cookies
 */
export function getAuthUser(req) {
  try {
    // 1. Check cookies (HTTP-Only)
    const cookieHeader = req.headers.get('cookie') || '';
    const cookies = parse(cookieHeader);
    let token = cookies.auth_token;

    // 2. Fallback to Authorization Header
    if (!token) {
      const authHeader = req.headers.get('authorization') || '';
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) return null;
    return verifyToken(token);
  } catch (error) {
    console.error("Authentication extraction error:", error);
    return null;
  }
}
