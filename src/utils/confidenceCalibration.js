/**
 * Calibrates Raw Confidence score against historical win-rate bins.
 * Uses a Bayesian-style blending factor for cold-start (low sample size) bins.
 */
export function calibrateConfidence(rawConfidence, calibrationBins) {
  if (!calibrationBins || calibrationBins.length === 0) {
    return {
      rawConfidence,
      calibratedConfidence: rawConfidence,
      winRate: rawConfidence / 100,
      reason: "No calibration bins available, using raw confidence"
    };
  }

  // Find the bin that matches the raw confidence score
  const matchedBin = calibrationBins.find(
    bin => rawConfidence >= bin.confidenceMin && rawConfidence <= bin.confidenceMax
  );

  if (!matchedBin || matchedBin.totalSignals === 0) {
    return {
      rawConfidence,
      calibratedConfidence: rawConfidence,
      winRate: rawConfidence / 100,
      reason: "No matched historical data for this confidence range"
    };
  }

  const historicalWR = matchedBin.actualWinRate; // e.g. 0.58 (58%)
  const totalSignals = matchedBin.totalSignals;
  
  // Blend factor: scale up with sample size (max 100% weight to historical data at 20 samples)
  const blendFactor = Math.min(1.0, totalSignals / 20);
  const targetConfidence = Math.round(historicalWR * 100);

  // Calibrated confidence = blended result between raw and actual historical WR
  const calibratedConfidence = Math.round((rawConfidence * (1 - blendFactor)) + (targetConfidence * blendFactor));

  return {
    rawConfidence,
    calibratedConfidence,
    winRate: historicalWR,
    totalSignals,
    reason: `Calibrated against ${totalSignals} historic signals in range ${matchedBin.confidenceMin}-${matchedBin.confidenceMax}% (Actual Win Rate: ${(historicalWR * 100).toFixed(0)}%)`
  };
}
