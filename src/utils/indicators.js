// Exponential Moving Average (EMA)
export function calculateEMA(prices, period) {
  if (prices.length < period) return [];
  const k = 2 / (period + 1);
  const ema = new Array(prices.length).fill(null);
  
  // Initial SMA as starting point
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  let prevEma = sum / period;
  ema[period - 1] = prevEma;
  
  for (let i = period; i < prices.length; i++) {
    const currentEma = prices[i] * k + prevEma * (1 - k);
    ema[i] = currentEma;
    prevEma = currentEma;
  }
  return ema;
}

// Relative Strength Index (RSI)
export function calculateRSI(prices, period = 14) {
  if (prices.length <= period) return [];
  const rsi = new Array(prices.length).fill(null);
  let gains = 0;
  let losses = 0;

  // Initial step
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  rsi[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
    rsi[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  }
  return rsi;
}

// Average True Range (ATR)
export function calculateATR(candles, period = 14) {
  if (candles.length <= period) return [];
  const tr = new Array(candles.length).fill(0);
  const atr = new Array(candles.length).fill(null);

  for (let i = 1; i < candles.length; i++) {
    tr[i] = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
  }

  // Initial SMA of TR
  let sumTR = 0;
  for (let i = 1; i <= period; i++) {
    sumTR += tr[i];
  }
  let prevAtr = sumTR / period;
  atr[period] = prevAtr;

  for (let i = period + 1; i < candles.length; i++) {
    const currentAtr = (prevAtr * (period - 1) + tr[i]) / period;
    atr[i] = currentAtr;
    prevAtr = currentAtr;
  }
  return atr;
}

// Moving Average Convergence Divergence (MACD)
// Outputs: macdLine, signalLine, histogram arrays
export function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (prices.length < slowPeriod) {
    return {
      macdLine: [],
      signalLine: [],
      histogram: []
    };
  }

  const fastEma = calculateEMA(prices, fastPeriod);
  const slowEma = calculateEMA(prices, slowPeriod);
  
  const macdLine = new Array(prices.length).fill(null);
  for (let i = slowPeriod - 1; i < prices.length; i++) {
    if (fastEma[i] !== null && slowEma[i] !== null) {
      macdLine[i] = fastEma[i] - slowEma[i];
    }
  }

  // Extract non-null macd values to calculate its signal line EMA
  const macdValuesOnly = macdLine.filter(val => val !== null);
  const signalEmaOnly = calculateEMA(macdValuesOnly, signalPeriod);
  
  const signalLine = new Array(prices.length).fill(null);
  const histogram = new Array(prices.length).fill(null);

  let signalIndex = 0;
  const startIdx = prices.length - macdValuesOnly.length + (signalPeriod - 1);
  
  for (let i = startIdx; i < prices.length; i++) {
    const sigVal = signalEmaOnly[signalPeriod - 1 + signalIndex];
    if (sigVal !== undefined && sigVal !== null) {
      signalLine[i] = sigVal;
      histogram[i] = macdLine[i] - signalLine[i];
      signalIndex++;
    }
  }

  return { macdLine, signalLine, histogram };
}

// Average Directional Index (ADX)
export function calculateADX(candles, period = 14) {
  if (candles.length < 2 * period) return new Array(candles.length).fill(null);

  const tr = new Array(candles.length).fill(0);
  const plusDM = new Array(candles.length).fill(0);
  const minusDM = new Array(candles.length).fill(0);

  for (let i = 1; i < candles.length; i++) {
    const highDiff = candles[i].high - candles[i - 1].high;
    const lowDiff = candles[i - 1].low - candles[i].low;

    tr[i] = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );

    if (highDiff > lowDiff && highDiff > 0) {
      plusDM[i] = highDiff;
    } else {
      plusDM[i] = 0;
    }

    if (lowDiff > highDiff && lowDiff > 0) {
      minusDM[i] = lowDiff;
    } else {
      minusDM[i] = 0;
    }
  }

  const smoothedTR = new Array(candles.length).fill(0);
  const smoothedPlusDM = new Array(candles.length).fill(0);
  const smoothedMinusDM = new Array(candles.length).fill(0);

  let trSum = 0;
  let plusDMSum = 0;
  let minusDMSum = 0;

  for (let i = 1; i <= period; i++) {
    trSum += tr[i];
    plusDMSum += plusDM[i];
    minusDMSum += minusDM[i];
  }

  smoothedTR[period] = trSum;
  smoothedPlusDM[period] = plusDMSum;
  smoothedMinusDM[period] = minusDMSum;

  for (let i = period + 1; i < candles.length; i++) {
    smoothedTR[i] = smoothedTR[i - 1] - (smoothedTR[i - 1] / period) + tr[i];
    smoothedPlusDM[i] = smoothedPlusDM[i - 1] - (smoothedPlusDM[i - 1] / period) + plusDM[i];
    smoothedMinusDM[i] = smoothedMinusDM[i - 1] - (smoothedMinusDM[i - 1] / period) + minusDM[i];
  }

  const dx = new Array(candles.length).fill(null);
  for (let i = period; i < candles.length; i++) {
    const sTR = smoothedTR[i];
    const sPlus = smoothedPlusDM[i];
    const sMinus = smoothedMinusDM[i];

    if (sTR === 0) {
      dx[i] = 0;
      continue;
    }

    const plusDI = 100 * (sPlus / sTR);
    const minusDI = 100 * (sMinus / sTR);
    const sumDI = plusDI + minusDI;

    if (sumDI === 0) {
      dx[i] = 0;
    } else {
      dx[i] = 100 * (Math.abs(plusDI - minusDI) / sumDI);
    }
  }

  const adx = new Array(candles.length).fill(null);
  let dxSum = 0;
  for (let i = period; i < 2 * period; i++) {
    dxSum += dx[i] || 0;
  }

  let prevAdx = dxSum / period;
  adx[2 * period - 1] = prevAdx;

  for (let i = 2 * period; i < candles.length; i++) {
    const currentDx = dx[i] !== null ? dx[i] : 0;
    const currentAdx = (prevAdx * (period - 1) + currentDx) / period;
    adx[i] = currentAdx;
    prevAdx = currentAdx;
  }

  return adx;
}

// Volume SMA
export function calculateVolumeSMA(candles, period = 20) {
  if (candles.length < period) return new Array(candles.length).fill(null);

  const volumeSMA = new Array(candles.length).fill(null);
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].volume || 0;
  }
  volumeSMA[period - 1] = sum / period;

  for (let i = period; i < candles.length; i++) {
    sum += (candles[i].volume || 0) - (candles[i - period].volume || 0);
    volumeSMA[i] = sum / period;
  }
  return volumeSMA;
}

// Relative Volume (RVOL)
export function calculateRVOL(candles, period = 20) {
  const volumeSMA = calculateVolumeSMA(candles, period);
  const rvol = new Array(candles.length).fill(null);

  for (let i = 0; i < candles.length; i++) {
    const currentVol = candles[i].volume || 0;
    const sma = volumeSMA[i];
    if (sma === null || sma === 0) {
      rvol[i] = 1.0;
    } else {
      rvol[i] = currentVol / sma;
    }
  }
  return rvol;
}
