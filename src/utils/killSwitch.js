/**
 * Global Risk Kill Switch
 * Evaluates market-wide and platform-wide parameters to decide whether to block trading.
 * Checks:
 * - High economic event risk
 * - Low data source reliability
 * - High price spreads
 * - Extreme market volatility
 */
export function checkGlobalKillSwitch(params) {
  const {
    eventRisk = 'LOW',
    reliabilitySuccessRatio = 100,
    reliabilityLatencyMs = 100,
    spreadPercent = 0.0003,
    marketRegime = 'RANGING',
    symbol = 'USDT'
  } = params;

  const reasons = [];

  // 1. Event Risk = HIGH
  if (eventRisk === 'HIGH') {
    reasons.push("HIGH_IMPACT_MACRO_EVENT_ACTIVE");
  }

  // 2. Data source reliability below threshold (e.g. success < 80% or latency > 1500ms)
  if (reliabilitySuccessRatio < 80.0) {
    reasons.push(`LOW_DATA_SOURCE_RELIABILITY (${reliabilitySuccessRatio.toFixed(1)}% success ratio)`);
  }
  if (reliabilityLatencyMs > 1500) {
    reasons.push(`HIGH_API_LATENCY (${reliabilityLatencyMs}ms)`);
  }

  // 3. Abnormal spread detected (> 0.5% of price)
  if (spreadPercent > 0.005) {
    reasons.push(`ABNORMAL_SPREAD_DETECTED (${(spreadPercent * 100).toFixed(2)}%)`);
  }

  // 4. Extreme volatility regime
  if (marketRegime === 'VOLATILE') {
    reasons.push("EXTREME_VOLATILITY_REGIME_ACTIVE");
  }

  const killActive = reasons.length > 0;

  return {
    killActive,
    reasons,
    message: killActive 
      ? `KILL SWITCH ACTIVE: Trading blocked for ${symbol} due to: ${reasons.join(', ')}`
      : `All global risk guards passed.`
  };
}

/**
 * Log a blocked signal event to the database.
 */
export async function logBlockedSignal(prisma, userId, symbol, reasons, details) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'SIGNAL_BLOCKED_BY_KILL_SWITCH',
        details: JSON.stringify({
          symbol,
          reasons,
          details,
          timestamp: new Date().toISOString()
        })
      }
    });
  } catch (error) {
    console.error("Error logging blocked signal to AuditLog:", error.message);
  }
}
