import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser, hashPassword } from '@/utils/auth';
import { checkPermission } from '@/utils/rbac';

const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

// 1. GET all users for Superadmin Dashboard
export async function GET(req) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await checkPermission(authUser.role, 'USER', 'VIEW');
    if (!hasAccess && authUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        lastLogin: true,
        tenant: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error('Fetch users admin API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 2. POST to Perform Admin Actions on Users
export async function POST(req) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, targetUserId, role, name, email, password } = body;

    if (!action || !targetUserId) {
      return NextResponse.json({ error: 'Missing action or target user ID' }, { status: 400 });
    }

    // Determine permission check resource mapping
    let requiredAction = 'UPDATE';
    if (action === 'SOFT_DELETE') requiredAction = 'DELETE';
    if (action === 'SUSPEND') requiredAction = 'SUSPEND';

    const hasAccess = await checkPermission(authUser.role, 'USER', requiredAction);
    if (!hasAccess && authUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Execute user update actions
    switch (action) {
      case 'SUSPEND':
        await prisma.user.update({
          where: { id: targetUserId },
          data: { status: 'SUSPENDED' }
        });
        break;

      case 'REACTIVATE':
        await prisma.user.update({
          where: { id: targetUserId },
          data: { status: 'ACTIVE' }
        });
        break;

      case 'SOFT_DELETE':
        await prisma.user.update({
          where: { id: targetUserId },
          data: { status: 'SOFT_DELETED' }
        });
        break;

      case 'UNLOCK':
        await prisma.user.update({
          where: { id: targetUserId },
          data: { failedLoginAttempts: 0, lockedUntil: null }
        });
        break;

      case 'FORCE_RESET':
        await prisma.user.update({
          where: { id: targetUserId },
          data: { forcePasswordReset: true }
        });
        break;

      case 'RESET_PASSWORD':
        if (!password) {
          return NextResponse.json({ error: 'New password is required for reset' }, { status: 400 });
        }
        const newHash = await hashPassword(password);
        await prisma.user.update({
          where: { id: targetUserId },
          data: { 
            passwordHash: newHash, 
            forcePasswordReset: false,
            failedLoginAttempts: 0,
            lockedUntil: null
          }
        });
        break;

      case 'UPDATE_PROFILE':
        await prisma.user.update({
          where: { id: targetUserId },
          data: { name, email, role }
        });
        break;

      default:
        return NextResponse.json({ error: 'Unsupported admin action' }, { status: 400 });
    }

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: authUser.userId,
        action: `USER_${action}`,
        details: `Admin ${authUser.username} executed ${action} action on user ID: ${targetUserId}`
      }
    });

    return NextResponse.json({ success: true, message: `Successfully executed user action: ${action}` });
  } catch (error) {
    console.error('Update user admin API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
