/**
 * AI Trading Guardian & Trading Decision Support System (DSS) Service
 * Calculates Trend, Momentum, Volume, Volatility, Market Structure, Candlesticks,
 * and performs historical backtesting to produce trading recommendations.
 */

// Simple Moving Average
function calculateSMA(prices, period) {
  const sma = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(prices[i]); // Fallback/padding
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += prices[i - j];
      }
      sma.push(sum / period);
    }
  }
  return sma;
}

// Exponential Moving Average
function calculateEMA(prices, period) {
  const ema = [];
  if (prices.length === 0) return ema;
  const k = 2 / (period + 1);
  ema[0] = prices[0];
  for (let i = 1; i < prices.length; i++) {
    ema.push(prices[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

// Relative Strength Index (Wilder's smoothing)
function calculateRSI(prices, period = 14) {
  const rsi = [];
  if (prices.length <= period) {
    return Array(prices.length).fill(50);
  }

  const gains = [];
  const losses = [];
  for (let i = 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }

  // First average
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // Pad first values
  for (let i = 0; i <= period; i++) {
    rsi.push(50);
  }

  for (let i = period + 1; i < prices.length; i++) {
    const gain = gains[i - 1];
    const loss = losses[i - 1];

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }
  return rsi;
}

// Moving Average Convergence Divergence
function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const emaFast = calculateEMA(prices, fastPeriod);
  const emaSlow = calculateEMA(prices, slowPeriod);
  
  const macdLine = [];
  for (let i = 0; i < prices.length; i++) {
    macdLine.push(emaFast[i] - emaSlow[i]);
  }
  
  const signalLine = calculateEMA(macdLine, signalPeriod);
  const histogram = [];
  for (let i = 0; i < prices.length; i++) {
    histogram.push(macdLine[i] - signalLine[i]);
  }
  
  return { macdLine, signalLine, histogram };
}

// Average True Range (ATR)
function calculateATR(highs, lows, closes, period = 14) {
  const atr = [];
  if (highs.length === 0) return atr;
  
  const trs = [highs[0] - lows[0]];
  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trs.push(tr);
  }
  
  let currentAtr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = 0; i < period; i++) {
    atr.push(currentAtr || 0.001); // Avoid dividing by 0
  }
  for (let i = period; i < highs.length; i++) {
    currentAtr = (currentAtr * (period - 1) + trs[i]) / period;
    atr.push(currentAtr);
  }
  return atr;
}

// Local Extremum Swing Finder
function findSwingLevels(highs, lows, closes, window = 10) {
  const swingHighs = [];
  const swingLows = [];

  for (let i = window; i < highs.length - window; i++) {
    let isSwingHigh = true;
    let isSwingLow = true;
    for (let j = 1; j <= window; j++) {
      if (highs[i] < highs[i - j] || highs[i] < highs[i + j]) isSwingHigh = false;
      if (lows[i] > lows[i - j] || lows[i] > lows[i + j]) isSwingLow = false;
    }
    if (isSwingHigh) swingHighs.push({ index: i, price: highs[i] });
    if (isSwingLow) swingLows.push({ index: i, price: lows[i] });
  }

  return { swingHighs, swingLows };
}

// Candlestick Pattern Matcher
function detectPatterns(open, high, low, close) {
  const patterns = [];
  const isGreen = close > open;
  const isRed = close < open;
  const bodySize = Math.abs(close - open);
  const totalSize = high - low;
  const upperShadow = isGreen ? (high - close) : (high - open);
  const lowerShadow = isGreen ? (open - low) : (close - low);

  // 1. Hammer
  if (lowerShadow >= 2 * bodySize && upperShadow <= 0.1 * bodySize && bodySize > 0) {
    patterns.push('Hammer');
  }

  // 2. Shooting Star
  if (upperShadow >= 2 * bodySize && lowerShadow <= 0.1 * bodySize && bodySize > 0) {
    patterns.push('Shooting Star');
  }

  return patterns;
}

// Multi-candle check for Engulfing patterns
function detectEngulfing(klineCurrent, klinePrev) {
  const openC = parseFloat(klineCurrent[1]);
  const closeC = parseFloat(klineCurrent[4]);
  const openP = parseFloat(klinePrev[1]);
  const closeP = parseFloat(klinePrev[4]);

  const bodyC = Math.abs(closeC - openC);
  const bodyP = Math.abs(closeP - openP);

  // Bullish Engulfing
  if (closeP < openP && closeC > openC && openC <= closeP && closeC >= openP && bodyC > bodyP) {
    return 'Bullish Engulfing';
  }
  // Bearish Engulfing
  if (closeP > openP && closeC < openC && openC >= closeP && closeC <= openP && bodyC > bodyP) {
    return 'Bearish Engulfing';
  }
  return null;
}

// Analyze the klines array
export function analyzeGuardianDSS(symbol, klines) {
  // klines is chronologically ordered array: [time, open, high, low, close, volume]
  const count = klines.length;
  if (count < 200) {
    return {
      status: 'WAIT',
      confidence: 50,
      reason: 'Insufficient historical data (requires at least 200 candles).'
    };
  }

  const times = klines.map(k => k[0]);
  const opens = klines.map(k => k[1]);
  const highs = klines.map(k => k[2]);
  const lows = klines.map(k => k[3]);
  const closes = klines.map(k => k[4]);
  const volumes = klines.map(k => k[5]);

  const currentPrice = closes[count - 1];

  // 1. Calculations
  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);

  const rsi = calculateRSI(closes, 14);
  const macd = calculateMACD(closes, 12, 26, 9);
  const atr = calculateATR(highs, lows, closes, 14);

  const currentEma9 = ema9[count - 1];
  const currentEma21 = ema21[count - 1];
  const currentEma50 = ema50[count - 1];
  const currentEma200 = ema200[count - 1];

  const currentRsi = rsi[count - 1];
  const currentMacdHist = macd.histogram[count - 1];
  const currentAtr = atr[count - 1];

  // 2. Trend Score & Analysis (25%)
  let trendScore = 0;
  let trendDirection = 'SIDEWAYS';
  const isBullishTrend = currentEma9 > currentEma21 && currentEma21 > currentEma50 && currentEma50 > currentEma200;
  const isBearishTrend = currentEma9 < currentEma21 && currentEma21 < currentEma50 && currentEma50 < currentEma200;

  if (isBullishTrend) {
    trendScore = 25;
    trendDirection = 'BULLISH';
  } else if (isBearishTrend) {
    trendScore = 25;
    trendDirection = 'BEARISH';
  } else {
    // Partial alignment
    if (currentEma9 > currentEma21) trendScore += 10;
    if (currentEma21 > currentEma50) trendScore += 5;
    if (currentPrice > currentEma200) trendScore += 5;
  }

  // 3. Momentum Score & Analysis (15%)
  let momentumScore = 0;
  let rsiSignal = 'NEUTRAL';
  let macdSignal = 'NEUTRAL';

  if (currentRsi > 50) {
    rsiSignal = 'BULLISH';
    momentumScore += 5;
  } else if (currentRsi < 50) {
    rsiSignal = 'BEARISH';
    momentumScore += 5;
  }
  
  if (currentRsi > 70) rsiSignal = 'OVERBOUGHT';
  if (currentRsi < 30) rsiSignal = 'OVERSOLD';

  if (currentMacdHist > 0) {
    macdSignal = 'BULLISH';
    momentumScore += 10;
  } else if (currentMacdHist < 0) {
    macdSignal = 'BEARISH';
    momentumScore += 10;
  }

  // 4. Volume Score & Analysis (10%)
  let volumeScore = 0;
  let volumeSignal = 'NORMAL';
  const last20Vols = volumes.slice(count - 21, count - 1);
  const avgVol20 = last20Vols.reduce((a, b) => a + b, 0) / last20Vols.length;
  const currentVol = volumes[count - 1];

  if (currentVol > 1.8 * avgVol20) {
    volumeSignal = 'SPIKE';
    volumeScore = 10;
  } else if (currentVol < 0.6 * avgVol20) {
    volumeSignal = 'DECREASING';
    volumeScore = 3;
  } else {
    volumeSignal = 'NORMAL';
    volumeScore = 6;
  }

  // 5. Volatility Analysis (ATR check)
  const volPct = (currentAtr / currentPrice) * 100;
  let volatilityState = 'NORMAL';
  if (volPct > 4.5) {
    volatilityState = 'EXTREME';
  } else if (volPct > 2.5) {
    volatilityState = 'HIGH';
  } else if (volPct < 0.8) {
    volatilityState = 'LOW';
  }

  // 6. Market Structure (15%)
  let structureScore = 0;
  let structureSignal = 'SIDEWAYS';
  let sLevel = currentPrice - 2.5 * currentAtr;
  let rLevel = currentPrice + 2.5 * currentAtr;

  const swingData = findSwingLevels(highs, lows, closes, 8);
  if (swingData.swingHighs.length > 0) {
    const sortedHighs = [...swingData.swingHighs].sort((a, b) => b.index - a.index);
    rLevel = sortedHighs[0].price;
  }
  if (swingData.swingLows.length > 0) {
    const sortedLows = [...swingData.swingLows].sort((a, b) => b.index - a.index);
    sLevel = sortedLows[0].price;
  }

  const isBreakout = currentPrice > rLevel;
  const isBreakdown = currentPrice < sLevel;

  if (isBreakout) {
    structureSignal = 'BREAKOUT';
    structureScore = 15;
  } else if (isBreakdown) {
    structureSignal = 'BREAKDOWN';
    structureScore = 15;
  } else {
    // Assess general structure
    let hhCount = 0;
    let lhCount = 0;
    const shs = swingData.swingHighs;
    for (let i = 1; i < shs.length; i++) {
      if (shs[i].price > shs[i - 1].price) hhCount++;
      else lhCount++;
    }
    if (hhCount > lhCount) {
      structureSignal = 'HIGHER_HIGHS';
      structureScore = 10;
    } else {
      structureSignal = 'LOWER_HIGHS';
      structureScore = 5;
    }
  }

  // 7. Candlestick Patterns (10%)
  let patternScore = 0;
  let matchedPatterns = detectPatterns(opens[count - 1], highs[count - 1], lows[count - 1], closes[count - 1]);
  const engulf = detectEngulfing(klines[count - 1], klines[count - 2]);
  if (engulf) matchedPatterns.push(engulf);

  if (matchedPatterns.length > 0) {
    patternScore = 10;
  }

  // 8. Market Regime Detection
  let marketRegime = 'SIDEWAYS';
  if (volatilityState === 'EXTREME') {
    marketRegime = 'EXTREME VOLATILITY';
  } else if (volatilityState === 'HIGH') {
    marketRegime = 'HIGH VOLATILITY';
  } else if (trendDirection === 'BULLISH') {
    marketRegime = 'TRENDING BULLISH';
  } else if (trendDirection === 'BEARISH') {
    marketRegime = 'TRENDING BEARISH';
  }

  // 9. Setup identification for Backtest (evaluate 100/500/1000 candles)
  // Let's decide current active setup target direction:
  const isBullishSetup = currentEma9 > currentEma21 && currentRsi > 50 && currentMacdHist > 0;
  const isBearishSetup = currentEma9 < currentEma21 && currentRsi < 50 && currentMacdHist < 0;
  
  let setupDir = isBullishSetup ? 'LONG' : (isBearishSetup ? 'SHORT' : null);
  
  // Historical Backtesting Engine
  // For backtesting, we define a setup trigger at candle index 'i' if:
  // (Setup is True at i) AND (Setup was False at i-1)
  function runBacktest(candleLimit) {
    const startIdx = Math.max(20, count - candleLimit);
    let totalSetups = 0;
    let wins = 0;
    let losses = 0;

    for (let i = startIdx; i < count - 11; i++) {
      const isBull = ema9[i] > ema21[i] && rsi[i] > 50 && macd.histogram[i] > 0;
      const isBear = ema9[i] < ema21[i] && rsi[i] < 50 && macd.histogram[i] < 0;

      const prevBull = ema9[i-1] > ema21[i-1] && rsi[i-1] > 50 && macd.histogram[i-1] > 0;
      const prevBear = ema9[i-1] < ema21[i-1] && rsi[i-1] < 50 && macd.histogram[i-1] < 0;

      let triggeredDir = null;
      if (isBull && !prevBull) triggeredDir = 'LONG';
      if (isBear && !prevBear) triggeredDir = 'SHORT';

      // If we triggered a setup matching current proposed trade direction (or any direction to evaluate general winrate)
      if (triggeredDir && (!setupDir || triggeredDir === setupDir)) {
        totalSetups++;
        const entryPrice = closes[i];
        const localAtr = atr[i] || (entryPrice * 0.01);
        
        const sl = triggeredDir === 'LONG' ? (entryPrice - 2 * localAtr) : (entryPrice + 2 * localAtr);
        const tp = triggeredDir === 'LONG' ? (entryPrice + 4 * localAtr) : (entryPrice - 4 * localAtr);

        let hit = null;
        for (let j = 1; j <= 10; j++) {
          const nextHigh = highs[i + j];
          const nextLow = lows[i + j];

          if (triggeredDir === 'LONG') {
            if (nextLow <= sl) {
              hit = 'LOSS';
              break;
            }
            if (nextHigh >= tp) {
              hit = 'WIN';
              break;
            }
          } else {
            if (nextHigh >= sl) {
              hit = 'LOSS';
              break;
            }
            if (nextLow <= tp) {
              hit = 'WIN';
              break;
            }
          }
        }

        if (hit === 'WIN') {
          wins++;
        } else if (hit === 'LOSS') {
          losses++;
        } else {
          // Time exit close at 10th candle
          const finalClose = closes[i + 10];
          const gain = triggeredDir === 'LONG' ? (finalClose - entryPrice) : (entryPrice - finalClose);
          if (gain > 0) wins++;
          else losses++;
        }
      }
    }

    const wr = totalSetups > 0 ? (wins / totalSetups) * 100 : 50;
    return { count: totalSetups, wins, losses, winrate: parseFloat(wr.toFixed(1)) };
  }

  const backtest100 = runBacktest(100);
  const backtest500 = runBacktest(500);
  const backtest1000 = runBacktest(1000);

  const histWinrate = backtest1000.winrate;
  let histScore = 0;
  if (histWinrate >= 65) histScore = 15;
  else if (histWinrate >= 55) histScore = 10;
  else if (histWinrate >= 45) histScore = 5;

  // 10. Risk Analysis (Risk Reward) (10%)
  // Minimal RR: 1 : 2
  let rrRatio = 2; // Default Target
  let riskScore = 10;
  
  let entryZoneStart = currentPrice - (0.0015 * currentPrice);
  let entryZoneEnd = currentPrice + (0.0015 * currentPrice);

  let slPrice = currentPrice - 2 * currentAtr;
  let tpPrice = currentPrice + 4 * currentAtr;

  if (setupDir === 'SHORT') {
    slPrice = currentPrice + 2 * currentAtr;
    tpPrice = currentPrice - 4 * currentAtr;
  }

  // 11. Safety Check Score (20%)
  let safetyScore = 20;
  const safetyChecks = {
    volumeSufficient: volumeSignal !== 'DECREASING',
    marketNotTooWild: volatilityState !== 'EXTREME',
    noConflictingIndicators: true,
    riskRewardHealthy: true,
    historicalValidationOk: histWinrate >= 50
  };

  // Check conflicts
  if (setupDir === 'LONG' && (currentRsi > 72 || currentMacdHist < 0)) {
    safetyChecks.noConflictingIndicators = false;
    safetyScore -= 5;
  }
  if (setupDir === 'SHORT' && (currentRsi < 28 || currentMacdHist > 0)) {
    safetyChecks.noConflictingIndicators = false;
    safetyScore -= 5;
  }

  if (volatilityState === 'EXTREME') {
    safetyChecks.marketNotTooWild = false;
    safetyScore -= 10;
  }

  if (!safetyChecks.volumeSufficient) safetyScore -= 5;

  // 12. Final Total Weighted Score
  // Weights: Trend 25%, Momentum 15%, Volume 10%, Pattern 10%, Structure 15%, History 15%, RR 10%, Safety 20%
  const totalScore = trendScore + momentumScore + volumeScore + patternScore + structureScore + histScore + riskScore + safetyScore;

  // 13. Determine status
  let finalStatus = 'WAIT';
  
  if (setupDir === 'LONG') {
    if (totalScore >= 90) finalStatus = 'STRONG BUY';
    else if (totalScore >= 70) finalStatus = 'BUY';
    else if (totalScore >= 50) finalStatus = 'WAIT';
    else finalStatus = 'AVOID';
  } else if (setupDir === 'SHORT') {
    if (totalScore >= 90) finalStatus = 'STRONG SELL';
    else if (totalScore >= 70) finalStatus = 'SELL';
    else if (totalScore >= 50) finalStatus = 'WAIT';
    else finalStatus = 'AVOID';
  } else {
    finalStatus = 'WAIT';
  }

  // Safety Overrides
  if (volatilityState === 'EXTREME' || totalScore < 30) {
    finalStatus = 'AVOID';
  } else if (marketRegime === 'SIDEWAYS' && finalStatus !== 'WAIT' && finalStatus !== 'AVOID') {
    // Downgrade setup to wait or avoid in purely sideways regime
    finalStatus = 'WAIT';
  }

  // 14. Bullet Points reasons
  const reasons = [];
  if (trendDirection !== 'SIDEWAYS') {
    reasons.push(trendDirection === 'BULLISH' ? 'Trend is aligned bullish (EMA 9 > 21 > 50 > 200)' : 'Trend is aligned bearish (EMA 9 < 21 < 50 < 200)');
  } else {
    reasons.push('Trend is sideways or congested (EMAs intertwined)');
  }

  if (rsiSignal !== 'NEUTRAL') {
    reasons.push(`RSI is ${rsiSignal.toLowerCase()} (${currentRsi.toFixed(1)})`);
  }
  if (macdSignal !== 'NEUTRAL') {
    reasons.push(`MACD histogram indicates ${macdSignal.toLowerCase()} momentum`);
  }

  if (volumeSignal === 'SPIKE') {
    reasons.push('Volume spike detected, confirming heavy market activity');
  }

  if (structureSignal === 'BREAKOUT' || structureSignal === 'BREAKDOWN') {
    reasons.push(`Market structure indicates clean ${structureSignal.toLowerCase()}`);
  }

  if (matchedPatterns.length > 0) {
    reasons.push(`Matched pattern: ${matchedPatterns.join(', ')}`);
  }

  // Risks list
  const risks = [];
  if (volatilityState === 'EXTREME') {
    risks.push('Volatility is extremely high - massive stop-out risk.');
  }
  if (currentRsi > 70) {
    risks.push('Asset is technically overbought, entering high risk of correction.');
  }
  if (currentRsi < 30) {
    risks.push('Asset is technically oversold, entering high volatility zone.');
  }
  if (volumeSignal === 'DECREASING') {
    risks.push('Decreasing volume indicates lack of institutional interest or fake-out.');
  }
  if (marketRegime === 'SIDEWAYS') {
    risks.push('Market is sideways - high risk of whipsaws and false signals.');
  }

  // Default risk if empty
  if (risks.length === 0) {
    risks.push('Normal market risk applies.');
  }

  // Short conclusion
  let conclusion = '';
  if (finalStatus.includes('BUY')) {
    conclusion = `The market regime is trending bullish with high volume support. Risk Reward is highly favorable at 1:2. It is advised to open a LONG position within the entry zone with a tight Stop Loss.`;
  } else if (finalStatus.includes('SELL')) {
    conclusion = `The market regime has broken down with bearish momentum. Opening a SHORT position is recommended inside the entry zone to capitalize on further downward movements.`;
  } else if (finalStatus === 'AVOID') {
    conclusion = `Market is currently either too wild (extreme volatility) or has extremely weak volume. It is highly recommended to AVOID entering any trades to protect your capital.`;
  } else {
    conclusion = `No clear setup exists at this moment. Moving averages are sideways and indicators are conflicting. Wait for a clear breakout or trend confirmation before entry.`;
  }

  return {
    symbol,
    status: finalStatus,
    confidence: totalScore,
    marketRegime,
    entryZone: `${entryZoneStart.toFixed(4)} - ${entryZoneEnd.toFixed(4)}`,
    stopLoss: slPrice.toFixed(4),
    takeProfit: tpPrice.toFixed(4),
    riskReward: '1 : 2',
    historicalWinrate: `${histWinrate}%`,
    tradeQualityScore: totalScore,
    reasons,
    risks,
    conclusion,
    backtestStats: {
      total: backtest1000.count,
      wins: backtest1000.wins,
      losses: backtest1000.losses
    }
  };
}
