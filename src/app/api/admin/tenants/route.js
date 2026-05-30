import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser } from '@/utils/auth';
import { checkPermission } from '@/utils/rbac';

const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export async function GET(req) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await checkPermission(authUser.role, 'SYSTEM', 'VIEW');
    if (!hasAccess && authUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tenants = await prisma.tenant.findMany({
      include: {
        users: {
          select: { id: true }
        },
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        usageStats: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Format output with safe fallback mapping
    const formattedTenants = tenants.map(t => {
      const activeSub = t.subscriptions[0] || null;
      return {
        id: t.id,
        name: t.name,
        status: t.status,
        riskScore: t.riskScore,
        createdAt: t.createdAt,
        userCount: t.users.length,
        subscriptionPlan: activeSub ? activeSub.plan.name : 'FREE',
        subscriptionStatus: activeSub ? activeSub.status : 'EXPIRED',
        usage: t.usageStats || {
          scanVolumeCount: 0,
          ocrSpamCount: 0,
          aiUsageCount: 0,
          binanceApiCount: 0,
          storageUsed: 0.0
        }
      };
    });

    return NextResponse.json({ success: true, tenants: formattedTenants });
  } catch (error) {
    console.error('Fetch tenants admin API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await checkPermission(authUser.role, 'SYSTEM', 'MAINTENANCE');
    if (!hasAccess && authUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { action, tenantId, name } = body;

    if (!action) {
      return NextResponse.json({ error: 'Missing tenant action parameter' }, { status: 400 });
    }

    switch (action) {
      case 'CREATE':
        if (!name) {
          return NextResponse.json({ error: 'Tenant name is required' }, { status: 400 });
        }
        await prisma.$transaction(async (tx) => {
          const tenant = await tx.tenant.create({
            data: { name, status: 'ACTIVE' }
          });

          // Fetch or Seed default FREE plan
          let freePlan = await tx.subscriptionPlan.findUnique({
            where: { name: 'FREE' }
          });

          if (!freePlan) {
            freePlan = await tx.subscriptionPlan.create({
              data: {
                name: 'FREE',
                maxDailyScan: 5,
                maxActiveSignals: 3,
                maxUsers: 1,
                maxStorage: 10.0,
                aiUsageLimit: 5,
                priceMonthly: 0.0
              }
            });
          }

          // Create default active subscription
          await tx.tenantSubscription.create({
            data: {
              tenantId: tenant.id,
              planId: freePlan.id,
              status: 'ACTIVE',
              startDate: new Date(),
              endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
          });

          // Create default usages
          await tx.tenantUsageStats.create({
            data: { tenantId: tenant.id }
          });
        });
        break;

      case 'SUSPEND':
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { status: 'SUSPENDED' }
        });
        break;

      case 'REACTIVATE':
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { status: 'ACTIVE' }
        });
        break;

      case 'DELETE':
        await prisma.tenant.delete({
          where: { id: tenantId }
        });
        break;

      default:
        return NextResponse.json({ error: 'Unsupported tenant lifecycle action' }, { status: 400 });
    }

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: authUser.userId,
        action: `TENANT_${action}`,
        details: `Admin ${authUser.username} executed ${action} action on Tenant ID: ${tenantId || 'NEW'}`
      }
    });

    return NextResponse.json({ success: true, message: `Successfully executed tenant action: ${action}` });
  } catch (error) {
    console.error('Update tenant admin API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
