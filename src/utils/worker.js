import { Queue, Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { fetchBinanceCandles } from './binance.js';
import { 
  calculateEMA, 
  calculateRSI, 
  calculateATR, 
  calculateMACD, 
  calculateADX, 
  calculateVolumeSMA, 
  calculateRVOL 
} from './indicators.js';
import { 
  detectSwingPoints, 
  calculateSRZones, 
  calculateFibonacciLevels, 
  detectCandlestickPatterns,
  validateBreakout,
  detectLiquiditySweeps,
  detectLiquidityClusters,
  validateDistanceToSR,
  validateSLDistance,
  calculateSlippageRisk,
  detectNoiseZone
} from './structure.js';
import { classifyMarketRegime } from './regime.js';
import { calculateExpectedValue, determineTradeGrade } from './expectedValue.js';
import { calibrateConfidence } from './confidenceCalibration.js';
import { getSessionQuality } from './sessionQuality.js';
import { getEconomicEventRisk } from './eventRisk.js';
import { fetchFuturesIntel } from './futuresIntel.js';
import { checkCorrelationExposure } from './correlationGuard.js';
import { checkGlobalKillSwitch, logBlockedSignal } from './killSwitch.js';
import { saveReplaySnapshot } from './storage.js';
import { tradeEvents, EVENTS } from './events.js';
import { runMonteCarlo } from './monteCarlo.js';
import IORedis from 'ioredis';

const connectionString = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redisConnection = new IORedis(connectionString, { maxRetriesPerRequest: null });

const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export const analysisQueue = new Queue('analysis-queue', { connection: redisConnection });
export const backtestQueue = new Queue('backtest-queue', { connection: redisConnection });

// Dynamic Asset Personality Settings
const ASSET_PERSONALITY = {
  'BTC': { atrMultiplier: 1.5, volatilityThreshold: 0.01, liquidityTolerance: 0.0010, spreadPercent: 0.0002 },
  'ETH': { atrMultiplier: 1.8, volatilityThreshold: 0.015, liquidityTolerance: 0.0015, spreadPercent: 0.0003 },
  'SOL': { atrMultiplier: 2.0, volatilityThreshold: 0.025, liquidityTolerance: 0.0020, spreadPercent: 0.0004 },
  'DOGE': { atrMultiplier: 2.5, volatilityThreshold: 0.04, liquidityTolerance: 0.0035, spreadPercent: 0.0006 },
  'PEPE': { atrMultiplier: 3.0, volatilityThreshold: 0.06, liquidityTolerance: 0.0050, spreadPercent: 0.0010 }
};

function getAssetParams(symbol) {
  const base = symbol.split('USDT')[0].toUpperCase();
  return ASSET_PERSONALITY[base] || { atrMultiplier: 2.0, volatilityThreshold: 0.03, liquidityTolerance: 0.0025, spreadPercent: 0.0005 };
}

// 1. ANALYSIS SCAN BACKGROUND WORKER
let worker;
if (!global.tradeAnalysisWorker) {
  worker = new Worker('analysis-queue', async job => {
    const { userId, tenantId, strategyVersionId, asset, timeframe, sourceType, explicitLeverage } = job.data;
    console.log(`Starting background scan job for ${asset} (${timeframe}) on user ${userId}`);

    try {
      // Validate leverage explicitly
      if (explicitLeverage === undefined || explicitLeverage === null) {
        throw new Error("Leverage tidak ditentukan. User wajib memilih leverage secara eksplisit.");
      }

      const assetProfile = getAssetParams(asset);

      // Log query attempt to Reliability Monitor
      await prisma.dataSourceReliability.upsert({
        where: { sourceName: 'BINANCE_API' },
        update: { totalQueries: { increment: 1 } },
        create: { sourceName: 'BINANCE_API', totalQueries: 1, successQueries: 1 }
      });

      // Fetch Candle Data
      const fetchResult = await fetchBinanceCandles(asset, timeframe, 200);
      
      // Update latency and success stats
      await prisma.dataSourceReliability.update({
        where: { sourceName: 'BINANCE_API' },
        data: {
          successQueries: fetchResult.success ? { increment: 1 } : undefined,
          failureQueries: !fetchResult.success ? { increment: 1 } : undefined,
          latencyMs: Math.round(fetchResult.latency)
        }
      });

      if (!fetchResult.success) {
        throw new Error(`Candle fetch failed: ${fetchResult.error}`);
      }

      const candles = fetchResult.candles;
      const closePrices = candles.map(c => c.close);

      // Retrieve strategy variables from database
      const version = await prisma.strategyVersion.findUnique({
        where: { id: strategyVersionId },
        include: { weights: true, parameters: true }
      });

      if (!version) {
        throw new Error("Active strategy version not found in database");
      }

      // Convert params list to object map
      const params = {};
      version.parameters.forEach(p => {
        params[p.paramKey] = p.paramValue;
      });

      const weights = {};
      version.weights.forEach(w => {
        weights[w.featureName] = w.weightValue;
      });

      // Quantitative Indicator Engine
      const emaFastPeriod = parseInt(params.emaFastPeriod || '20');
      const emaSlowPeriod = parseInt(params.emaSlowPeriod || '50');
      const rsiPeriod = parseInt(params.rsiPeriod || '14');
      const atrPeriod = parseInt(params.atrPeriod || '14');
      const adxPeriod = parseInt(params.adxPeriod || '14');
      const volumePeriod = parseInt(params.volumePeriod || '20');

      const emaFast = calculateEMA(closePrices, emaFastPeriod);
      const emaSlow = calculateEMA(closePrices, emaSlowPeriod);
      const rsi = calculateRSI(closePrices, rsiPeriod);
      const atr = calculateATR(candles, atrPeriod);
      const adx = calculateADX(candles, adxPeriod);
      const volumeSMA = calculateVolumeSMA(candles, volumePeriod);
      const rvol = calculateRVOL(candles, volumePeriod);
      const macd = calculateMACD(closePrices);

      const latestPrice = closePrices[closePrices.length - 1];
      const latestRsi = rsi[rsi.length - 1] || 50;
      const latestAtr = atr[atr.length - 1] || (latestPrice * 0.01);
      const latestRvol = rvol[rvol.length - 1] || 1.0;

      // Structural elements
      const { peaks, troughs } = detectSwingPoints(candles);
      const srZones = calculateSRZones(peaks, troughs);
      const fib = calculateFibonacciLevels(candles);
      const candlePatterns = detectCandlestickPatterns(candles);
      const liquidityClusters = detectLiquidityClusters(peaks, troughs, assetProfile);
      const liquiditySweeps = detectLiquiditySweeps(candles, { peaks, troughs });
      const isNoise = detectNoiseZone(candles, latestAtr);

      // Market regime classification
      const regimeData = classifyMarketRegime(candles, adx, atr, emaFast, emaSlow);
      const marketRegime = regimeData.regime;

      // Futures Crowding Data
      const futuresIntel = await fetchFuturesIntel(asset);

      // Global Event macro risks
      const eventRisk = getEconomicEventRisk(new Date());

      // Session evaluation
      const session = getSessionQuality(new Date());

      // Portfolio Concentration and Correlation guard
      const activeLifecycles = await prisma.signalLifecycle.findMany({
        where: { currentState: { in: ['TRIGGERED', 'EXECUTED'] } },
        include: { analysis: true }
      });
      const activeTrades = activeLifecycles.map(l => ({
        asset: l.analysis.asset,
        direction: l.analysis.signal === 'BUY_LONG' ? 'LONG' : 'SHORT'
      }));

      const trendIsBullish = emaFast[emaFast.length - 1] > emaSlow[emaSlow.length - 1];
      const tradeDirection = trendIsBullish ? 'LONG' : 'SHORT';
      const correlationRisk = checkCorrelationExposure(asset, tradeDirection, activeTrades);

      // Consecutive Loss Protection
      const lastSignals = await prisma.signalLifecycle.findMany({
        where: { 
          analysis: { userId },
          currentState: 'CLOSED',
          outcomeStatus: { not: null }
        },
        orderBy: { updatedAt: 'desc' },
        take: 7
      });

      let consecutiveLosses = 0;
      for (const sig of lastSignals) {
        if (sig.outcomeStatus === 'LOSS') {
          consecutiveLosses++;
        } else {
          break;
        }
      }

      let defensiveLossPenalty = 0;
      let defensiveModeActive = false;
      if (consecutiveLosses >= 7) {
        const killMsg = `Worker Blocked: Strategy level kill switch triggered due to ${consecutiveLosses} consecutive losses.`;
        await logBlockedSignal(prisma, userId, asset, ["CONSECUTIVE_LOSS_STRATEGY_KILL_SWITCH"], killMsg);
        return { status: "REJECTED", reason: killMsg };
      } else if (consecutiveLosses >= 5) {
        defensiveModeActive = true;
      } else if (consecutiveLosses >= 3) {
        defensiveLossPenalty = 15;
      }

      // Global Kill Switch validation
      const binanceReliability = await prisma.dataSourceReliability.findUnique({
        where: { sourceName: 'BINANCE_API' }
      });
      const reliabilityRatio = binanceReliability 
        ? (binanceReliability.successQueries / (binanceReliability.totalQueries || 1)) * 100 
        : 100;
      const reliabilityLatency = binanceReliability ? binanceReliability.latencyMs : 100;

      const killSwitch = checkGlobalKillSwitch({
        eventRisk: eventRisk.riskLevel,
        reliabilitySuccessRatio: reliabilityRatio,
        reliabilityLatencyMs: reliabilityLatency,
        spreadPercent: assetProfile.spreadPercent,
        marketRegime,
        symbol: asset
      });

      if (killSwitch.killActive) {
        await logBlockedSignal(prisma, userId, asset, killSwitch.reasons, killSwitch.message);
        return { status: "REJECTED", reason: `Kill Switch Activated: ${killSwitch.reasons.join(', ')}` };
      }

      // Aggregate 10-Component Scoring Engine
      const scores = [];

      // Component 1: EMA Alignment
      const emaScoreVal = trendIsBullish ? 100 : 0;
      scores.push({
        name: 'EMA_ALIGNMENT',
        weight: weights.EMA_ALIGNMENT || 0.15,
        rawScore: emaScoreVal,
        weightedScore: emaScoreVal * (weights.EMA_ALIGNMENT || 0.15),
        met: emaScoreVal > 50
      });

      // Component 2: RSI Exhaustion
      let rsiScoreVal = 50;
      if (trendIsBullish && latestRsi < 40) rsiScoreVal = 100;
      if (!trendIsBullish && latestRsi > 70) rsiScoreVal = 100;
      scores.push({
        name: 'RSI_EXHAUSTION',
        weight: weights.RSI_EXHAUSTION || 0.10,
        rawScore: rsiScoreVal,
        weightedScore: rsiScoreVal * (weights.RSI_EXHAUSTION || 0.10),
        met: rsiScoreVal > 50
      });

      // Component 3: Candlestick Confluence
      const hasPatterns = candlePatterns.length > 0;
      const patternScoreVal = hasPatterns ? 100 : 0;
      scores.push({
        name: 'CANDLESTICK_CONFLUENCE',
        weight: weights.CANDLESTICK_CONFLUENCE || 0.10,
        rawScore: patternScoreVal,
        weightedScore: patternScoreVal * (weights.CANDLESTICK_CONFLUENCE || 0.10),
        met: hasPatterns
      });

      // Component 4: Volume Confirmation
      let volumeScoreVal = 40;
      if (latestRvol > 1.5) volumeScoreVal = 100;
      else if (latestRvol >= 1.0) volumeScoreVal = 70;
      scores.push({
        name: 'VOLUME_CONFIRMATION',
        weight: weights.VOLUME_CONFIRMATION || 0.12,
        rawScore: volumeScoreVal,
        weightedScore: volumeScoreVal * (weights.VOLUME_CONFIRMATION || 0.12),
        met: latestRvol >= 1.0
      });

      // Component 5: Breakout
      const activeLevelZone = tradeDirection === 'LONG' 
        ? srZones.find(z => z.type === 'RESISTANCE' && z.centerPrice > latestPrice) 
        : srZones.find(z => z.type === 'SUPPORT' && z.centerPrice < latestPrice);
      
      let structureScoreVal = 50;
      let boCheck = { isValid: true, penalty: 0 };
      if (activeLevelZone) {
        boCheck = validateBreakout(candles, rvol, tradeDirection, activeLevelZone.centerPrice);
        structureScoreVal = boCheck.isValid ? 100 : Math.max(0, 100 - boCheck.penalty);
      }
      scores.push({
        name: 'MARKET_STRUCTURE',
        weight: weights.MARKET_STRUCTURE || 0.12,
        rawScore: structureScoreVal,
        weightedScore: structureScoreVal * (weights.MARKET_STRUCTURE || 0.12),
        met: boCheck.isValid
      });

      // Component 6: Liquidity Sweeps
      const sweepCount = liquiditySweeps.length;
      const clusterCount = liquidityClusters.filter(c => c.type === (tradeDirection === 'LONG' ? 'SUPPORT' : 'RESISTANCE')).length;
      let liquidityScoreVal = 50;
      if (sweepCount > 0 && clusterCount > 0) liquidityScoreVal = 100;
      else if (sweepCount > 0) liquidityScoreVal = 80;
      else if (clusterCount > 0) liquidityScoreVal = 65;
      scores.push({
        name: 'LIQUIDITY_CONFLUENCE',
        weight: weights.LIQUIDITY_CONFLUENCE || 0.10,
        rawScore: liquidityScoreVal,
        weightedScore: liquidityScoreVal * (weights.LIQUIDITY_CONFLUENCE || 0.10),
        met: sweepCount > 0 || clusterCount > 0
      });

      // Component 7: Distance to S/R
      const distanceCheck = validateDistanceToSR(latestPrice, srZones, tradeDirection, 0.005);
      const distanceScoreVal = distanceCheck.tooClose ? 20 : 100;
      scores.push({
        name: 'SR_DISTANCE',
        weight: weights.SR_DISTANCE || 0.08,
        rawScore: distanceScoreVal,
        weightedScore: distanceScoreVal * (weights.SR_DISTANCE || 0.08),
        met: !distanceCheck.tooClose
      });

      // Component 8: ADX Regime
      let regimeScoreVal = 50;
      if (marketRegime === 'TRENDING') regimeScoreVal = 100;
      else if (marketRegime === 'RANGING') regimeScoreVal = 75;
      else if (marketRegime === 'DEAD_MARKET') regimeScoreVal = 30;
      scores.push({
        name: 'ADX_REGIME',
        weight: weights.ADX_REGIME || 0.08,
        rawScore: regimeScoreVal,
        weightedScore: regimeScoreVal * (weights.ADX_REGIME || 0.08),
        met: regimeScoreVal >= 70
      });

      // Component 9: Futures Intel
      const crowdIntelScoreVal = Math.max(0, 100 - futuresIntel.crowdingRiskScore);
      scores.push({
        name: 'FUTURES_INTEL',
        weight: weights.FUTURES_INTEL || 0.08,
        rawScore: crowdIntelScoreVal,
        weightedScore: crowdIntelScoreVal * (weights.FUTURES_INTEL || 0.08),
        met: crowdIntelScoreVal >= 60
      });

      // Component 10: Session quality
      const sessionScoreVal = session.qualityScore;
      scores.push({
        name: 'SESSION_QUALITY',
        weight: weights.SESSION_QUALITY || 0.07,
        rawScore: sessionScoreVal,
        weightedScore: sessionScoreVal * (weights.SESSION_QUALITY || 0.07),
        met: sessionScoreVal >= 75
      });

      // Sum weighted confidence
      const sumWeighted = scores.reduce((sum, s) => sum + s.weightedScore, 0);
      let rawConfidence = Math.round(sumWeighted);

      // Penalties
      rawConfidence = Math.max(0, rawConfidence - defensiveLossPenalty - correlationRisk.penalty - eventRisk.penalty - session.penalty);

      // Calibrate
      const calibrationBins = await prisma.confidenceCalibration.findMany();
      const calibration = calibrateConfidence(rawConfidence, calibrationBins);
      const finalConfidence = calibration.calibratedConfidence;

      // Expirations & SL
      let signal = 'NO TRADE';
      let entryPrice = null;
      let stopLoss = null;
      let tp1 = null;
      let tp2 = null;
      let tp3 = null;
      let targetRR = 0;
      let slippage = null;

      if (finalConfidence >= version.minConfidence && !isNoise) {
        entryPrice = latestPrice;
        if (tradeDirection === 'LONG') {
          signal = 'BUY_LONG';
          const supportZone = srZones.find(z => z.type === 'SUPPORT' && z.centerPrice < latestPrice);
          stopLoss = supportZone ? supportZone.centerPrice : latestPrice - (assetProfile.atrMultiplier * latestAtr);
        } else {
          signal = 'SELL_SHORT';
          const resistanceZone = srZones.find(z => z.type === 'RESISTANCE' && z.centerPrice > latestPrice);
          stopLoss = resistanceZone ? resistanceZone.centerPrice : latestPrice + (assetProfile.atrMultiplier * latestAtr);
        }

        const slAtrValidation = validateSLDistance(entryPrice, stopLoss, latestAtr, assetProfile.atrMultiplier);
        if (!slAtrValidation.isValid) {
          stopLoss = tradeDirection === 'LONG' 
            ? entryPrice - (assetProfile.atrMultiplier * latestAtr) 
            : entryPrice + (assetProfile.atrMultiplier * latestAtr);
        }

        const riskAmt = Math.abs(entryPrice - stopLoss);
        if (riskAmt > 0) {
          tp1 = tradeDirection === 'LONG' ? entryPrice + riskAmt * 1.5 : entryPrice - riskAmt * 1.5;
          tp2 = tradeDirection === 'LONG' ? entryPrice + riskAmt * 2.0 : entryPrice - riskAmt * 2.0;
          tp3 = tradeDirection === 'LONG' ? entryPrice + riskAmt * 3.0 : entryPrice - riskAmt * 3.0;
          
          slippage = calculateSlippageRisk(entryPrice, stopLoss, tp1, latestAtr, assetProfile.spreadPercent);
          targetRR = slippage ? slippage.adjustedRR : 0;
        }
      }

      // Check capital preservation
      if (signal !== 'NO TRADE' && targetRR < version.minRiskReward) {
        signal = 'NO TRADE';
        entryPrice = null;
        stopLoss = null;
        tp1 = null;
        tp2 = null;
        tp3 = null;
      }

      // Expected Value
      const totalSignalsAgg = calibrationBins.reduce((sum, b) => sum + b.totalSignals, 0);
      const winsAgg = calibrationBins.reduce((sum, b) => sum + b.wins, 0);
      const actualWinRate = totalSignalsAgg > 0 ? winsAgg / totalSignalsAgg : 0.50;

      const mockHistStats = { actualWinRate, avgActualRR: 1.8, regimePerformance: {} };
      const ev = calculateExpectedValue(mockHistStats, marketRegime);
      const finalGrade = determineTradeGrade(finalConfidence, ev.status);

      // Block if defensive mode restricts low grades
      if (defensiveModeActive && !['A', 'A+'].includes(finalGrade) && signal !== 'NO TRADE') {
        const blockMsg = `Defensive Mode Rejection: Grade is ${finalGrade} in background worker.`;
        await logBlockedSignal(prisma, userId, asset, ["DEFENSIVE_MODE_GRADE_REJECTION"], blockMsg);
        signal = 'NO TRADE';
        entryPrice = null;
        stopLoss = null;
        tp1 = null;
        tp2 = null;
        tp3 = null;
      }

      // Monte Carlo check
      const monteWinRate = finalConfidence > 0 ? finalConfidence : 50;
      const monteCarloResult = runMonteCarlo(
        monteWinRate,
        100 * (targetRR || 1.5),
        100,
        100,
        1000,
        10000
      );

      if (monteCarloResult.drawdown20Prob > (version.maxDrawdownLmt || 15.0) && signal !== 'NO TRADE') {
        const ddMsg = `Monte Carlo Limit Exceeded: drawdown probability is ${monteCarloResult.drawdown20Prob.toFixed(1)}% (Limit: ${version.maxDrawdownLmt}%)`;
        await logBlockedSignal(prisma, userId, asset, ["MONTE_CARLO_DRAWDOWN_BREACH"], ddMsg);
        signal = 'NO TRADE';
        entryPrice = null;
        stopLoss = null;
        tp1 = null;
        tp2 = null;
        tp3 = null;
      }

      // Save Analysis
      const analysis = await prisma.analysis.create({
        data: {
          userId,
          tenantId,
          strategyVerId: strategyVersionId,
          asset,
          timeframe,
          sourceType,
          signal,
          grade: finalGrade,
          confidence: finalConfidence,
          marketRegime: marketRegime + " - " + ev.status,
          marketQuality: Math.round(finalConfidence * 0.9),
          liquidityRisk: isNoise ? 'NOISE_ZONE' : slippage ? slippage.riskScore : 'LOW',
          entryPrice,
          stopLoss,
          tp1,
          tp2,
          tp3,
          riskReward: targetRR,
          aiReasons: `Background Scan: EV is ${ev.status}. ${regimeData.description}`,
          aiRisks: `Slippage Risk: ${slippage?.riskScore || 'LOW'}`
        }
      });

      // Write components
      await Promise.all(scores.map(s => 
        prisma.analysisScoreComponent.create({
          data: {
            analysisId: analysis.id,
            componentName: s.name,
            weight: s.weight,
            rawScore: s.rawScore,
            weightedScore: s.weightedScore,
            isCriteriaMet: s.met
          }
        })
      ));

      // Save compressed ReplaySnapshot
      const indicatorMap = { 
        emaFast, emaSlow, rsi, macd, atr, adx, volumeSMA, rvol, 
        srZones, fib, liquidityClusters, liquiditySweeps 
      };
      const storagePath = await saveReplaySnapshot(analysis.id, candles, indicatorMap);
      
      await prisma.replaySnapshot.create({
        data: {
          analysisId: analysis.id,
          storagePath,
          compressed: true
        }
      });

      // Expiration minutes mapping
      const tfMinutesMap = { '5m': 5, '15m': 15, '30m': 30, '1h': 60, '4h': 240, '1d': 1440 };
      const tfMin = tfMinutesMap[timeframe] || 60;
      const expMinutes = Math.round(tfMin * (latestAtr / latestPrice * 100) * 3);
      const expirationTime = new Date(Date.now() + Math.max(30, expMinutes) * 60000);

      // Save lifecycle
      await prisma.signalLifecycle.create({
        data: {
          analysisId: analysis.id,
          currentState: signal === 'NO TRADE' ? 'CLOSED' : 'PENDING',
          expirationTime,
          expirationCandleCount: Math.ceil(expMinutes / tfMin),
          predictedRR: targetRR,
          expectedHoldingTime: expMinutes / 60,
          decayHistory: JSON.stringify([{ time: new Date().toISOString(), confidence: finalConfidence }])
        }
      });

      // Update ML telemetry counters
      await Promise.all(scores.map(async s => {
        await prisma.featurePerformance.upsert({
          where: { featureName: s.name },
          update: {
            timesTriggered: { increment: 1 },
            contributionScore: { increment: s.weightedScore / 10 }
          },
          create: {
            featureName: s.name,
            timesTriggered: 1,
            contributionScore: s.weightedScore / 10
          }
        });
      }));

      // Dispatch decoupled events
      tradeEvents.emit(EVENTS.SIGNAL_CREATED, { analysis, signal });

      return { status: "COMPLETED", analysisId: analysis.id, signal };

    } catch (err) {
      console.error("Worker process error:", err);
      throw err;
    }
  }, { connection: redisConnection });

  global.tradeAnalysisWorker = worker;
}

// 2. BACKTEST QUEUE BACKGROUND WORKER
let backtestWorker;
if (!global.backtestWorkerInstance) {
  backtestWorker = new Worker('backtest-queue', async job => {
    const { userId, strategyVersionId, asset, timeframe, candleCount = 300 } = job.data;
    console.log(`Starting historical backtest for ${asset} (${timeframe}) on user ${userId}`);

    try {
      const fetchResult = await fetchBinanceCandles(asset, timeframe, candleCount);
      if (!fetchResult.success) {
        throw new Error(`Failed to fetch candles for backtest: ${fetchResult.error}`);
      }

      const candles = fetchResult.candles;
      const closePrices = candles.map(c => c.close);

      const version = await prisma.strategyVersion.findUnique({
        where: { id: strategyVersionId },
        include: { weights: true, parameters: true }
      });
      if (!version) throw new Error("Strategy version not found");

      const params = {};
      version.parameters.forEach(p => { params[p.paramKey] = p.paramValue; });
      const weights = {};
      version.weights.forEach(w => { weights[w.featureName] = w.weightValue; });

      const emaFastPeriod = parseInt(params.emaFastPeriod || '20');
      const emaSlowPeriod = parseInt(params.emaSlowPeriod || '50');
      const rsiPeriod = parseInt(params.rsiPeriod || '14');
      const atrPeriod = parseInt(params.atrPeriod || '14');

      const minConfidence = version.minConfidence || 60;
      const minRR = version.minRiskReward || 1.5;

      const emaFast = calculateEMA(closePrices, emaFastPeriod);
      const emaSlow = calculateEMA(closePrices, emaSlowPeriod);
      const rsi = calculateRSI(closePrices, rsiPeriod);
      const atr = calculateATR(candles, atrPeriod);

      let trades = [];
      let totalTrades = 0;
      let wins = 0;
      let losses = 0;
      let equity = 10000;
      let peakEquity = 10000;
      let maxDrawdown = 0;

      const startIdx = Math.max(emaSlowPeriod, rsiPeriod, atrPeriod) + 1;
      let activeTrade = null;

      for (let i = startIdx; i < candles.length; i++) {
        const candle = candles[i];
        
        if (activeTrade) {
          const high = candle.high;
          const low = candle.low;

          if (activeTrade.type === 'BUY_LONG') {
            if (low <= activeTrade.sl) {
              const lossAmt = (activeTrade.entry - activeTrade.sl) * activeTrade.size;
              equity -= lossAmt;
              losses++;
              trades.push({ ...activeTrade, exitPrice: activeTrade.sl, exitTime: candle.time, result: 'LOSS', pnl: -lossAmt, equity });
              activeTrade = null;
            } else if (high >= activeTrade.tp) {
              const winAmt = (activeTrade.tp - activeTrade.entry) * activeTrade.size;
              equity += winAmt;
              wins++;
              trades.push({ ...activeTrade, exitPrice: activeTrade.tp, exitTime: candle.time, result: 'WIN', pnl: winAmt, equity });
              activeTrade = null;
            }
          } else if (activeTrade.type === 'SELL_SHORT') {
            if (high >= activeTrade.sl) {
              const lossAmt = (activeTrade.sl - activeTrade.entry) * activeTrade.size;
              equity -= lossAmt;
              losses++;
              trades.push({ ...activeTrade, exitPrice: activeTrade.sl, exitTime: candle.time, result: 'LOSS', pnl: -lossAmt, equity });
              activeTrade = null;
            } else if (low <= activeTrade.tp) {
              const winAmt = (activeTrade.entry - activeTrade.tp) * activeTrade.size;
              equity += winAmt;
              wins++;
              trades.push({ ...activeTrade, exitPrice: activeTrade.tp, exitTime: candle.time, result: 'WIN', pnl: winAmt, equity });
              activeTrade = null;
            }
          }

          if (equity > peakEquity) peakEquity = equity;
          const dd = ((peakEquity - equity) / peakEquity) * 100;
          if (dd > maxDrawdown) maxDrawdown = dd;
          continue;
        }

        const cPrice = candle.close;
        const eFastVal = emaFast[i];
        const eSlowVal = emaSlow[i];
        const rsiVal = rsi[i];
        const atrVal = atr[i];

        if (!eFastVal || !eSlowVal || !rsiVal || !atrVal) continue;

        const isBullishTrend = cPrice > eFastVal && eFastVal > eSlowVal;
        const isBearishTrend = cPrice < eFastVal && eFastVal < eSlowVal;

        let emaScore = 0;
        let trend = 'NEUTRAL';
        if (isBullishTrend) { emaScore = 100; trend = 'BULLISH'; }
        else if (isBearishTrend) { emaScore = 100; trend = 'BEARISH'; }

        let rsiScore = 0;
        if (trend === 'BULLISH' && rsiVal < 45) rsiScore = 100;
        else if (trend === 'BEARISH' && rsiVal > 55) rsiScore = 100;

        let patternScore = 50;

        const confidence = Math.round(
          (emaScore * (weights.EMA_ALIGNMENT || 0.35)) +
          (rsiScore * (weights.RSI_EXHAUSTION || 0.30)) +
          (patternScore * (weights.CANDLESTICK_CONFLUENCE || 0.35))
        );

        if (confidence >= minConfidence && trend !== 'NEUTRAL') {
          const tradeType = trend === 'BULLISH' ? 'BUY_LONG' : 'SELL_SHORT';
          const riskDistance = atrVal * 1.5;
          const sl = tradeType === 'BUY_LONG' ? cPrice - riskDistance : cPrice + riskDistance;
          const tp = tradeType === 'BUY_LONG' ? cPrice + (riskDistance * minRR) : cPrice - (riskDistance * minRR);

          const riskAmount = equity * 0.01;
          const priceDiff = Math.abs(cPrice - sl);
          const size = riskAmount / priceDiff;

          activeTrade = {
            type: tradeType,
            entry: cPrice,
            sl,
            tp,
            size,
            riskAmount,
            entryTime: candle.time
          };
          totalTrades++;
        }
      }

      const winRate = totalTrades > 0 ? (wins / (wins + losses)) * 100 : 0;
      const profitFactor = wins > 0 && losses > 0 ? (wins * minRR) / losses : 1.0;

      await prisma.backtestResult.create({
        data: {
          userId,
          strategyVersionId,
          asset,
          timeframe,
          winRate: Math.round(winRate * 100) / 100,
          profitFactor: Math.round(profitFactor * 100) / 100,
          totalTrades,
          metricsJSON: JSON.stringify({
            trades,
            maxDrawdown: Math.round(maxDrawdown * 100) / 100,
            wins,
            losses,
            endingCapital: Math.round(equity * 100) / 100
          })
        }
      });

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'RUN_BACKTEST',
          details: `Completed historical backtest for ${asset} (${timeframe}) with Win Rate of ${winRate.toFixed(2)}% over ${totalTrades} trades.`
        }
      });

      await prisma.notification.create({
        data: {
          userId,
          title: `Uji Backtest Selesai (${asset})`,
          message: `Backtest ${asset} (${timeframe}) selesai dengan win-rate ${winRate.toFixed(1)}% dari ${totalTrades} perdagangan.`,
          type: 'INFO'
        }
      });

    } catch (error) {
      console.error("Backtest Worker Error:", error);
    }
  }, { connection: redisConnection });

  global.backtestWorkerInstance = backtestWorker;
}

// 3. PERIODIC SIGNAL EXPIRATION TIMER
async function runSignalExpirationCheck() {
  try {
    const expiredCount = await prisma.$transaction(async (tx) => {
      const expiredLifecycles = await tx.signalLifecycle.findMany({
        where: {
          currentState: 'PENDING',
          expirationTime: { lte: new Date() }
        },
        include: { analysis: true }
      });

      if (expiredLifecycles.length === 0) return 0;

      const ids = expiredLifecycles.map(l => l.id);
      
      await tx.signalLifecycle.updateMany({
        where: { id: { in: ids } },
        data: { currentState: 'EXPIRED' }
      });

      for (const lifecycle of expiredLifecycles) {
        if (lifecycle.analysis.userId) {
          await tx.portfolioState.updateMany({
            where: { userId: lifecycle.analysis.userId },
            data: {
              activeTrades: { decrement: 1 }
            }
          });
        }
      }

      return expiredLifecycles.length;
    });

    if (expiredCount > 0) {
      console.log(`[Signal Expiration] Successfully expired ${expiredCount} pending signals.`);
    }
  } catch (error) {
    console.error("[Signal Expiration Checker Error]:", error);
  }
}

// Start periodic checks
if (!global.expirationIntervalRunning) {
  setInterval(runSignalExpirationCheck, 5 * 60 * 1000);
  global.expirationIntervalRunning = true;
}

export default worker;
