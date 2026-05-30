import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser } from '@/utils/auth';

const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export async function PUT(req, { params }) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser || authUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    
    // Prevent self modification
    if (authUser.userId === id) {
      return NextResponse.json({ error: 'Cannot modify your own user account status' }, { status: 400 });
    }

    const body = await req.json();
    const { role, status } = body;

    const updateData = {};
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        role: true,
        status: true
      }
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: authUser.userId,
        action: 'MANAGE_USER',
        details: `Updated user ${updatedUser.username} status to ${updatedUser.status} and role to ${updatedUser.role}`
      }
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Admin user PUT error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
