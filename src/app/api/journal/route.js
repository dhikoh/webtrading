import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser } from '@/utils/auth';
import { processTradeOutcome } from '@/utils/calibrationFeedback';

const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export async function GET(req) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const journal = await prisma.tradeJournal.findMany({
      where: { userId: authUser.userId },
      orderBy: { entryTime: 'desc' }
    });

    return NextResponse.json({ success: true, journal });
  } catch (error) {
    console.error("Journal GET error:", error);
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
    const { asset, type, entryPrice, exitPrice, positionSize, profitLoss, outcomeStatus, notes, stopLoss, takeProfit, leverage } = body;

    if (!asset || !type || !entryPrice || !positionSize) {
      return NextResponse.json({ error: 'Missing required trade parameters' }, { status: 400 });
    }

    // Convert values
    const ePrice = parseFloat(entryPrice);
    const xPrice = exitPrice ? parseFloat(exitPrice) : null;
    const pSize = parseFloat(positionSize);
    let pnl = profitLoss ? parseFloat(profitLoss) : 0;
    const sLoss = stopLoss ? parseFloat(stopLoss) : 0;
    const tProfit = takeProfit ? parseFloat(takeProfit) : 0;
    const lev = leverage ? parseInt(leverage) : 1;

    // Auto calculate PnL if not supplied but exit price is available
    if (xPrice && !profitLoss) {
      if (type === 'BUY_LONG') {
        pnl = (xPrice - ePrice) * pSize;
      } else {
        pnl = (ePrice - xPrice) * pSize;
      }
    }

    // Auto determine win/loss status
    let status = outcomeStatus || 'PENDING';
    if (xPrice && !outcomeStatus) {
      status = pnl > 0 ? 'WIN' : 'LOSS';
    }

    // 1. Create Transaction: Add journal log & Update PortfolioState balance
    const result = await prisma.$transaction(async (tx) => {
      const journalEntry = await tx.tradeJournal.create({
        data: {
          userId: authUser.userId,
          tenantId: authUser.tenantId,
          asset: asset.toUpperCase(),
          type,
          entryPrice: ePrice,
          exitPrice: xPrice,
          positionSize: pSize,
          stopLoss: sLoss,
          takeProfit: tProfit,
          leverage: lev,
          profitLoss: pnl,
          outcomeStatus: status,
          notes,
          entryTime: new Date()
        }
      });

      // Update Portfolio balance if closed
      if (status !== 'PENDING' && pnl !== 0) {
        await tx.portfolioState.update({
          where: { userId: authUser.userId },
          data: {
            currentCapital: { increment: pnl },
            activeTrades: { decrement: status !== 'PENDING' ? 0 : 1 }
          }
        });
      }

      // Calibration Feedback Loop
      if (status !== 'PENDING') {
        await processTradeOutcome(tx, {
          userId: authUser.userId,
          asset,
          type,
          entryPrice: ePrice,
          exitPrice: xPrice,
          outcomeStatus: status,
          entryTime: journalEntry.entryTime
        });
      }

      return journalEntry;
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: authUser.userId,
        action: 'ADD_JOURNAL_LOG',
        details: `Logged ${type} trade on ${asset.toUpperCase()} with PnL of $${pnl}`
      }
    });

    return NextResponse.json({ success: true, journalEntry: result });
  } catch (error) {
    console.error("Journal POST error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
