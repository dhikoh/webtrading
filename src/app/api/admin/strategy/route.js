import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser } from '@/utils/auth';

const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export async function GET(req) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser || authUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const strategy = await prisma.strategyVersion.findFirst({
      where: { isActive: true },
      include: { weights: true, parameters: true, strategy: true }
    });

    return NextResponse.json({ success: true, strategy });
  } catch (error) {
    console.error("Admin strategy GET error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser || authUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { minConfidence, minRiskReward, maxDrawdownLmt, parameters, weights } = await req.json();

    // 1. Fetch current active strategy version to increment version number
    const activeVersion = await prisma.strategyVersion.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    if (!activeVersion) {
      return NextResponse.json({ error: 'No active strategy registry found' }, { status: 404 });
    }

    // Increment version patch digit (v1.0.1 -> v1.0.2)
    const verParts = activeVersion.versionString.replace('v', '').split('.');
    const nextPatch = parseInt(verParts[2] || '0') + 1;
    const nextVersionString = `v${verParts[0]}.${verParts[1]}.${nextPatch}`;

    // 2. Write Transaction to deactivate old and insert new version
    const result = await prisma.$transaction(async (tx) => {
      // Deactivate all existing versions
      await tx.strategyVersion.updateMany({
        where: { strategyId: activeVersion.strategyId },
        data: { isActive: false }
      });

      // Create new active version with params & weights
      const newVersion = await tx.strategyVersion.create({
        data: {
          strategyId: activeVersion.strategyId,
          versionString: nextVersionString,
          isActive: true,
          minConfidence: parseInt(minConfidence),
          minRiskReward: parseFloat(minRiskReward),
          maxDrawdownLmt: parseFloat(maxDrawdownLmt),
          parameters: {
            createMany: {
              data: Object.entries(parameters).map(([key, val]) => ({
                paramKey: key,
                paramValue: String(val)
              }))
            }
          },
          weights: {
            createMany: {
              data: Object.entries(weights).map(([key, val]) => ({
                featureName: key,
                weightValue: parseFloat(val)
              }))
            }
          }
        },
        include: { weights: true, parameters: true }
      });

      return newVersion;
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: authUser.userId,
        action: 'UPDATE_STRATEGY_VERSION',
        details: `Created and activated strategy version ${nextVersionString}`
      }
    });

    return NextResponse.json({ success: true, strategy: result });
  } catch (error) {
    console.error("Admin strategy POST error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
