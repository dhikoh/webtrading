/**
 * Fetch historical candle data from Binance public API
 * @param {string} symbol - Ticker symbol e.g. BTCUSDT
 * @param {string} interval - Timeframe e.g. 1m, 5m, 15m, 1h, 4h, 1d
 * @param {number} limit - Number of candles (max 1000)
 */
export async function fetchBinanceCandles(symbol, interval, limit = 200) {
  const startTime = Date.now();
  const symbolUpper = symbol.toUpperCase();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout gate

  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbolUpper}&interval=${interval}&limit=${limit}`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    const endTime = Date.now();
    const latency = endTime - startTime;

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
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

    // Return the candles and latency details for caller logging
    return {
      success: true,
      candles,
      latency,
      error: null
    };
  } catch (error) {
    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;
    const isTimeout = error.name === 'AbortError';
    console.error("fetchBinanceCandles error:", isTimeout ? "Request timed out after 5000ms" : error.message);
    return {
      success: false,
      candles: [],
      latency,
      error: isTimeout ? "Binance API request timed out (5000ms limit reached)" : error.message
    };
  }
}

/**
 * Fetch current market price for a symbol
 */
export async function fetchBinancePrice(symbol) {
  const symbolUpper = symbol.toUpperCase();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const url = `https://api.binance.com/api/v3/ticker/price?symbol=${symbolUpper}`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error("Ticker price fetch failed");
    const data = await response.json();
    return parseFloat(data.price);
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("fetchBinancePrice error:", error.name === 'AbortError' ? "Timed out" : error.message);
    return null;
  }
}

/**
 * Fetch 24h ticker statistics to evaluate volatility and volume indicators
 */
export async function fetch24hTickerStats(symbol) {
  const symbolUpper = symbol.toUpperCase();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbolUpper}`;
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
    console.error("fetch24hTickerStats error:", error.name === 'AbortError' ? "Timed out" : error.message);
    return null;
  }
}
