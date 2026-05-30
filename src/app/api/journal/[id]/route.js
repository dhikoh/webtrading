import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser } from '@/utils/auth';
import { processTradeOutcome } from '@/utils/calibrationFeedback';

const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export async function PUT(req, { params }) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const { exitPrice, profitLoss, outcomeStatus, notes } = body;

    const existingLog = await prisma.tradeJournal.findFirst({
      where: { id, userId: authUser.userId }
    });

    if (!existingLog) {
      return NextResponse.json({ error: 'Log entry not found' }, { status: 404 });
    }

    const updateData = {};
    if (exitPrice !== undefined) updateData.exitPrice = parseFloat(exitPrice);
    if (profitLoss !== undefined) updateData.profitLoss = parseFloat(profitLoss);
    if (outcomeStatus !== undefined) updateData.outcomeStatus = outcomeStatus;
    if (notes !== undefined) updateData.notes = notes;

    // Check difference in PnL if updated
    let pnlDiff = 0;
    if (profitLoss !== undefined) {
      pnlDiff = parseFloat(profitLoss) - (existingLog.profitLoss || 0);
    }

    const updatedLog = await prisma.$transaction(async (tx) => {
      const entry = await tx.tradeJournal.update({
        where: { id },
        data: updateData
      });

      if (pnlDiff !== 0) {
        await tx.portfolioState.update({
          where: { userId: authUser.userId },
          data: {
            currentCapital: { increment: pnlDiff }
          }
        });
      }

      // Calibration Feedback Loop when status transitions to WIN or LOSS
      const statusChanged = outcomeStatus && outcomeStatus !== 'PENDING' && (existingLog.outcomeStatus === 'PENDING' || outcomeStatus !== existingLog.outcomeStatus);
      if (statusChanged) {
        await processTradeOutcome(tx, {
          userId: authUser.userId,
          asset: existingLog.asset,
          type: existingLog.type,
          entryPrice: existingLog.entryPrice,
          exitPrice: parseFloat(exitPrice !== undefined ? exitPrice : existingLog.exitPrice || 0),
          outcomeStatus: outcomeStatus,
          entryTime: existingLog.entryTime
        });
      }

      return entry;
    });

    return NextResponse.json({ success: true, log: updatedLog });
  } catch (error) {
    console.error("Journal PUT error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const existingLog = await prisma.tradeJournal.findFirst({
      where: { id, userId: authUser.userId }
    });

    if (!existingLog) {
      return NextResponse.json({ error: 'Log entry not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Deduct PnL from portfolio if it was already realized
      if (existingLog.outcomeStatus !== 'PENDING' && existingLog.profitLoss !== 0) {
        await tx.portfolioState.update({
          where: { userId: authUser.userId },
          data: {
            currentCapital: { decrement: existingLog.profitLoss }
          }
        });
      }

      await tx.tradeJournal.delete({
        where: { id }
      });
    });

    return NextResponse.json({ success: true, message: 'Log entry deleted successfully' });
  } catch (error) {
    console.error("Journal DELETE error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
