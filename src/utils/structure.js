// Detect local peaks (swing highs) and troughs (swing lows)
export function detectSwingPoints(candles, leftStrength = 3, rightStrength = 3) {
  const peaks = [];
  const troughs = [];

  for (let i = leftStrength; i < candles.length - rightStrength; i++) {
    const currentHigh = candles[i].high;
    const currentLow = candles[i].low;
    let isPeak = true;
    let isTrough = true;

    for (let j = 1; j <= leftStrength; j++) {
      if (candles[i - j].high >= currentHigh) isPeak = false;
      if (candles[i - j].low <= currentLow) isTrough = false;
    }
    for (let j = 1; j <= rightStrength; j++) {
      if (candles[i + j].high >= currentHigh) isPeak = false;
      if (candles[i + j].low <= currentLow) isTrough = false;
    }

    if (isPeak) {
      peaks.push({ index: i, price: currentHigh, time: candles[i].time });
    }
    if (isTrough) {
      troughs.push({ index: i, price: currentLow, time: candles[i].time });
    }
  }

  return { peaks, troughs };
}

// Cluster swing points into Support and Resistance zones using tolerance margins
export function calculateSRZones(peaks, troughs, priceTolerance = 0.005) {
  const zones = [];
  const allPoints = [
    ...peaks.map(p => ({ price: p.price, type: 'RESISTANCE' })),
    ...troughs.map(t => ({ price: t.price, type: 'SUPPORT' }))
  ];

  allPoints.forEach(point => {
    const matchingZone = zones.find(
      z => Math.abs(z.centerPrice - point.price) / point.price <= priceTolerance && z.type === point.type
    );

    if (matchingZone) {
      matchingZone.touches += 1;
      matchingZone.prices.push(point.price);
      matchingZone.centerPrice = matchingZone.prices.reduce((sum, p) => sum + p, 0) / matchingZone.prices.length;
    } else {
      zones.push({
        centerPrice: point.price,
        type: point.type,
        touches: 1,
        prices: [point.price]
      });
    }
  });

  // Sort by touch frequency (strongest zones first)
  return zones.sort((a, b) => b.touches - a.touches);
}

// Calculate Fibonacci Retracement Levels based on recent high/low swing range
export function calculateFibonacciLevels(candles) {
  if (candles.length < 20) return null;
  
  // Find highest high and lowest low of the candle array
  let highPrice = -Infinity;
  let lowPrice = Infinity;
  let highIndex = -1;
  let lowIndex = -1;

  for (let i = 0; i < candles.length; i++) {
    if (candles[i].high > highPrice) {
      highPrice = candles[i].high;
      highIndex = i;
    }
    if (candles[i].low < lowPrice) {
      lowPrice = candles[i].low;
      lowIndex = i;
    }
  }

  const range = highPrice - lowPrice;
  const direction = highIndex > lowIndex ? 'UPTREND' : 'DOWNTREND';

  // Levels: 23.6%, 38.2%, 50%, 61.8%, 78.6%
  const levels = {
    0.0: direction === 'UPTREND' ? highPrice : lowPrice,
    23.6: direction === 'UPTREND' ? highPrice - range * 0.236 : lowPrice + range * 0.236,
    38.2: direction === 'UPTREND' ? highPrice - range * 0.382 : lowPrice + range * 0.382,
    50.0: direction === 'UPTREND' ? highPrice - range * 0.500 : lowPrice + range * 0.500,
    61.8: direction === 'UPTREND' ? highPrice - range * 0.618 : lowPrice + range * 0.618,
    78.6: direction === 'UPTREND' ? highPrice - range * 0.786 : lowPrice + range * 0.786,
    100.0: direction === 'UPTREND' ? lowPrice : highPrice
  };

  return { direction, levels, range, highPrice, lowPrice };
}

// Detect Candlestick Patterns on the last 3 candles
export function detectCandlestickPatterns(candles) {
  if (candles.length < 3) return [];
  const patterns = [];

  const c1 = candles[candles.length - 3]; // oldest
  const c2 = candles[candles.length - 2]; // middle
  const c3 = candles[candles.length - 1]; // current (newest)

  const body1 = Math.abs(c1.close - c1.open);
  const body2 = Math.abs(c2.close - c2.open);
  const body3 = Math.abs(c3.close - c3.open);

  const range1 = c1.high - c1.low;
  const range2 = c2.high - c2.low;
  const range3 = c3.high - c3.low;

  const isBullish1 = c1.close > c1.open;
  const isBearish1 = c1.close < c1.open;
  const isBullish2 = c2.close > c2.open;
  const isBearish2 = c2.close < c2.open;
  const isBullish3 = c3.close > c3.open;
  const isBearish3 = c3.close < c3.open;

  // 1. Doji (Close extremely close to open)
  if (range3 > 0 && body3 <= range3 * 0.1) {
    patterns.push('Doji');
  }

  // 2. Hammer (Bullish Reversal: small body at top, long lower wick)
  const lowerWick3 = isBullish3 ? c3.open - c3.low : c3.close - c3.low;
  const upperWick3 = isBullish3 ? c3.high - c3.close : c3.high - c3.open;
  if (range3 > 0 && lowerWick3 >= body3 * 2 && upperWick3 <= range3 * 0.1) {
    patterns.push('Hammer');
  }

  // 3. Inverted Hammer / Shooting Star
  // Inverted Hammer is bullish at bottom; Shooting Star is bearish at top
  if (range3 > 0 && upperWick3 >= body3 * 2 && lowerWick3 <= range3 * 0.1) {
    if (isBearish3) patterns.push('Shooting Star');
    else patterns.push('Inverted Hammer');
  }

  // 4. Hanging Man (Bearish Reversal: small body at top, long lower wick, after uptrend)
  if (range3 > 0 && lowerWick3 >= body3 * 2 && upperWick3 <= range3 * 0.1 && isBearish3) {
    patterns.push('Hanging Man');
  }

  // 5. Engulfing Patterns (2-candle patterns)
  if (body2 > 0 && body3 > body2) {
    if (isBearish2 && isBullish3 && c3.open <= c2.close && c3.close >= c2.open) {
      patterns.push('Bullish Engulfing');
    }
    if (isBullish2 && isBearish3 && c3.open >= c2.close && c3.close <= c2.open) {
      patterns.push('Bearish Engulfing');
    }
  }

  // 6. Morning Star / Evening Star (3-candle patterns)
  const isLargeBody1 = body1 > range1 * 0.5;
  const isSmallBody2 = body2 <= range2 * 0.3;
  const isLargeBody3 = body3 > range3 * 0.5;

  if (isLargeBody1 && isSmallBody2 && isLargeBody3) {
    // Morning Star: Bearish -> Small -> Bullish (closing above c1 midpoint)
    if (isBearish1 && isBullish3 && c3.close > (c1.open + c1.close) / 2) {
      patterns.push('Morning Star');
    }
    // Evening Star: Bullish -> Small -> Bearish (closing below c1 midpoint)
    if (isBullish1 && isBearish3 && c3.close < (c1.open + c1.close) / 2) {
      patterns.push('Evening Star');
    }
  }

  // 7. Tweezers Top / Bottom
  const diffHigh = Math.abs(c2.high - c3.high) / c3.high;
  const diffLow = Math.abs(c2.low - c3.low) / c3.low;

  if (diffHigh <= 0.0005 && upperWick3 > body3 && upperWick3 > range3 * 0.3) {
    patterns.push('Tweezer Top');
  }
  if (diffLow <= 0.0005 && lowerWick3 > body3 && lowerWick3 > range3 * 0.3) {
    patterns.push('Tweezer Bottom');
  }

  return patterns;
}

// ----------------------------------------------------
// QUANTITATIVE HARDENING MODULES
// ----------------------------------------------------

/**
 * Validates BOS / CHOCH Breakout Confirmation.
 * Requires:
 * 1. Candle close beyond the breakout level.
 * 2. RVOL > 1.2 on the breakout candle.
 * 3. Next candle confirmation (doesn't immediately re-enter).
 */
export function validateBreakout(candles, rvolArray, direction, levelPrice, breakoutIndex) {
  if (breakoutIndex === undefined) {
    breakoutIndex = candles.length - 2; // Default to previous candle as breakout candle
  }
  
  if (breakoutIndex < 0 || breakoutIndex >= candles.length - 1) {
    return { isValid: false, reason: "Insufficient candles for breakout validation", penalty: 40 };
  }

  const boCandle = candles[breakoutIndex];
  const confirmCandle = candles[breakoutIndex + 1]; // Next candle (could be current active candle)
  const rvol = rvolArray[breakoutIndex] || 1.0;

  // 1. Check candle close beyond level
  let closedBeyond = false;
  if (direction === 'BULLISH') {
    closedBeyond = boCandle.close > levelPrice;
  } else {
    closedBeyond = boCandle.close < levelPrice;
  }

  if (!closedBeyond) {
    return {
      isValid: false,
      reason: `Candle close did not cross level price of ${levelPrice}`,
      penalty: 50
    };
  }

  // 2. Require RVOL > 1.2
  if (rvol < 1.2) {
    return {
      isValid: false,
      reason: `Breakout volume (RVOL: ${rvol.toFixed(2)}) is below institutional threshold of 1.2`,
      penalty: 30
    };
  }

  // 3. Next candle confirmation
  let confirmed = false;
  if (direction === 'BULLISH') {
    confirmed = confirmCandle.close > levelPrice;
  } else {
    confirmed = confirmCandle.close < levelPrice;
  }

  if (!confirmed) {
    return {
      isValid: false,
      reason: "Next candle failed to hold price beyond breakout level (immediate fakeout)",
      penalty: 45
    };
  }

  return {
    isValid: true,
    reason: `Confirmed ${direction} breakout with RVOL ${rvol.toFixed(2)}`,
    penalty: 0
  };
}

/**
 * Detects Buy-Side (BSL) and Sell-Side (SSL) Liquidity Sweeps.
 * Occurs when price pierces a swing peak/trough but closes back inside the range.
 */
export function detectLiquiditySweeps(candles, swingPoints, lookback = 3) {
  if (candles.length < 2 || !swingPoints) return [];
  
  const currentCandle = candles[candles.length - 1];
  const sweeps = [];

  // 1. Buy-Side Liquidity (BSL) Sweep (Bullish run clearing stop losses, closing bearish/neutral)
  for (const peak of swingPoints.peaks) {
    if (currentCandle.high > peak.price && currentCandle.close <= peak.price) {
      // Swept swing high
      sweeps.push({
        type: 'BSL_SWEEP',
        levelPrice: peak.price,
        time: currentCandle.time,
        description: `Swept Buy-Side Liquidity at ${peak.price} before closing back inside`
      });
    }
  }

  // 2. Sell-Side Liquidity (SSL) Sweep (Bearish run clearing stop losses, closing bullish/neutral)
  for (const trough of swingPoints.troughs) {
    if (currentCandle.low < trough.price && currentCandle.close >= trough.price) {
      // Swept swing low
      sweeps.push({
        type: 'SSL_SWEEP',
        levelPrice: trough.price,
        time: currentCandle.time,
        description: `Swept Sell-Side Liquidity at ${trough.price} before closing back inside`
      });
    }
  }

  return sweeps;
}

/**
 * Detects Liquidity Clusters (Swing zones with repeated touches)
 * Useful to find major supply/demand zones.
 */
export function detectLiquidityClusters(peaks, troughs, symbolProfile = null) {
  const tolerance = symbolProfile?.liquidityTolerance || 0.0015; // 0.15% default tolerance
  const clusters = [];
  
  const allPoints = [
    ...peaks.map(p => ({ price: p.price, type: 'RESISTANCE', index: p.index })),
    ...troughs.map(t => ({ price: t.price, type: 'SUPPORT', index: t.index }))
  ];

  allPoints.forEach(point => {
    const existing = clusters.find(
      c => Math.abs(c.level - point.price) / point.price <= tolerance && c.type === point.type
    );

    if (existing) {
      existing.touches += 1;
      existing.indices.push(point.index);
      existing.level = (existing.level * (existing.touches - 1) + point.price) / existing.touches;
    } else {
      clusters.push({
        level: point.price,
        type: point.type,
        touches: 1,
        indices: [point.index]
      });
    }
  });

  // Filter clusters with 2 or more touches (repeated levels)
  return clusters.filter(c => c.touches >= 2).sort((a, b) => b.touches - a.touches);
}

/**
 * Validates distance to Support/Resistance zones to prevent entering long near resistance or short near support.
 */
export function validateDistanceToSR(price, zones, direction, minPercent = 0.005) {
  let tooClose = false;
  let nearestZone = null;
  let distancePercent = 1.0;

  for (const zone of zones) {
    const dist = Math.abs(zone.centerPrice - price) / price;
    if (dist < distancePercent) {
      distancePercent = dist;
      nearestZone = zone;
    }

    if (direction === 'LONG' && zone.type === 'RESISTANCE' && price < zone.centerPrice && dist < minPercent) {
      tooClose = true;
    }
    if (direction === 'SHORT' && zone.type === 'SUPPORT' && price > zone.centerPrice && dist < minPercent) {
      tooClose = true;
    }
  }

  return {
    tooClose,
    distancePercent,
    nearestZone,
    message: tooClose 
      ? `Too close to key ${nearestZone.type} zone at ${nearestZone.centerPrice.toFixed(2)} (${(distancePercent * 100).toFixed(2)}% distance)` 
      : `Safe S/R buffer exists`
  };
}

/**
 * Stop Loss Distance Validation based on ATR
 * Validates SL is at least 1.5 * ATR from entry price to prevent noise-based stops.
 */
export function validateSLDistance(entry, stopLoss, atr, multiplier = 1.5) {
  const actualDistance = Math.abs(entry - stopLoss);
  const minDistance = multiplier * atr;
  const isValid = actualDistance >= minDistance;

  return {
    isValid,
    actualDistance,
    minRequiredDistance: minDistance,
    ratio: actualDistance / atr,
    message: isValid 
      ? `SL distance is valid: ${actualDistance.toFixed(2)} (${(actualDistance / atr).toFixed(2)}x ATR)`
      : `SL is too close: ${actualDistance.toFixed(2)} (${(actualDistance / atr).toFixed(2)}x ATR). Must be at least ${minDistance.toFixed(2)} (1.5x ATR)`
  };
}

/**
 * Slippage Risk Model
 * Estimates entry, stop loss, and take profit slippage based on ATR and Spread.
 * Calculates adjusted Risk/Reward ratio.
 */
export function calculateSlippageRisk(entry, stopLoss, tp1, atr, spreadPercent = 0.0003) {
  // Estimated slippage values (larger for stop loss in market order execution)
  const entrySlippage = entry * (spreadPercent * 0.5);
  const slSlippage = atr * 0.1 + (entry * spreadPercent); // Higher slippage on stop triggers
  const tpSlippage = entry * (spreadPercent * 0.2); // Limit orders have less slippage

  // Determine trade direction
  const isLong = tp1 > entry;
  
  // Apply slippage penalty
  const rawRisk = Math.abs(entry - stopLoss);
  const rawReward = Math.abs(tp1 - entry);
  const rawRR = rawRisk > 0 ? rawReward / rawRisk : 0;

  const adjustedEntry = isLong ? entry + entrySlippage : entry - entrySlippage;
  const adjustedSL = isLong ? stopLoss - slSlippage : stopLoss + slSlippage;
  const adjustedTP = isLong ? tp1 - tpSlippage : tp1 + tpSlippage;

  const adjustedRisk = Math.abs(adjustedEntry - adjustedSL);
  const adjustedReward = Math.abs(adjustedTP - adjustedEntry);
  const adjustedRR = adjustedRisk > 0 ? adjustedReward / adjustedRisk : 0;

  const slippageImpact = rawRR - adjustedRR;
  const totalSlippageCost = entrySlippage + slSlippage + tpSlippage;
  const costRatio = totalSlippageCost / entry;

  let riskScore = 'LOW';
  let penalty = 0;
  if (costRatio > 0.005) {
    riskScore = 'HIGH';
    penalty = 25;
  } else if (costRatio > 0.002) {
    riskScore = 'MODERATE';
    penalty = 10;
  }

  return {
    rawRR,
    adjustedRR,
    slippageImpact,
    riskScore,
    penalty,
    adjustedEntry,
    adjustedSL,
    adjustedTP,
    costPercent: costRatio * 100
  };
}

/**
 * Noise Zone Detection
 * If recent candles' high-low range is consistently below ATR, it indicates a low-volatility noise zone.
 */
export function detectNoiseZone(candles, atr, lookback = 5) {
  if (candles.length < lookback) return false;
  
  let noiseCandles = 0;
  for (let i = candles.length - lookback; i < candles.length; i++) {
    const range = candles[i].high - candles[i].low;
    if (range < atr) {
      noiseCandles++;
    }
  }

  // If more than 80% of candles are within the noise zone (less than ATR)
  return noiseCandles / lookback >= 0.8;
}
