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

// Import new governance modules
import { evaluateRiskBudget } from './src/utils/riskBudget.js';
import { processRequestOutcome } from './src/utils/circuitBreaker.js';
import { calculateStrategyHealth, validateMonteCarloGate } from './src/utils/strategyHealth.js';

// 1. Generate 30 mock candle bars
const mockCandles = Array.from({ length: 30 }, (_, i) => {
  const basePrice = 100 + i * 2; // general uptrend
  return {
    time: Date.now() - (30 - i) * 60000,
    open: basePrice,
    high: basePrice + 3,
    low: basePrice - 1,
    close: basePrice + 1,
    volume: 100 + (i === 29 ? 200 : i * 5)
  };
});

async function runTests() {
  console.log("=========================================");
  console.log("RUNNING HARDENED QUANT ENGINE UNIT TESTS");
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

    console.log("\n=========================================");
    console.log("RUNNING INSTITUTIONAL GOVERNANCE SYSTEM MOCK TESTS");
    console.log("=========================================");

    // Test 8: Circuit Breaker Logic Checks
    console.log("\nRunning Circuit Breaker state transitions test...");
    let cbState = {
      currentState: 'HEALTHY',
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      totalQueries: 10,
      successQueries: 10,
      failureQueries: 0
    };

    const mockCBPrisma = {
      dataSourceReliability: {
        findUnique: async () => cbState,
        upsert: async ({ create, update }) => {
          cbState.totalQueries++;
          if (update.totalQueries) cbState.totalQueries += update.totalQueries.increment || 0;
          return cbState;
        },
        update: async ({ data }) => {
          if (data.currentState) cbState.currentState = data.currentState;
          if (data.consecutiveFailures !== undefined) {
            if (typeof data.consecutiveFailures === 'object') {
              cbState.consecutiveFailures += data.consecutiveFailures.increment || 0;
            } else {
              cbState.consecutiveFailures = data.consecutiveFailures;
            }
          }
          if (data.consecutiveSuccesses !== undefined) {
            if (typeof data.consecutiveSuccesses === 'object') {
              cbState.consecutiveSuccesses += data.consecutiveSuccesses.increment || 0;
            } else {
              cbState.consecutiveSuccesses = data.consecutiveSuccesses;
            }
          }
          if (data.successQueries && data.successQueries.increment) cbState.successQueries++;
          if (data.failureQueries && data.failureQueries.increment) cbState.failureQueries++;
          return cbState;
        }
      },
      auditLog: {
        create: async () => ({})
      }
    };

    // Simulate 3 consecutive failures to trigger warnings/degradation
    await processRequestOutcome(mockCBPrisma, 'BINANCE_API', false);
    await processRequestOutcome(mockCBPrisma, 'BINANCE_API', false);
    await processRequestOutcome(mockCBPrisma, 'BINANCE_API', false);
    console.log(`     After 3 consecutive failures, State: ${cbState.currentState}, Failures: ${cbState.consecutiveFailures}`);
    if (cbState.currentState !== 'DEGRADED') throw new Error("Transition to DEGRADED failed!");

    // Simulate 2 more failures to trigger OFFLINE
    await processRequestOutcome(mockCBPrisma, 'BINANCE_API', false);
    await processRequestOutcome(mockCBPrisma, 'BINANCE_API', false);
    console.log(`     After 5 consecutive failures, State: ${cbState.currentState}, Failures: ${cbState.consecutiveFailures}`);
    if (cbState.currentState !== 'OFFLINE') throw new Error("Transition to OFFLINE failed!");

    // Simulate successes to recovery
    await processRequestOutcome(mockCBPrisma, 'BINANCE_API', true);
    await processRequestOutcome(mockCBPrisma, 'BINANCE_API', true);
    await processRequestOutcome(mockCBPrisma, 'BINANCE_API', true);
    console.log(`     After 3 successes while offline, State: ${cbState.currentState}, Successes: ${cbState.consecutiveSuccesses}`);
    if (cbState.currentState !== 'RECOVERY') throw new Error("Transition to RECOVERY failed!");

    for (let i = 0; i < 7; i++) {
      await processRequestOutcome(mockCBPrisma, 'BINANCE_API', true);
    }
    console.log(`     After 10 successes total, State: ${cbState.currentState}, Successes: ${cbState.consecutiveSuccesses}`);
    if (cbState.currentState !== 'HEALTHY') throw new Error("Transition back to HEALTHY failed!");
    console.log("[OK] Circuit Breaker State Machine transitions validated.");


    // Test 9: Portfolio Risk Sizing Engine
    console.log("\nRunning Portfolio Risk Sizing calculations test...");
    
    // Setup Mock Portfolio Database State
    const mockPortfolioState = {
      maxPortfolioRiskPct: 5.0,
      currentCapital: 10000.0,
      activeTrades: 0
    };
    
    const mockActiveLifecycles = [
      { id: '1', analysis: { asset: 'BTCUSDT', entryPrice: 60000.0, stopLoss: 59000.0 } }, // ~1.67% risk
      { id: '2', analysis: { asset: 'ETHUSDT', entryPrice: 3000.0, stopLoss: 2950.0 } }    // ~1.67% risk
    ];

    let mockJournals = [
      { asset: 'BTCUSDT', type: 'BUY_LONG', positionSize: 0.1, entryPrice: 60000.0, stopLoss: 59000.0 } // $100 risk = 1% risk
    ];

    const mockRiskPrisma = {
      portfolioState: {
        findUnique: async () => mockPortfolioState
      },
      signalLifecycle: {
        findMany: async () => mockActiveLifecycles
      },
      tradeJournal: {
        findMany: async () => mockJournals
      },
      assetProfile: {
        findUnique: async ({ where }) => ({
          symbol: where.symbol,
          correlationGroup: where.symbol === 'BTCUSDT' ? 'BTC_GROUP' : 'DEFAULT'
        })
      },
      user: {
        findFirst: async () => ({ tenantId: 'test-tenant' })
      },
      riskDecisionLog: {
        create: async () => ({})
      }
    };

    // Test case 1: Standard risk allocation within budget (active risk 1%, remaining budget 4%)
    const riskEval1 = await evaluateRiskBudget(
      mockRiskPrisma,
      'user_1',
      'SOLUSDT',
      1.0, // Requested 1% risk
      100.0,
      95.0,
      'ALT_GROUP'
    );
    console.log(`     Case 1 (Standard Request): Action = ${riskEval1.action}, Approved Risk = ${riskEval1.approvedRiskPct}%`);
    if (riskEval1.action !== 'APPROVED') throw new Error("Standard risk request should be APPROVED!");

    // Test case 2: Risk budget limits exceeded -> downsize position
    // Increase active risk to 6%
    mockJournals = [
      { asset: 'BTCUSDT', type: 'BUY_LONG', positionSize: 1.0, entryPrice: 60000.0, stopLoss: 59000.0 }, // 1% risk
      { asset: 'ETHUSDT', type: 'BUY_LONG', positionSize: 10.0, entryPrice: 3000.0, stopLoss: 2950.0 }  // 5% risk
    ];
    const riskEval2 = await evaluateRiskBudget(
      mockRiskPrisma,
      'user_1',
      'SOLUSDT',
      3.0,
      100.0,
      95.0,
      'ALT_GROUP'
    );
    console.log(`     Case 2 (Overactive Portfolio): Action = ${riskEval2.action}, Reason: "${riskEval2.reason}"`);
    if (riskEval2.action !== 'REJECTED') throw new Error("Should reject since active portfolio risk exceeds max portfolio risk!");

    // Set active risk to 1% to test downsizing
    mockJournals = [
      { asset: 'BTCUSDT', type: 'BUY_LONG', positionSize: 0.1, entryPrice: 60000.0, stopLoss: 59000.0 } // 1% active risk
    ];
    const riskEval3 = await evaluateRiskBudget(
      mockRiskPrisma,
      'user_1',
      'SOLUSDT',
      3.0, // Requesting 3% risk. Remaining budget: 5% - 1% = 4%. So this should be APPROVED.
      100.0,
      95.0,
      'ALT_GROUP'
    );
    console.log(`     Case 3 (Sufficient Remaining Budget): Action = ${riskEval3.action}, Approved = ${riskEval3.approvedRiskPct}%`);
    if (riskEval3.action !== 'APPROVED') throw new Error("Request within remaining budget should be APPROVED!");

    const riskEval4 = await evaluateRiskBudget(
      mockRiskPrisma,
      'user_1',
      'SOLUSDT',
      5.0, // Requesting 5% risk. Remaining budget is 4%, but group limit is 3%.
      100.0,
      95.0,
      'ALT_GROUP'
    );
    console.log(`     Case 4 (Downsized Request): Action = ${riskEval4.action}, Approved = ${riskEval4.approvedRiskPct}%, Reason: "${riskEval4.reason}"`);
    if (riskEval4.action !== 'DOWNSIZED' || riskEval4.approvedRiskPct !== 3.0) throw new Error("Should downsize to correlation group limit of 3%!");
    console.log("[OK] Portfolio Risk Sizing calculations validated.");


    // Test 10: Strategy Health & Auto Suspension Gate
    console.log("\nRunning Strategy Health and suspension gate test...");
    
    // Simulate low win rate trades (10 consecutive losses to trigger Profit Factor (< 1.0) and Drawdown (> 15%) gates)
    const lowWinTrades = Array.from({ length: 12 }, () => ({
      outcomeStatus: 'LOSS',
      profitLoss: -200.0
    }));
    
    const healthResult1 = calculateStrategyHealth(lowWinTrades);
    console.log(`     Mock Low Win trades: PF = ${healthResult1.profitFactor.toFixed(2)}, Expectancy = ${healthResult1.expectancy.toFixed(2)}, Status = ${healthResult1.status}`);
    if (healthResult1.status !== 'DISABLED') throw new Error("Low win rate should result in DISABLED status!");

    // Simulate high win rate trades
    const highWinTrades = Array.from({ length: 50 }, (_, i) => ({
      outcomeStatus: i % 3 === 0 ? 'LOSS' : 'WIN',
      profitLoss: i % 3 === 0 ? -100.0 : 150.0
    }));

    const healthResult2 = calculateStrategyHealth(highWinTrades);
    console.log(`     Mock High Win trades: PF = ${healthResult2.profitFactor.toFixed(2)}, Expectancy = ${healthResult2.expectancy.toFixed(2)}, Status = ${healthResult2.status}`);
    if (healthResult2.status !== 'HEALTHY') throw new Error("High performance trades should be HEALTHY!");
    console.log("[OK] Strategy Health & Suspension logic verified.");


    // Test 11: Monte Carlo Gate Validation
    console.log("\nRunning Monte Carlo Validation Gate test...");
    const report1 = validateMonteCarloGate(5000, 0.02, 12.5, 1.6);
    console.log(`     Pass Case (5k runs, 2% Ruin, 12.5% DD CI, 1.6 PF): Status = ${report1.status}, Reasons = ${report1.reasons.join(', ')}`);
    if (report1.status !== 'PASSED') throw new Error("Should PASS valid Monte Carlo parameters!");

    const report2 = validateMonteCarloGate(5000, 0.08, 12.5, 1.6);
    console.log(`     Fail Case (8% Ruin Probability): Status = ${report2.status}, Reasons = "${report2.reasons.join(', ')}"`);
    if (report2.status !== 'FAILED') throw new Error("Should FAIL on high ruin probability!");

    const report3 = validateMonteCarloGate(4000, 0.02, 12.5, 1.6);
    console.log(`     Fail Case (4,000 Iterations): Status = ${report3.status}, Reasons = "${report3.reasons.join(', ')}"`);
    if (report3.status !== 'FAILED') throw new Error("Should FAIL on insufficient iterations!");
    console.log("[OK] Monte Carlo Validation Gate checks verified.");

    console.log("\n=========================================");
    console.log("ALL HARDENED SYSTEM TESTS PASSED SUCCESSFULLY!");
    console.log("=========================================");

  } catch (error) {
    console.error("UNIT TEST FAILED:", error);
    process.exit(1);
  }
}

runTests();
