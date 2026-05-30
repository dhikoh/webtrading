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

    // Retrieve recent analyses that generated signals
    const signals = await prisma.analysis.findMany({
      where: {
        userId: authUser.userId,
        NOT: { signal: 'NO TRADE' }
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        asset: true,
        timeframe: true,
        signal: true,
        confidence: true,
        riskReward: true,
        createdAt: true
      }
    });

    return NextResponse.json({ success: true, signals });
  } catch (error) {
    console.error("Recent signals API error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
