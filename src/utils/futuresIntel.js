/**
 * Futures Intelligence Engine
 * Fetches Open Interest, Funding Rate, and Long/Short Ratio from Binance Futures API.
 * Computes a Crowding Risk Score.
 */
export async function fetchFuturesIntel(symbol) {
  // Normalize symbol (e.g. BTCUSDT)
  const normSymbol = symbol.replace('/', '').replace('-', '').toUpperCase();
  
  // Default fallback data in case of network failures or rate limits
  const fallback = {
    fundingRate: 0.0001, // 0.01%
    openInterest: 1000000,
    longShortRatio: 1.0,
    crowdingRiskScore: 20,
    isFallback: true
  };

  try {
    // 1. Fetch Funding Rate and Premium Index
    const premiumRes = await fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${normSymbol}`);
    if (!premiumRes.ok) throw new Error("Failed to fetch premium index");
    const premiumData = await premiumRes.json();
    const fundingRate = parseFloat(premiumData.lastFundingRate || 0.0001);

    // 2. Fetch Open Interest
    const oiRes = await fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${normSymbol}`);
    let openInterest = fallback.openInterest;
    if (oiRes.ok) {
      const oiData = await oiRes.json();
      openInterest = parseFloat(oiData.openInterest || fallback.openInterest);
    }

    // 3. Fetch Long/Short Accounts Ratio
    const lsRes = await fetch(`https://fapi.binance.com/data/global/longShortRatio?symbol=${normSymbol}&period=5m&limit=1`);
    let longShortRatio = 1.0;
    if (lsRes.ok) {
      const lsData = await lsRes.json();
      if (Array.isArray(lsData) && lsData.length > 0) {
        longShortRatio = parseFloat(lsData[0].longShortRatio || 1.0);
      }
    }

    // Calculate Crowding Risk Score (0-100)
    // 1. Extreme funding rate (> 0.05% or < -0.05% per 8h)
    let fundingRisk = Math.min(50, Math.abs(fundingRate) * 1000 * 10); // Scale 0.0005 to 50
    
    // 2. Extreme Long/Short Ratio imbalance
    let lsRisk = 0;
    if (longShortRatio > 2.0 || longShortRatio < 0.5) {
      lsRisk = 50;
    } else {
      lsRisk = Math.abs(1.0 - longShortRatio) * 50; // Scale deviation from 1.0
    }

    const crowdingRiskScore = Math.round(Math.min(100, fundingRisk + lsRisk));

    return {
      fundingRate,
      openInterest,
      longShortRatio,
      crowdingRiskScore,
      isFallback: false
    };
  } catch (error) {
    console.error(`Error fetching Binance Futures Intel for ${normSymbol}:`, error.message);
    return fallback;
  }
}
