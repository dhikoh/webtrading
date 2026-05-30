import { NextResponse } from 'next/server';
import { fetch24hTickerStats } from '@/utils/binance';

export async function GET() {
  try {
    const symbols = [
      'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
      'ADAUSDT', 'LINKUSDT', 'SUIUSDT', 'DOGEUSDT', 'PEPEUSDT'
    ];
    
    // Fetch stats in parallel from the server-side (which is not geoblocked in the cloud)
    const results = await Promise.all(
      symbols.map(async sym => {
        const stats = await fetch24hTickerStats(sym);
        if (stats) {
          return {
            symbol: sym,
            price: stats.lastPrice.toFixed(2),
            change: stats.priceChangePercent.toFixed(2)
          };
        }
        return null;
      })
    );

    const prices = {};
    results.forEach(r => {
      if (r) {
        prices[r.symbol] = { price: r.price, change: r.change };
      }
    });

    return NextResponse.json(prices);
  } catch (error) {
    console.error("Server-side ticker fetch error:", error);
    return NextResponse.json(
      { error: "Failed to proxy Binance prices" },
      { status: 500 }
    );
  }
}
