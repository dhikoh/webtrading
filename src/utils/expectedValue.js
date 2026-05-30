/**
 * Expected Value Engine
 * Calculates expected mathematical value of the signal based on historical win rates,
 * average reward/risk returns, and specific regime performance.
 */
export function calculateExpectedValue(historicalStats, currentRegime) {
  // Fallback defaults if no statistics exist
  let winRate = historicalStats?.actualWinRate || 0.50; // 50% default
  let avgWin = historicalStats?.avgActualRR || 2.0;    // 1:2 R:R default
  let avgLoss = 1.0;                                     // Standardized risk unit (1.0)
  
  // Apply regime adjustments to winRate/avgWin if provided
  if (historicalStats?.regimePerformance && historicalStats.regimePerformance[currentRegime]) {
    const regimeStats = historicalStats.regimePerformance[currentRegime];
    if (regimeStats.totalSignals >= 5) {
      winRate = regimeStats.wins / regimeStats.totalSignals;
      if (regimeStats.avgActualRR > 0) {
        avgWin = regimeStats.avgActualRR;
      }
    }
  }

  const lossRate = 1.0 - winRate;
  
  // Mathematical EV: (WinRate * AvgWin) - (LossRate * AvgLoss)
  const ev = (winRate * avgWin) - (lossRate * avgLoss);

  let status = 'NEUTRAL_EV';
  let scoreAdjustment = 0; // Penalty or bonus to be added to confidence score/grading

  if (ev > 0.15) {
    status = 'POSITIVE_EV';
    scoreAdjustment = 15; // Positive EV boosts score
  } else if (ev < -0.15) {
    status = 'NEGATIVE_EV';
    scoreAdjustment = -25; // Negative EV penalizes score heavily
  }

  return {
    ev,
    winRate,
    avgWin,
    avgLoss,
    status,
    scoreAdjustment,
    message: `Expected Value is ${ev.toFixed(2)} (${status}) based on Win Rate: ${(winRate * 100).toFixed(0)}%`
  };
}

/**
 * Dynamically adjusts Trade Grade based on Calibrated Confidence and Expected Value.
 */
export function determineTradeGrade(confidence, evStatus) {
  let grade = 'C';
  
  if (confidence >= 85) {
    grade = 'A';
  } else if (confidence >= 70) {
    grade = 'B';
  } else {
    grade = 'C';
  }

  // Adjust grade based on EV status
  if (evStatus === 'POSITIVE_EV') {
    if (grade === 'A') grade = 'A+';
    else if (grade === 'B') grade = 'A';
    else if (grade === 'C') grade = 'B';
  } else if (evStatus === 'NEGATIVE_EV') {
    if (grade === 'A') grade = 'B';
    else if (grade === 'B') grade = 'C';
    else if (grade === 'C') grade = 'D'; // Sub-grade for bad EV
  }

  return grade;
}
