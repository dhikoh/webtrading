import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export async function GET(req) {
  try {
    const reliability = await prisma.dataSourceReliability.findUnique({
      where: { sourceName: 'BINANCE_API' }
    });

    if (!reliability) {
      return NextResponse.json({
        status: 'OK',
        latency: 120,
        successRatio: 100
      });
    }

    const total = reliability.totalQueries || 1;
    const failures = reliability.failureQueries || 0;
    const failureRatio = (failures / total) * 100;
    const latency = reliability.latencyMs || 100;

    let status = 'OK';
    if (latency > 1500 || failureRatio > 20) {
      status = 'DOWN';
    } else if (latency > 500 || failureRatio > 5) {
      status = 'SLOW';
    }

    return NextResponse.json({
      status,
      latency,
      successRatio: Math.round((100 - failureRatio) * 10) / 10
    });
  } catch (error) {
    console.error("Health monitor route error:", error);
    return NextResponse.json({
      status: 'DOWN',
      latency: 0,
      successRatio: 0
    });
  }
}
