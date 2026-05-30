import { 
  calculateADX, 
  calculateVolumeSMA, 
  calculateRVOL 
} from './src/utils/indicators.js';
import { 
  detectSwingPoints, 
  calculateSRZones, 
  calculateFibonacciLevels, 
  validateBreakout,
  detectLiquiditySweeps,
  detectLiquidityClusters,
  validateDistanceToSR,
  validateSLDistance,
  calculateSlippageRisk,
  detectNoiseZone
} from './src/utils/structure.js';
import { classifyMarketRegime } from './src/utils/regime.js';
import { calculateExpectedValue, determineTradeGrade } from './src/utils/expectedValue.js';
import { calibrateConfidence } from './src/utils/confidenceCalibration.js';
import { getSessionQuality } from './src/utils/sessionQuality.js';
import { getEconomicEventRisk } from './src/utils/eventRisk.js';
import { checkCorrelationExposure } from './src/utils/correlationGuard.js';
import { checkGlobalKillSwitch } from './src/utils/killSwitch.js';

// 1. Generate 30 mock candle bars
const mockCandles = Array.from({ length: 30 }, (_, i) => {
  const basePrice = 100 + i * 2; // general uptrend
  return {
    time: Date.now() - (30 - i) * 60000,
    open: basePrice,
    high: basePrice + 3,
    low: basePrice - 1,
    close: basePrice + 1,
    volume: 100 + (i === 29 ? 200 : i * 5) // high volume breakout on the last candle
  };
});

const closePrices = mockCandles.map(c => c.close);

async function runTests() {
  console.log("=========================================");
  console.log("RUNNING HARNDENED QUANT ENGINE UNIT TESTS");
  console.log("=========================================");

  try {
    // Test 1: Indicators
    const adx = calculateADX(mockCandles, 14);
    const volSMA = calculateVolumeSMA(mockCandles, 20);
    const rvol = calculateRVOL(mockCandles, 20);
    console.log("[OK] Indicators computed successfully.");
    console.log(`     ADX (latest): ${adx[adx.length - 1] || 'N/A'}`);
    console.log(`     Volume SMA (latest): ${volSMA[volSMA.length - 1]}`);
    console.log(`     RVOL (latest): ${rvol[rvol.length - 1]}`);

    // Test 2: Structural Elements
    const { peaks, troughs } = detectSwingPoints(mockCandles);
    const srZones = calculateSRZones(peaks, troughs);
    const fibs = calculateFibonacciLevels(mockCandles);
    console.log("[OK] Structural elements computed successfully.");
    console.log(`     Detected Peaks count: ${peaks.length}, Troughs count: ${troughs.length}`);
    console.log(`     S/R Zones count: ${srZones.length}`);
    console.log(`     Fib 61.8% level: ${fibs.fib618}`);

    // Test 3: Breakout Validation
    const breakoutVal = validateBreakout(mockCandles, rvol, 'LONG', 158);
    console.log("[OK] Breakout Validation execution checked.");
    console.log(`     Breakout Valid: ${breakoutVal.isValid}, Penalty: ${breakoutVal.penalty}`);

    // Test 4: Liquidity & Noise Zones
    const sweeps = detectLiquiditySweeps(mockCandles, { peaks, troughs });
    const profile = { atrMultiplier: 2.0, volatilityThreshold: 0.03, liquidityTolerance: 0.002, spreadPercent: 0.0005 };
    const clusters = detectLiquidityClusters(peaks, troughs, profile);
    const isNoise = detectNoiseZone(mockCandles, 2.0);
    console.log("[OK] Liquidity & Noise detection execution checked.");
    console.log(`     Sweeps count: ${sweeps.length}`);
    console.log(`     Clusters count: ${clusters.length}`);
    console.log(`     Noise Zone: ${isNoise}`);

    // Test 5: Market Regime
    const regimeObj = classifyMarketRegime(mockCandles, adx, Array(30).fill(1.5), Array(30).fill(102), Array(30).fill(100));
    console.log("[OK] Market Regime Classification checked.");
    console.log(`     Regime: ${regimeObj.regime}`);

    // Test 6: Expected Value & Calibrations
    const ev = calculateExpectedValue({ actualWinRate: 0.55, avgActualRR: 1.8, regimePerformance: {} }, regimeObj.regime);
    const grade = determineTradeGrade(75, ev.status);
    console.log("[OK] Expected Value & Trade Grading checked.");
    console.log(`     EV Status: ${ev.status}, EV Value: ${ev.ev}`);
    console.log(`     Trade Grade: ${grade}`);

    const calibrated = calibrateConfidence(75, [
      { confidenceMin: 70, confidenceMax: 79, totalSignals: 10, wins: 6, losses: 4, actualWinRate: 0.60, avgPredictedRR: 1.5, avgActualRR: 1.6, avgExpectedHoldingTime: 2.0, avgActualHoldingTime: 2.1 }
    ]);
    console.log("[OK] Confidence Calibration checked.");
    console.log(`     Raw: ${calibrated.rawConfidence} -> Calibrated: ${calibrated.calibratedConfidence}`);

    // Test 7: Sessions, Events, Risk Guards
    const session = getSessionQuality(new Date());
    const eventRisk = getEconomicEventRisk(new Date());
    const correlation = checkCorrelationExposure('BTCUSDT', 'LONG', [{ asset: 'ETHUSDT', direction: 'LONG' }]);
    const killSwitch = checkGlobalKillSwitch({
      eventRisk: 'LOW',
      reliabilitySuccessRatio: 99.5,
      reliabilityLatencyMs: 80,
      spreadPercent: 0.0002,
      marketRegime: 'TRENDING',
      symbol: 'BTCUSDT'
    });
    console.log("[OK] Risk Guards & Environmental filters computed.");
    console.log(`     Session: ${session.sessionName} (Score: ${session.qualityScore})`);
    console.log(`     Event Risk Level: ${eventRisk.riskLevel}`);
    console.log(`     Correlation Exposure Penalty: ${correlation.penalty}`);
    console.log(`     Kill Switch Active: ${killSwitch.killActive}`);

    console.log("=========================================");
    console.log("ALL TESTS COMPLETED SUCCESSFULLY!");
    console.log("=========================================");

  } catch (error) {
    console.error("UNIT TEST FAILED:", error);
    process.exit(1);
  }
}

runTests();
