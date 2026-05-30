import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

/**
 * Validates password strength against policy
 * Minimum 12 characters, uppercase, lowercase, number, special character
 */
export function validatePasswordStrength(password) {
  if (!password || password.length < 12) return false;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasNonalphas = /\W/.test(password);
  return hasUpperCase && hasLowerCase && hasNumbers && hasNonalphas;
}

/**
 * Validates if the new password has been used recently (last 5 passwords)
 */
export async function isPasswordReused(userId, newPassword) {
  try {
    const histories = await prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    for (const history of histories) {
      const match = await bcrypt.compare(newPassword, history.passwordHash);
      if (match) return true;
    }
    return false;
  } catch (error) {
    console.error('Password history verification failed:', error);
    return false;
  }
}

/**
 * Saves password history to prevent reuse
 */
export async function recordPasswordHistory(userId, passwordHash) {
  try {
    await prisma.passwordHistory.create({
      data: { userId, passwordHash }
    });

    // Clean up older histories past 10 entries to preserve storage space
    const count = await prisma.passwordHistory.count({ where: { userId } });
    if (count > 10) {
      const oldest = await prisma.passwordHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        take: count - 10
      });
      const ids = oldest.map(o => o.id);
      await prisma.passwordHistory.deleteMany({
        where: { id: { in: ids } }
      });
    }
  } catch (error) {
    console.error('Recording password history failed:', error);
  }
}

/**
 * Checks if user is locked out due to failed attempts
 */
export function checkAccountLockout(user) {
  if (!user.lockedUntil) return { locked: false };
  
  const now = new Date();
  if (now < new Date(user.lockedUntil)) {
    const minutesLeft = Math.ceil((new Date(user.lockedUntil) - now) / (60 * 1000));
    return { locked: true, minutesLeft };
  }
  return { locked: false };
}

/**
 * Handles failed login attempt and computes lockout time if applicable
 */
export async function handleFailedLogin(userId, currentFailedAttempts) {
  const attempts = currentFailedAttempts + 1;
  let lockedUntil = null;
  const now = new Date();

  if (attempts >= 10) {
    // 10 failed logins = 24 hours lock
    lockedUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  } else if (attempts >= 5) {
    // 5 failed logins = 15 minutes lock
    lockedUntil = new Date(now.getTime() + 15 * 60 * 1000);
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: attempts,
      lockedUntil
    }
  });

  return { attempts, lockedUntil };
}

/**
 * Reset failed attempts on success login
 */
export async function resetFailedLogin(userId) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null
    }
  });
}

/**
 * Generate a dynamic TOTP Base32 Secret Key for 2FA
 */
export function generateTOTPSecret() {
  const buffer = crypto.randomBytes(15);
  // Simple Base32 Encoder
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < buffer.length; i++) {
    secret += chars[buffer[i] % 32];
  }
  return secret;
}

/**
 * Verifies a TOTP 2FA code using HMAC-SHA1
 */
export function verifyTOTPCode(secret, code) {
  if (!secret || !code) return false;
  
  // Clean secret
  const cleanedSecret = secret.replace(/\s+/g, '').toUpperCase();
  const timeStep = 30; // 30 seconds
  const window = 1;    // Allow 1 step drift before/after

  const epoch = Math.floor(Date.now() / 1000);
  const currentStep = Math.floor(epoch / timeStep);

  // Decode Base32 to Bytes
  const key = decodeBase32(cleanedSecret);
  if (!key) return false;

  for (let i = -window; i <= window; i++) {
    const step = currentStep + i;
    // Counter is 8 bytes
    const counterBuf = Buffer.alloc(8);
    let high = Math.floor(step / 0x100000000);
    let low = step & 0xffffffff;
    counterBuf.writeUInt32BE(high, 0);
    counterBuf.writeUInt32BE(low, 4);

    const hmac = crypto.createHmac('sha1', key);
    hmac.update(counterBuf);
    const hmacResult = hmac.digest();

    const offset = hmacResult[hmacResult.length - 1] & 0xf;
    const binary = ((hmacResult[offset] & 0x7f) << 24) |
                   ((hmacResult[offset + 1] & 0xff) << 16) |
                   ((hmacResult[offset + 2] & 0xff) << 8) |
                   (hmacResult[offset + 3] & 0xff);

    const generatedCode = String(binary % 1000000).padStart(6, '0');
    if (generatedCode === code) {
      return true;
    }
  }

  return false;
}

// Helper to decode base32 to buffer
function decodeBase32(base32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleaned = base32.replace(/=+$/, '');
  const len = cleaned.length;
  const buffer = Buffer.alloc(Math.floor(len * 5 / 8));
  
  let bits = 0;
  let val = 0;
  let idx = 0;

  for (let i = 0; i < len; i++) {
    const c = cleaned[i];
    const valChar = chars.indexOf(c);
    if (valChar === -1) return null;
    
    val = (val << 5) | valChar;
    bits += 5;
    
    if (bits >= 8) {
      buffer[idx++] = (val >> (bits - 8)) & 0xff;
      bits -= 8;
    }
  }
  return buffer;
}
