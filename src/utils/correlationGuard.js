/**
 * Portfolio Correlation Exposure Guard
 * Tracks correlation between crypto assets to prevent over-exposure/concentration risk
 * in highly correlated pairs (e.g. simultaneous Longs in BTC, ETH, and SOL).
 */

const CORRELATION_MATRIX = {
  'BTC': { 'BTC': 1.0, 'ETH': 0.85, 'SOL': 0.80, 'DOGE': 0.70, 'PEPE': 0.65 },
  'ETH': { 'BTC': 0.85, 'ETH': 1.0, 'SOL': 0.82, 'DOGE': 0.68, 'PEPE': 0.60 },
  'SOL': { 'BTC': 0.80, 'ETH': 0.82, 'SOL': 1.0, 'DOGE': 0.72, 'PEPE': 0.65 },
  'DOGE': { 'BTC': 0.70, 'ETH': 0.68, 'SOL': 0.72, 'DOGE': 1.0, 'PEPE': 0.78 },
  'PEPE': { 'BTC': 0.65, 'ETH': 0.60, 'SOL': 0.65, 'DOGE': 0.78, 'PEPE': 1.0 }
};

function getCorrelation(assetA, assetB) {
  const normA = assetA.replace('USDT', '').toUpperCase();
  const normB = assetB.replace('USDT', '').toUpperCase();

  if (normA === normB) return 1.0;
  if (CORRELATION_MATRIX[normA] && CORRELATION_MATRIX[normA][normB] !== undefined) {
    return CORRELATION_MATRIX[normA][normB];
  }
  if (CORRELATION_MATRIX[normB] && CORRELATION_MATRIX[normB][normA] !== undefined) {
    return CORRELATION_MATRIX[normB][normA];
  }
  
  // Default fallback correlation coefficient for unlisted altcoins
  return 0.50;
}

/**
 * Checks directional exposure of a proposed setup against current active trades.
 * Direction: 'LONG' or 'SHORT'
 * ActiveTrades: Array of { asset, direction }
 */
export function checkCorrelationExposure(newAsset, newDirection, activeTrades, maxExposureLimit = 2.2) {
  if (!activeTrades || activeTrades.length === 0) {
    return {
      exposureScore: 0,
      isExceeded: false,
      penalty: 0,
      message: "No active trades. Correlation risk is zero."
    };
  }

  let totalDirectionalExposure = 0;
  const correlationDetails = [];

  const newDirMultiplier = newDirection === 'LONG' ? 1 : -1;

  for (const trade of activeTrades) {
    const correlation = getCorrelation(newAsset, trade.asset);
    const tradeDirMultiplier = trade.direction === 'LONG' ? 1 : -1;
    
    // Directional correlation: if they go in the same direction, exposure increases.
    // If they hedge (one long, one short), exposure decreases.
    const exposureContribution = correlation * (newDirMultiplier * tradeDirMultiplier);
    totalDirectionalExposure += exposureContribution;

    correlationDetails.push({
      asset: trade.asset,
      direction: trade.direction,
      correlationCoefficient: correlation,
      exposureContribution
    });
  }

  const isExceeded = Math.abs(totalDirectionalExposure) >= maxExposureLimit;
  let penalty = 0;
  if (isExceeded) {
    // Over-exposure penalty
    penalty = 25;
  } else if (Math.abs(totalDirectionalExposure) >= 1.5) {
    penalty = 10;
  }

  return {
    exposureScore: totalDirectionalExposure,
    isExceeded,
    penalty,
    correlationDetails,
    message: isExceeded
      ? `EXPOSURE WARN: Directional correlation exposure score is ${totalDirectionalExposure.toFixed(2)} (Limit: ${maxExposureLimit}). Risk is high.`
      : `Exposure is safe: ${totalDirectionalExposure.toFixed(2)}`
  };
}
