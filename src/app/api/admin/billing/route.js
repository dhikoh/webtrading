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

    const hasAccess = await checkPermission(authUser.role, 'BILLING', 'VIEW');
    if (!hasAccess && authUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const invoices = await prisma.billingInvoice.findMany({
      include: {
        tenant: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { priceMonthly: 'asc' }
    });

    return NextResponse.json({
      success: true,
      invoices,
      plans
    });
  } catch (error) {
    console.error('Fetch billing invoices API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await checkPermission(authUser.role, 'BILLING', 'MODIFY');
    if (!hasAccess && authUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { action, tenantId, planName, pricePaid, billingStatus, monthsToAdd } = body;

    if (!action || !tenantId) {
      return NextResponse.json({ error: 'Missing parameter action or tenant ID' }, { status: 400 });
    }

    switch (action) {
      case 'MANUAL_ACTIVATE':
      case 'MANUAL_RENEWAL':
        if (!planName) {
          return NextResponse.json({ error: 'Plan name is required for activation' }, { status: 400 });
        }

        let plan = await prisma.subscriptionPlan.findUnique({
          where: { name: planName }
        });

        if (!plan) {
          // Seed standard package defaults automatically
          const limits = {
            FREE: { maxDailyScan: 5, maxActiveSignals: 3, maxUsers: 1, maxStorage: 10.0, aiUsageLimit: 5, priceMonthly: 0.0 },
            STARTER: { maxDailyScan: 30, maxActiveSignals: 10, maxUsers: 3, maxStorage: 50.0, aiUsageLimit: 50, priceMonthly: 29.0 },
            PRO: { maxDailyScan: 200, maxActiveSignals: 50, maxUsers: 10, maxStorage: 200.0, aiUsageLimit: 500, priceMonthly: 99.0 },
            ENTERPRISE: { maxDailyScan: 10000, maxActiveSignals: 500, maxUsers: 100, maxStorage: 2000.0, aiUsageLimit: 99999, priceMonthly: 499.0 }
          };
          const pDefault = limits[planName] || limits.FREE;
          plan = await prisma.subscriptionPlan.create({
            data: {
              name: planName,
              ...pDefault
            }
          });
        }

        const months = monthsToAdd || 1;
        const targetEndDate = new Date();
        targetEndDate.setMonth(targetEndDate.getMonth() + months);

        await prisma.$transaction(async (tx) => {
          // 1. Create or Update Tenant Subscription
          const currentSub = await tx.tenantSubscription.findFirst({
            where: { tenantId, status: 'ACTIVE' }
          });

          if (currentSub) {
            await tx.tenantSubscription.update({
              where: { id: currentSub.id },
              data: { status: 'EXPIRED' }
            });
          }

          await tx.tenantSubscription.create({
            data: {
              tenantId,
              planId: plan.id,
              status: 'ACTIVE',
              startDate: new Date(),
              endDate: targetEndDate,
              manualNotes: `Activated manually by Admin ${authUser.username}`
            }
          });

          // 2. Log manual invoice ledger
          const invNumber = `INV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
          await tx.billingInvoice.create({
            data: {
              tenantId,
              invoiceNumber: invNumber,
              amount: pricePaid || plan.priceMonthly,
              planName,
              status: billingStatus || 'ACTIVE',
              paymentMethod: 'MANUAL_ADMIN'
            }
          });
        });
        break;

      case 'RECORD_REFUND':
        const invNumber = `REF-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
        await prisma.billingInvoice.create({
          data: {
            tenantId,
            invoiceNumber: invNumber,
            amount: -(pricePaid || 0),
            planName: planName || 'REFUND',
            status: 'SUSPENDED',
            paymentMethod: 'REFUND_REVERSAL'
          }
        });
        break;

      default:
        return NextResponse.json({ error: 'Unsupported billing action' }, { status: 400 });
    }

    // Record dynamic audit log
    await prisma.auditLog.create({
      data: {
        userId: authUser.userId,
        action: `BILLING_${action}`,
        details: `Billing action: ${action} processed for tenant ${tenantId} by ${authUser.username}`
      }
    });

    return NextResponse.json({ success: true, message: `Successfully registered billing ledger: ${action}` });
  } catch (error) {
    console.error('Update billing ledger API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
