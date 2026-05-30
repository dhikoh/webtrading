/**
 * Fetch historical candle data from Binance public API
 * @param {string} symbol - Ticker symbol e.g. BTCUSDT
 * @param {string} interval - Timeframe e.g. 1m, 5m, 15m, 1h, 4h, 1d
 * @param {number} limit - Number of candles (max 1000)
 */
export async function fetchBinanceCandles(symbol, interval, limit = 200) {
  const startTime = Date.now();
  const symbolUpper = symbol.toUpperCase();
  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbolUpper}&interval=${interval}&limit=${limit}`;
    const response = await fetch(url);
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
    const latency = Date.now() - startTime;
    console.error("fetchBinanceCandles error:", error);
    return {
      success: false,
      candles: [],
      latency,
      error: error.message
    };
  }
}

/**
 * Fetch current market price for a symbol
 */
export async function fetchBinancePrice(symbol) {
  const symbolUpper = symbol.toUpperCase();
  try {
    const url = `https://api.binance.com/api/v3/ticker/price?symbol=${symbolUpper}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Ticker price fetch failed");
    const data = await response.json();
    return parseFloat(data.price);
  } catch (error) {
    console.error("fetchBinancePrice error:", error);
    return null;
  }
}

/**
 * Fetch 24h ticker statistics to evaluate volatility and volume indicators
 */
export async function fetch24hTickerStats(symbol) {
  const symbolUpper = symbol.toUpperCase();
  try {
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbolUpper}`;
    const response = await fetch(url);
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
    console.error("fetch24hTickerStats error:", error);
    return null;
  }
}
