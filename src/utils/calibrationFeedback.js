import { updateConfidenceBucket, updateStrategyHealth } from './strategyHealth.js';

/**
 * Finds the corresponding SignalLifecycle and updates the ConfidenceCalibration bins
 * based on the realized trade outcome. Also triggers Strategy Health updates and
 * Confidence Bucket Stats updates.
 */
export async function processTradeOutcome(tx, { userId, asset, type, entryPrice, exitPrice, outcomeStatus, entryTime }) {
  const normAsset = asset.toUpperCase();
  const signalType = type === 'BUY_LONG' ? 'BUY_LONG' : 'SELL_SHORT';

  // 1. Find matching SignalLifecycle within +/- 4 hours of the journal entry time
  const fourHoursMs = 4 * 60 * 60 * 1000;
  const entryDate = new Date(entryTime);
  const minTime = new Date(entryDate.getTime() - fourHoursMs);
  const maxTime = new Date(entryDate.getTime() + fourHoursMs);

  const matchingLifecycle = await tx.signalLifecycle.findFirst({
    where: {
      currentState: { in: ['PENDING', 'TRIGGERED', 'EXECUTED'] },
      analysis: {
        userId,
        asset: normAsset,
        signal: signalType,
        createdAt: {
          gte: minTime,
          lte: maxTime
        }
      }
    },
    include: {
      analysis: true
    }
  });

  if (!matchingLifecycle) {
    console.log(`No active signal lifecycle matched for asset ${normAsset} around ${entryDate.toISOString()}`);
    return null;
  }

  const analysis = matchingLifecycle.analysis;
  const confidence = analysis.confidence;

  // Calculate actual holding time in hours
  const actualHoldingTime = Math.max(0.1, (Date.now() - new Date(analysis.createdAt).getTime()) / (3600 * 1000));

  // Calculate actual Risk/Reward
  let actualRR = 0;
  if (entryPrice && exitPrice) {
    const risk = Math.abs(entryPrice - (analysis.stopLoss || entryPrice * 0.99));
    const reward = Math.abs(exitPrice - entryPrice);
    actualRR = risk > 0 ? reward / risk : 0;
  }

  // 2. Update the SignalLifecycle record
  await tx.signalLifecycle.update({
    where: { id: matchingLifecycle.id },
    data: {
      currentState: 'CLOSED',
      outcomeStatus,
      outcomePnL: outcomeStatus === 'WIN' ? 1.0 : -1.0, // Standard units
      actualRR,
      actualHoldingTime
    }
  });

  // 3. Find or create the calibration bin matching this confidence level (e.g. 70-79)
  const confidenceMin = Math.floor(confidence / 10) * 10;
  const confidenceMax = confidenceMin + 9;

  let bin = await tx.confidenceCalibration.findFirst({
    where: { confidenceMin, confidenceMax }
  });

  if (!bin) {
    bin = await tx.confidenceCalibration.create({
      data: {
        confidenceMin,
        confidenceMax,
        totalSignals: 0,
        wins: 0,
        losses: 0,
        actualWinRate: 0.0,
        avgPredictedRR: 0.0,
        avgActualRR: 0.0,
        avgExpectedHoldingTime: 0.0,
        avgActualHoldingTime: 0.0
      }
    });
  }

  // Fetch all closed signals in this bin range to compute rolling averages accurately
  const closedSignalsInBin = await tx.signalLifecycle.findMany({
    where: {
      currentState: 'CLOSED',
      outcomeStatus: { in: ['WIN', 'LOSS'] },
      analysis: {
        confidence: {
          gte: confidenceMin,
          lte: confidenceMax
        }
      }
    }
  });

  const total = closedSignalsInBin.length;
  const wins = closedSignalsInBin.filter(s => s.outcomeStatus === 'WIN').length;
  const losses = total - wins;
  const winRate = total > 0 ? wins / total : 0.0;

  // Averages
  const sumPredRR = closedSignalsInBin.reduce((sum, s) => sum + (s.predictedRR || 0), 0);
  const sumActRR = closedSignalsInBin.reduce((sum, s) => sum + (s.actualRR || 0), 0);
  const sumExpHold = closedSignalsInBin.reduce((sum, s) => sum + (s.expectedHoldingTime || 0), 0);
  const sumActHold = closedSignalsInBin.reduce((sum, s) => sum + (s.actualHoldingTime || 0), 0);

  await tx.confidenceCalibration.update({
    where: { id: bin.id },
    data: {
      totalSignals: total,
      wins,
      losses,
      actualWinRate: winRate,
      avgPredictedRR: total > 0 ? sumPredRR / total : 0.0,
      avgActualRR: total > 0 ? sumActRR / total : 0.0,
      avgExpectedHoldingTime: total > 0 ? sumExpHold / total : 0.0,
      avgActualHoldingTime: total > 0 ? sumActHold / total : 0.0
    }
  });

  // 4. Update Strategy-wide health and auto-suspension status
  await updateStrategyHealth(tx, analysis.strategyVerId);

  // 5. Update institutional confidence statistics bucket
  await updateConfidenceBucket(tx, confidence, outcomeStatus === 'WIN');

  return {
    lifecycleId: matchingLifecycle.id,
    confidenceMin,
    confidenceMax,
    newWinRate: winRate
  };
}
