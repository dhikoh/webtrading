import { NextResponse } from 'next/server';
import { fetchBinanceCandles } from '@/utils/binance';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol') || 'BTCUSDT';
    const timeframe = searchParams.get('timeframe') || '1h';
    const limit = parseInt(searchParams.get('limit') || '50');

    const result = await fetchBinanceCandles(symbol, timeframe, limit);
    if (result.success) {
      return NextResponse.json({
        success: true,
        candles: result.candles,
        latency: result.latency
      });
    } else {
      return NextResponse.json(
        { error: result.error || "Gagal mengambil data lilin Binance" },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("Candles proxy route error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
