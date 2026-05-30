/**
 * Fetch historical candle data from Binance public API with high availability mirrors
 * @param {string} symbol - Ticker symbol e.g. BTCUSDT
 * @param {string} interval - Timeframe e.g. 1m, 5m, 15m, 1h, 4h, 1d
 * @param {number} limit - Number of candles (max 1000)
 */
export async function fetchBinanceCandles(symbol, interval, limit = 200) {
  const startTime = Date.now();
  const symbolUpper = symbol.toUpperCase();
  
  // Official redundant Binance API mirrors to bypass ISP throttling, cloud latency, or timeouts
  const mirrors = [
    'https://api.binance.com',
    'https://api1.binance.com',
    'https://api2.binance.com',
    'https://api3.binance.com'
  ];

  let lastError = null;

  for (let i = 0; i < mirrors.length; i++) {
    const baseUrl = mirrors[i];
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 seconds timeout per mirror

    try {
      const url = `${baseUrl}/api/v3/klines?symbol=${symbolUpper}&interval=${interval}&limit=${limit}`;
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Mirror ${baseUrl} returned: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const candles = data.map(c => ({
        time: c[0],
        open: parseFloat(c[1]),
        high: parseFloat(c[2]),
        low: parseFloat(c[3]),
        close: parseFloat(c[4]),
        volume: parseFloat(c[5])
      }));

      const latency = Date.now() - startTime;
      return {
        success: true,
        candles,
        latency,
        error: null
      };
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
      const isTimeout = err.name === 'AbortError';
      console.warn(`fetchBinanceCandles mirror failed (${baseUrl}):`, isTimeout ? "Timed out" : err.message);
    }
  }

  const totalLatency = Date.now() - startTime;
  const isTimeout = lastError?.name === 'AbortError';
  return {
    success: false,
    candles: [],
    latency: totalLatency,
    error: isTimeout 
      ? `Koneksi ke semua cermin (mirrors) Binance mengalami timeout (${totalLatency}ms)` 
      : lastError?.message || "Semua cermin Binance API gagal merespons"
  };
}

/**
 * Fetch current market price for a symbol with mirror redundancy
 */
export async function fetchBinancePrice(symbol) {
  const symbolUpper = symbol.toUpperCase();
  const mirrors = [
    'https://api.binance.com',
    'https://api1.binance.com',
    'https://api2.binance.com',
    'https://api3.binance.com'
  ];

  for (const baseUrl of mirrors) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    try {
      const url = `${baseUrl}/api/v3/ticker/price?symbol=${symbolUpper}`;
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error("Price fetch failed");
      const data = await response.json();
      return parseFloat(data.price);
    } catch (error) {
      clearTimeout(timeoutId);
      console.warn(`fetchBinancePrice mirror failed (${baseUrl}):`, error.message);
    }
  }
  return null;
}

/**
 * Fetch 24h ticker statistics with mirror redundancy
 */
export async function fetch24hTickerStats(symbol) {
  const symbolUpper = symbol.toUpperCase();
  const mirrors = [
    'https://api.binance.com',
    'https://api1.binance.com',
    'https://api2.binance.com',
    'https://api3.binance.com'
  ];

  for (const baseUrl of mirrors) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    try {
      const url = `${baseUrl}/api/v3/ticker/24hr?symbol=${symbolUpper}`;
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error("24hr ticker fetch failed");
      const data = await response.json();
      return {
        priceChange: parseFloat(data.priceChange),
        priceChangePercent: parseFloat(data.priceChangePercent),
        weightedAvgPrice: parseFloat(data.weightedAvgPrice),
        prevClosePrice: parseFloat(data.prevClosePrice),
        lastPrice: parseFloat(data.lastPrice),
        volume: parseFloat(data.volume),
        quoteVolume: parseFloat(data.quoteVolume),
        openTime: data.openTime,
        closeTime: data.closeTime
      };
    } catch (error) {
      clearTimeout(timeoutId);
      console.warn(`fetch24hTickerStats mirror failed (${baseUrl}):`, error.message);
    }
  }
  return null;
}
