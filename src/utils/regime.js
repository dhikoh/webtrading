/**
 * Classifies the active market regime based on ADX, ATR, and EMA.
 * Regimes:
 * - VOLATILE: High volatility, unstable price movements (ATR spike).
 * - TRENDING: Strong directional movement (ADX > 25).
 * - RANGING: Neutral consolidations (ADX between 18 and 25).
 * - DEAD_MARKET: Extremely low liquidity and narrow ranges (ADX < 18).
 */
export function classifyMarketRegime(candles, adx, atr, ema20, ema50) {
  if (candles.length < 50 || adx.length === 0 || atr.length === 0 || ema20.length === 0 || ema50.length === 0) {
    return {
      regime: 'RANGING',
      strength: 50,
      description: "Insufficient data for classification, defaulting to RANGING"
    };
  }

  const idx = candles.length - 1;
  const currentAdx = adx[idx] !== null ? adx[idx] : 20;
  const currentAtr = atr[idx] !== null ? atr[idx] : 0;
  
  // Calculate average ATR over last 20 periods to detect volatility spikes
  let atrSum = 0;
  let count = 0;
  const startAtrIdx = Math.max(0, idx - 20);
  for (let i = startAtrIdx; i < idx; i++) {
    if (atr[i] !== null) {
      atrSum += atr[i];
      count++;
    }
  }
  const avgAtr = count > 0 ? atrSum / count : currentAtr;
  const atrRatio = avgAtr > 0 ? currentAtr / avgAtr : 1.0;

  // EMA slope/direction
  const curEma20 = ema20[idx];
  const curEma50 = ema50[idx];
  const prevEma20 = ema20[idx - 5] || curEma20;
  const prevEma50 = ema50[idx - 5] || curEma50;

  const isEmaTrendingUp = curEma20 > curEma50 && prevEma20 < curEma20;
  const isEmaTrendingDown = curEma20 < curEma50 && prevEma20 > curEma20;

  let regime = 'RANGING';
  let strength = Math.round(currentAdx);
  let description = "Market is in sideways consolidation";

  // 1. Extreme Volatility Spike detection
  if (atrRatio > 1.8) {
    regime = 'VOLATILE';
    description = `Extreme volatility expansion detected (ATR is ${(atrRatio).toFixed(1)}x above average)`;
  }
  // 2. Strong Trending Market
  else if (currentAdx > 25) {
    regime = 'TRENDING';
    if (isEmaTrendingUp) {
      description = `Strong Bullish Trend (ADX: ${currentAdx.toFixed(1)})`;
    } else if (isEmaTrendingDown) {
      description = `Strong Bearish Trend (ADX: ${currentAdx.toFixed(1)})`;
    } else {
      description = `Strong Directional Trend (ADX: ${currentAdx.toFixed(1)})`;
    }
  }
  // 3. Sideways Ranging Market
  else if (currentAdx >= 18 && currentAdx <= 25) {
    regime = 'RANGING';
    description = `Sideways Ranging Market (ADX: ${currentAdx.toFixed(1)})`;
  }
  // 4. Illiquid / Dead Market
  else {
    regime = 'DEAD_MARKET';
    description = `Dead or extremely low liquidity market (ADX: ${currentAdx.toFixed(1)})`;
  }

  return {
    regime,
    strength,
    atrRatio,
    description
  };
}
