let cachedSpotInfo = null;
let cachedFuturesInfo = null;
let lastSpotCacheTime = 0;
let lastFuturesCacheTime = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

// Global cache for latest Spot and Futures tickers
export const latestTickers = { spot: {}, futures: {} };

const updateTickers = async () => {
  try {
    const resSpot = await fetch('https://api.bytick.com/v5/market/tickers?category=spot');
    if (resSpot.ok) {
      const data = await resSpot.json();
      if (data.retCode === 0 && data.result && data.result.list) {
        data.result.list.forEach(t => {
          latestTickers.spot[t.symbol] = {
            lastPrice: parseFloat(t.lastPrice || '0'),
            change24h: parseFloat(t.price24hPcnt || '0') * 100,
            vol24h: t.volume24h || '---'
          };
        });
      }
    }
  } catch (err) {
    console.error('Error fetching Spot tickers cache:', err.message);
  }

  try {
    const resFutures = await fetch('https://api.bytick.com/v5/market/tickers?category=linear');
    if (resFutures.ok) {
      const data = await resFutures.json();
      if (data.retCode === 0 && data.result && data.result.list) {
        data.result.list.forEach(t => {
          latestTickers.futures[t.symbol] = {
            lastPrice: parseFloat(t.lastPrice || '0'),
            change24h: parseFloat(t.price24hPcnt || '0') * 100,
            vol24h: t.volume24h || '---'
          };
        });
      }
    }
  } catch (err) {
    console.error('Error fetching Futures tickers cache:', err.message);
  }
};

// Start periodic update of tickers every 10 seconds
setInterval(updateTickers, 10000);
// Run initial fetch on startup
updateTickers();

// Fetch Spot symbols info via Bybit V5
export const fetchSpotExchangeInfo = async () => {
  const now = Date.now();
  let symbols = cachedSpotInfo;
  if (!symbols || (now - lastSpotCacheTime >= CACHE_TTL)) {
    try {
      const res = await fetch('https://api.bytick.com/v5/market/instruments-info?category=spot');
      if (!res.ok) throw new Error('Failed to fetch Bybit Spot exchange info');
      const data = await res.json();

      if (data.retCode !== 0 || !data.result || !data.result.list) {
        throw new Error(`Bybit returned error: ${data.retMsg}`);
      }

      symbols = data.result.list
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
      lastSpotCacheTime = now;
    } catch (error) {
      console.error('Error fetching Spot ExchangeInfo via Bybit:', error.message);
      symbols = cachedSpotInfo || [];
    }
  }

  // Dynamically enrich symbols with the latest prices and volume metrics from the tickers cache
  return symbols.map(s => {
    const ticker = latestTickers.spot[s.symbol];
    return {
      ...s,
      lastPrice: ticker ? ticker.lastPrice : 0,
      change24h: ticker ? ticker.change24h : 0,
      vol24h: ticker ? ticker.vol24h : '---'
    };
  });
};

// Fetch Futures symbols info via Bybit V5
export const fetchFuturesExchangeInfo = async () => {
  const now = Date.now();
  let symbols = cachedFuturesInfo;
  if (!symbols || (now - lastFuturesCacheTime >= CACHE_TTL)) {
    try {
      const res = await fetch('https://api.bytick.com/v5/market/instruments-info?category=linear');
      if (!res.ok) throw new Error('Failed to fetch Bybit Futures exchange info');
      const data = await res.json();

      if (data.retCode !== 0 || !data.result || !data.result.list) {
        throw new Error(`Bybit returned error: ${data.retMsg}`);
      }

      symbols = data.result.list
        .filter(s => s.status === 'Trading' && s.quoteCoin === 'USDT' && s.contractType === 'LinearPerpetual') // Linear USDT Perpetual Contracts
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
      lastFuturesCacheTime = now;
    } catch (error) {
      console.error('Error fetching Futures ExchangeInfo via Bybit:', error.message);
      symbols = cachedFuturesInfo || [];
    }
  }

  // Dynamically enrich symbols with the latest prices and volume metrics from the tickers cache
  return symbols.map(s => {
    const ticker = latestTickers.futures[s.symbol];
    return {
      ...s,
      lastPrice: ticker ? ticker.lastPrice : 0,
      change24h: ticker ? ticker.change24h : 0,
      vol24h: ticker ? ticker.vol24h : '---'
    };
  });
};
