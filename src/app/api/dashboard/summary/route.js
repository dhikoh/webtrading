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

    // 1. Get user details and tenant details
    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      include: { tenant: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Fetch total analyses
    const totalAnalyses = await prisma.analysis.count({
      where: { userId: authUser.userId }
    });

    // 3. Fetch signals from lifecycle
    const totalSignals = await prisma.signalLifecycle.count({
      where: {
        analysis: {
          userId: authUser.userId
        }
      }
    });

    const activeSignals = await prisma.signalLifecycle.count({
      where: {
        currentState: 'PENDING',
        analysis: {
          userId: authUser.userId
        }
      }
    });

    const wins = await prisma.signalLifecycle.count({
      where: {
        outcomeStatus: 'WIN',
        analysis: {
          userId: authUser.userId
        }
      }
    });

    const losses = await prisma.signalLifecycle.count({
      where: {
        outcomeStatus: 'LOSS',
        analysis: {
          userId: authUser.userId
        }
      }
    });

    const winRate = totalSignals > 0 ? ((wins) / (wins + losses || 1)) * 100 : 0;

    // 4. Portfolio State
    const portfolio = await prisma.portfolioState.findUnique({
      where: { userId: authUser.userId }
    });

    // 5. Calibration Stats (Expected vs. Actual win rate brackets)
    const calibration = await prisma.confidenceCalibration.findMany({
      orderBy: { confidenceMin: 'asc' }
    });

    return NextResponse.json({
      success: true,
      tenantName: user.tenant.name,
      stats: {
        totalAnalyses,
        totalSignals,
        activeSignals,
        winRate: Math.round(winRate * 10) / 10,
        wins,
        losses
      },
      portfolio: {
        capital: portfolio?.currentCapital || 10000.0,
        riskAllocated: portfolio?.allocatedRisk || 0.0,
        activeTrades: portfolio?.activeTrades || 0
      },
      calibration
    });
  } catch (error) {
    console.error("Dashboard summary API error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
