import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = (searchParams.get('symbol') || 'BTCUSDT').toUpperCase();

    // Redundant mirror domains
    const mirrors = [
      'https://api.binance.com',
      'https://api1.binance.com',
      'https://api2.binance.com',
      'https://api3.binance.com'
    ];

    let lastError = null;
    for (const baseUrl of mirrors) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      try {
        const url = `${baseUrl}/api/v3/depth?symbol=${symbol}&limit=5`;
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          return NextResponse.json(data);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        lastError = err;
      }
    }

    return NextResponse.json(
      { error: "Failed to fetch depth from mirrors: " + (lastError?.message || "Unknown error") },
      { status: 502 }
    );
  } catch (error) {
    console.error("Depth proxy route error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
