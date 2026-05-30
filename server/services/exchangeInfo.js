// Using Node's native built-in fetch API

let cachedSpotInfo = null;
let cachedFuturesInfo = null;
let lastCacheTime = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

// Fetch Spot symbols info
export const fetchSpotExchangeInfo = async () => {
  const now = Date.now();
  if (cachedSpotInfo && (now - lastCacheTime < CACHE_TTL)) {
    return cachedSpotInfo;
  }

  try {
    const res = await fetch('https://api.binance.com/api/v3/exchangeInfo');
    if (!res.ok) throw new Error('Failed to fetch Binance Spot exchange info');
    const data = await res.json();

    // Map into simplified records
    const symbols = data.symbols
      .filter(s => s.status === 'TRADING')
      .map(s => {
        const priceFilter = s.filters.find(f => f.filterType === 'PRICE_FILTER');
        const lotSize = s.filters.find(f => f.filterType === 'LOT_SIZE');

        const tickSize = priceFilter ? parseFloat(priceFilter.tickSize) : 0.00000001;
        const stepSize = lotSize ? parseFloat(lotSize.stepSize) : 0.00000001;

        // Calculate decimals precision from size (e.g. 0.01 -> 2, 0.0001 -> 4)
        const pricePrecision = Math.max(0, Math.round(-Math.log10(tickSize)));
        const qtyPrecision = Math.max(0, Math.round(-Math.log10(stepSize)));

        return {
          symbol: s.symbol,
          baseAsset: s.baseAsset,
          quoteAsset: s.quoteAsset,
          status: s.status,
          pricePrecision,
          qtyPrecision,
          tickSize,
          stepSize
        };
      });

    cachedSpotInfo = symbols;
    lastCacheTime = now;
    return symbols;
  } catch (error) {
    console.error('Error fetching Spot ExchangeInfo:', error.message);
    return cachedSpotInfo || []; // fallback to cache if available
  }
};

// Fetch Futures symbols info
export const fetchFuturesExchangeInfo = async () => {
  const now = Date.now();
  if (cachedFuturesInfo && (now - lastCacheTime < CACHE_TTL)) {
    return cachedFuturesInfo;
  }

  try {
    const res = await fetch('https://fapi.binance.com/fapi/v1/exchangeInfo');
    if (!res.ok) throw new Error('Failed to fetch Binance Futures exchange info');
    const data = await res.json();

    // Map into simplified records
    const symbols = data.symbols
      .filter(s => s.status === 'TRADING')
      .map(s => {
        const priceFilter = s.filters.find(f => f.filterType === 'PRICE_FILTER');
        const lotSize = s.filters.find(f => f.filterType === 'LOT_SIZE');

        const tickSize = priceFilter ? parseFloat(priceFilter.tickSize) : 0.00000001;
        const stepSize = lotSize ? parseFloat(lotSize.stepSize) : 0.00000001;

        const pricePrecision = Math.max(0, Math.round(-Math.log10(tickSize)));
        const qtyPrecision = Math.max(0, Math.round(-Math.log10(stepSize)));

        return {
          symbol: s.symbol,
          baseAsset: s.baseAsset,
          quoteAsset: s.quoteAsset, // should be USDT for USD-M Perpetual
          status: s.status,
          pricePrecision,
          qtyPrecision,
          tickSize,
          stepSize
        };
      });

    cachedFuturesInfo = symbols;
    lastCacheTime = now;
    return symbols;
  } catch (error) {
    console.error('Error fetching Futures ExchangeInfo:', error.message);
    return cachedFuturesInfo || [];
  }
};
