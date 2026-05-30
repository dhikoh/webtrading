let cachedSpotInfo = null;
let cachedFuturesInfo = null;
let lastCacheTime = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

// Fetch Spot symbols info via Bybit V5
export const fetchSpotExchangeInfo = async () => {
  const now = Date.now();
  if (cachedSpotInfo && (now - lastCacheTime < CACHE_TTL)) {
    return cachedSpotInfo;
  }

  try {
    const res = await fetch('https://api.bybit.com/v5/market/instruments-info?category=spot');
    if (!res.ok) throw new Error('Failed to fetch Bybit Spot exchange info');
    const data = await res.json();

    if (data.retCode !== 0 || !data.result || !data.result.list) {
      throw new Error(`Bybit returned error: ${data.retMsg}`);
    }

    // Map into simplified records
    const symbols = data.result.list
      .filter(s => s.status === 'Trading')
      .map(s => {
        const pricePrecision = parseInt(s.priceFilter?.tickSize ? Math.max(0, Math.round(-Math.log10(parseFloat(s.priceFilter.tickSize)))) : '2');
        const qtyPrecision = parseInt(s.lotSizeFilter?.basePrecision ? Math.max(0, Math.round(-Math.log10(parseFloat(s.lotSizeFilter.basePrecision)))) : '4');

        return {
          symbol: s.symbol,
          baseAsset: s.baseCoin,
          quoteAsset: s.quoteCoin,
          status: 'TRADING',
          pricePrecision,
          qtyPrecision,
          tickSize: parseFloat(s.priceFilter?.tickSize || '0.01'),
          stepSize: parseFloat(s.lotSizeFilter?.basePrecision || '0.00001')
        };
      });

    cachedSpotInfo = symbols;
    lastCacheTime = now;
    return symbols;
  } catch (error) {
    console.error('Error fetching Spot ExchangeInfo via Bybit:', error.message);
    return cachedSpotInfo || [];
  }
};

// Fetch Futures symbols info via Bybit V5
export const fetchFuturesExchangeInfo = async () => {
  const now = Date.now();
  if (cachedFuturesInfo && (now - lastCacheTime < CACHE_TTL)) {
    return cachedFuturesInfo;
  }

  try {
    const res = await fetch('https://api.bybit.com/v5/market/instruments-info?category=linear');
    if (!res.ok) throw new Error('Failed to fetch Bybit Futures exchange info');
    const data = await res.json();

    if (data.retCode !== 0 || !data.result || !data.result.list) {
      throw new Error(`Bybit returned error: ${data.retMsg}`);
    }

    // Map into simplified records
    const symbols = data.result.list
      .filter(s => s.status === 'Trading' && s.quoteCoin === 'USDT') // Linear USDT Perpetual Contracts
      .map(s => {
        const pricePrecision = parseInt(s.priceFilter?.tickSize ? Math.max(0, Math.round(-Math.log10(parseFloat(s.priceFilter.tickSize)))) : '2');
        const qtyPrecision = parseInt(s.lotSizeFilter?.qtyStep ? Math.max(0, Math.round(-Math.log10(parseFloat(s.lotSizeFilter.qtyStep)))) : '3');

        return {
          symbol: s.symbol,
          baseAsset: s.baseCoin,
          quoteAsset: s.quoteCoin,
          status: 'TRADING',
          pricePrecision,
          qtyPrecision,
          tickSize: parseFloat(s.priceFilter?.tickSize || '0.1'),
          stepSize: parseFloat(s.lotSizeFilter?.qtyStep || '0.001')
        };
      });

    cachedFuturesInfo = symbols;
    lastCacheTime = now;
    return symbols;
  } catch (error) {
    console.error('Error fetching Futures ExchangeInfo via Bybit:', error.message);
    return cachedFuturesInfo || [];
  }
};
