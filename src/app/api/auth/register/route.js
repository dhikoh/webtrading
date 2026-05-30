import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '@/utils/auth';

const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export async function POST(req) {
  try {
    const { name, username, email, password } = await req.json();

    if (!name || !username || !email || !password) {
      return NextResponse.json(
        { error: 'All fields (name, username, email, password) are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }]
      }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email or Username already registered' },
        { status: 400 }
      );
    }

    // 1. Hash Password
    const passwordHash = await hashPassword(password);

    // 2. Create Transaction for Tenant, User, and default Portfolio
    const result = await prisma.$transaction(async (tx) => {
      // Create isolated Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: `${username}'s Workspace`
        }
      });

      // Create Subscription (Default FREE tier)
      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          tier: 'FREE',
          status: 'ACTIVE',
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days trial
        }
      });

      // Create User linked to Tenant
      const user = await tx.user.create({
        data: {
          name,
          username,
          email,
          passwordHash,
          tenantId: tenant.id,
          role: 'MEMBER'
        }
      });

      // Initialize User PortfolioState
      await tx.portfolioState.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          currentCapital: 10000.0,
          allocatedRisk: 0.0,
          activeTrades: 0
        }
      });

      return user;
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: result.id,
        action: 'REGISTER',
        details: `Successfully registered member account for ${username}`
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Account registered successfully',
      user: {
        id: result.id,
        username: result.username,
        email: result.email,
        role: result.role
      }
    });
  } catch (error) {
    console.error('Registration Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
