import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { comparePassword, signToken } from '@/utils/auth';
import { 
  checkAccountLockout, 
  handleFailedLogin, 
  resetFailedLogin, 
  verifyTOTPCode 
} from '@/utils/security';

const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export async function POST(req) {
  try {
    const body = await req.json();
    const { usernameOrEmail, password, totpCode } = body;

    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown Browser';

    // Simple parser for userAgent
    let device = 'Desktop';
    if (/mobile/i.test(userAgent)) device = 'Mobile';
    if (/tablet/i.test(userAgent)) device = 'Tablet';

    let browser = 'Other';
    if (/chrome|crios/i.test(userAgent)) browser = 'Chrome';
    else if (/firefox|fxios/i.test(userAgent)) browser = 'Firefox';
    else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = 'Safari';

    if (!usernameOrEmail || !password) {
      return NextResponse.json(
        { error: 'Username/Email and password are required' },
        { status: 400 }
      );
    }

    // Look up user including relation for plan limits check
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: usernameOrEmail },
          { username: usernameOrEmail }
        ]
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if account status is active or soft deleted
    if (user.status === 'SOFT_DELETED') {
      return NextResponse.json(
        { error: 'Account has been deleted.' },
        { status: 403 }
      );
    }

    if (user.status === 'SUSPENDED') {
      return NextResponse.json(
        { error: 'Account is suspended. Please contact support.' },
        { status: 403 }
      );
    }

    // 1. Lockout Check
    const lockout = checkAccountLockout(user);
    if (lockout.locked) {
      // Record failed audit
      await prisma.loginHistory.create({
        data: {
          userId: user.id,
          ip,
          browser,
          device,
          status: 'LOCKED'
        }
      });
      return NextResponse.json(
        { error: `Account is locked. Please try again in ${lockout.minutesLeft} minutes.` },
        { status: 423 }
      );
    }

    // 2. Validate Password
    const passwordMatch = await comparePassword(password, user.passwordHash);
    if (!passwordMatch) {
      const lockoutState = await handleFailedLogin(user.id, user.failedLoginAttempts);
      await prisma.loginHistory.create({
        data: {
          userId: user.id,
          ip,
          browser,
          device,
          status: 'FAILED'
        }
      });
      
      let errorMsg = 'Invalid credentials';
      if (lockoutState.attempts >= 10) {
        errorMsg = 'Account locked for 24 hours due to 10 failed login attempts.';
      } else if (lockoutState.attempts >= 5) {
        errorMsg = 'Account locked for 15 minutes due to 5 failed login attempts.';
      }

      return NextResponse.json(
        { error: errorMsg },
        { status: 401 }
      );
    }

    // 3. Password Expiration check (e.g. 90 days expiry fallback)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const passwordExpired = user.passwordExpiresAt ? (new Date() > new Date(user.passwordExpiresAt)) : (new Date(user.createdAt) < ninetyDaysAgo);

    if (passwordExpired || user.forcePasswordReset) {
      return NextResponse.json({
        success: false,
        requiresPasswordChange: true,
        userId: user.id,
        message: 'Your password has expired or a reset is required. Please set a new password.'
      }, { status: 403 });
    }

    // 4. Two-Factor Authentication Check
    if (user.twoFactorEnabled) {
      if (!totpCode) {
        return NextResponse.json({
          success: false,
          requires2FA: true,
          userId: user.id,
          message: 'Two-Factor Authentication is active. Please enter your 6-digit verification code.'
        });
      }

      const totpMatch = verifyTOTPCode(user.totpSecret, totpCode);
      if (!totpMatch) {
        // Log 2FA failure
        await prisma.loginHistory.create({
          data: {
            userId: user.id,
            ip,
            browser,
            device,
            status: 'FAILED'
          }
        });
        return NextResponse.json(
          { error: 'Invalid 2FA verification code' },
          { status: 401 }
        );
      }
    }

    // Reset failed counter on success
    await resetFailedLogin(user.id);

    // Save Login History
    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        ip,
        browser,
        device,
        status: 'SUCCESS'
      }
    });

    // Save Device Tracking (Unique user, ip, device to prevent spam)
    const trackedDevice = await prisma.deviceTracking.findFirst({
      where: { userId: user.id, ip, device }
    });
    if (!trackedDevice) {
      await prisma.deviceTracking.create({
        data: {
          userId: user.id,
          ip,
          browser,
          device,
          country: 'ID' // Default country code mapping
        }
      });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Sign Token
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      tenantId: user.tenantId
    };
    const token = signToken(tokenPayload);

    // Save Session in db
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: token,
        userAgent,
        ipAddress: ip,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        details: `User ${user.username} logged in successfully from IP: ${ip}`
      }
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId
      }
    });

    response.headers.append(
      'Set-Cookie',
      `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}; ${
        process.env.NODE_ENV === 'production' ? 'Secure;' : ''
      }`
    );

    return response;
  } catch (error) {
    console.error('Enterprise Login Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
