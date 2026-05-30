import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser } from '@/utils/auth';

const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export async function GET(req) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Get Circuit Breaker / Data Source Reliability states
    const circuitBreakers = await prisma.dataSourceReliability.findMany({
      orderBy: { sourceName: 'asc' }
    });

    // 2. Get active strategy version and its details
    const activeStrategy = await prisma.strategyVersion.findFirst({
      where: { isActive: true },
      include: {
        strategy: true,
        validationReports: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    // 3. Get Confidence Calibration Bins (Prisma Model)
    const calibrationBins = await prisma.confidenceCalibration.findMany({
      orderBy: { confidenceMin: 'asc' }
    });

    // 4. Get Confidence Bucket Stats
    const confidenceBucketStats = await prisma.confidenceBucketStats.findMany({
      orderBy: { bucketRange: 'asc' }
    });

    // 5. Get recent Risk Decision Logs
    const riskDecisions = await prisma.riskDecisionLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        analysis: true
      }
    });

    // 6. Get Portfolio State
    const portfolioState = await prisma.portfolioState.findUnique({
      where: { userId: authUser.userId }
    });

    return NextResponse.json({
      success: true,
      data: {
        circuitBreakers,
        activeStrategy,
        calibrationBins,
        confidenceBucketStats,
        riskDecisions,
        portfolioState
      }
    });
  } catch (error) {
    console.error("Governance GET error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, strategyId, deploymentMode, status, sourceName, circuitState } = body;

    // Handle updates to strategy settings or circuit breaker resets
    if (action === 'UPDATE_STRATEGY_MODE') {
      if (!strategyId || !deploymentMode) {
        return NextResponse.json({ error: 'Missing strategyId or deploymentMode' }, { status: 400 });
      }
      const updated = await prisma.strategyVersion.update({
        where: { id: strategyId },
        data: { deploymentMode }
      });
      return NextResponse.json({ success: true, updated });
    }

    if (action === 'UPDATE_STRATEGY_STATUS') {
      if (!strategyId || !status) {
        return NextResponse.json({ error: 'Missing strategyId or status' }, { status: 400 });
      }
      const updated = await prisma.strategyVersion.update({
        where: { id: strategyId },
        data: { status }
      });
      return NextResponse.json({ success: true, updated });
    }

    if (action === 'RESET_CIRCUIT') {
      if (!sourceName) {
        return NextResponse.json({ error: 'Missing sourceName' }, { status: 400 });
      }
      const updated = await prisma.dataSourceReliability.update({
        where: { sourceName },
        data: {
          currentState: 'HEALTHY',
          consecutiveFailures: 0,
          consecutiveSuccesses: 10,
          failureQueries: 0
        }
      });

      // Log the reset
      await prisma.auditLog.create({
        data: {
          userId: authUser.userId,
          action: 'RESET_CIRCUIT_BREAKER',
          details: `Manual reset of circuit breaker for source ${sourceName} to HEALTHY`
        }
      });

      return NextResponse.json({ success: true, updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error("Governance POST error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
