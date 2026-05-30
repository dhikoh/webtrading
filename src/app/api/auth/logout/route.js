import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser } from '@/utils/auth';

const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export async function POST(req) {
  try {
    const authUser = getAuthUser(req);
    
    if (authUser) {
      // Clear all active sessions for this user in DB
      await prisma.session.deleteMany({
        where: { userId: authUser.userId }
      });

      // Write audit log
      await prisma.auditLog.create({
        data: {
          userId: authUser.userId,
          action: 'LOGOUT',
          details: `User ${authUser.username} logged out.`
        }
      });
    }

    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    
    // Clear Cookie
    response.headers.append(
      'Set-Cookie',
      'auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
    );

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
