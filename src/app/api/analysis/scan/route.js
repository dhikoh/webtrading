import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser } from '@/utils/auth';
import { fetchBinanceCandles } from '@/utils/binance';
import { 
  calculateEMA, 
  calculateRSI, 
  calculateATR, 
  calculateMACD, 
  calculateADX, 
  calculateVolumeSMA, 
  calculateRVOL 
} from '@/utils/indicators';
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
} from '@/utils/structure';
import { classifyMarketRegime } from '@/utils/regime';
import { calculateExpectedValue, determineTradeGrade } from '@/utils/expectedValue';
import { calibrateConfidence } from '@/utils/confidenceCalibration';
import { getSessionQuality } from '@/utils/sessionQuality';
import { getEconomicEventRisk } from '@/utils/eventRisk';
import { fetchFuturesIntel } from '@/utils/futuresIntel';
import { checkCorrelationExposure } from '@/utils/correlationGuard';
import { checkGlobalKillSwitch, logBlockedSignal } from '@/utils/killSwitch';
import { saveReplaySnapshot } from '@/utils/storage';
import tradeEvents, { EVENTS } from '@/utils/events';
import { runMonteCarlo } from '@/utils/monteCarlo';

const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

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

// Safety check to ensure a strategy is always present with all 10 quantitative weights
async function getOrCreateActiveStrategy() {
  let activeVersion = await prisma.strategyVersion.findFirst({
    where: { isActive: true },
    include: { weights: true, parameters: true }
  });

  if (!activeVersion) {
    let registry = await prisma.strategyRegistry.findFirst({
      where: { name: 'Institutional Hardened Strategy' }
    });

    if (!registry) {
      registry = await prisma.strategyRegistry.create({
        data: {
          name: 'Institutional Hardened Strategy',
          description: '10-factor Confluence & Calibration Trade Engine'
        }
      });
    }

    activeVersion = await prisma.strategyVersion.create({
      data: {
        strategyId: registry.id,
        versionString: 'v1.1.0',
        isActive: true,
        minConfidence: 61,
        minRiskReward: 1.5,
        maxDrawdownLmt: 15.0,
        parameters: {
          createMany: {
            data: [
              { paramKey: 'emaFastPeriod', paramValue: '20' },
              { paramKey: 'emaSlowPeriod', paramValue: '50' },
              { paramKey: 'rsiPeriod', paramValue: '14' },
              { paramKey: 'atrPeriod', paramValue: '14' },
              { paramKey: 'adxPeriod', paramValue: '14' },
              { paramKey: 'volumePeriod', paramValue: '20' }
            ]
          }
        },
        weights: {
          createMany: {
            data: [
              { featureName: 'EMA_ALIGNMENT', weightValue: 0.15 },
              { featureName: 'RSI_EXHAUSTION', weightValue: 0.10 },
              { featureName: 'CANDLESTICK_CONFLUENCE', weightValue: 0.10 },
              { featureName: 'VOLUME_CONFIRMATION', weightValue: 0.12 },
              { featureName: 'MARKET_STRUCTURE', weightValue: 0.12 },
              { featureName: 'LIQUIDITY_CONFLUENCE', weightValue: 0.10 },
              { featureName: 'SR_DISTANCE', weightValue: 0.08 },
              { featureName: 'ADX_REGIME', weightValue: 0.08 },
              { featureName: 'FUTURES_INTEL', weightValue: 0.08 },
              { featureName: 'SESSION_QUALITY', weightValue: 0.07 }
            ]
          }
        }
      },
      include: { weights: true, parameters: true }
    });
  }

  // Ensure all 10 features exist if version existed before but was incomplete
  const requiredWeights = [
    'EMA_ALIGNMENT', 'RSI_EXHAUSTION', 'CANDLESTICK_CONFLUENCE', 'VOLUME_CONFIRMATION',
    'MARKET_STRUCTURE', 'LIQUIDITY_CONFLUENCE', 'SR_DISTANCE', 'ADX_REGIME',
    'FUTURES_INTEL', 'SESSION_QUALITY'
  ];

  const currentWeightNames = activeVersion.weights.map(w => w.featureName);
  const missingWeights = requiredWeights.filter(w => !currentWeightNames.includes(w));

  if (missingWeights.length > 0) {
    const defaultWeightValues = {
      'EMA_ALIGNMENT': 0.15, 'RSI_EXHAUSTION': 0.10, 'CANDLESTICK_CONFLUENCE': 0.10, 'VOLUME_CONFIRMATION': 0.12,
      'MARKET_STRUCTURE': 0.12, 'LIQUIDITY_CONFLUENCE': 0.10, 'SR_DISTANCE': 0.08, 'ADX_REGIME': 0.08,
      'FUTURES_INTEL': 0.08, 'SESSION_QUALITY': 0.07
    };
    
    await Promise.all(missingWeights.map(w => 
      prisma.featureWeight.create({
        data: {
          versionId: activeVersion.id,
          featureName: w,
          weightValue: defaultWeightValues[w]
        }
      })
    ));

    activeVersion = await prisma.strategyVersion.findUnique({
      where: { id: activeVersion.id },
      include: { weights: true, parameters: true }
    });
  }

  return activeVersion;
}

export async function POST(req) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      asset = 'BTCUSDT', 
      timeframe = '1h', 
      sourceType = 'LIVE_API', 
      imageBase64, 
      ocrResult: clientOcrResult,
      explicitLeverage // Required field: leverage chosen explicitly by user
    } = body;

    // Validate leverage (no default assumption, 1x is only a placeholder in UI)
    if (explicitLeverage === undefined || explicitLeverage === null) {
      return NextResponse.json({ 
        error: "Leverage tidak ditentukan. Anda wajib memilih leverage secara eksplisit sebelum memicu analisis." 
      }, { status: 400 });
    }

    // 1. Resolve strategy version
    const version = await getOrCreateActiveStrategy();
    
    // Parse params & weights
    const params = {};
    version.parameters.forEach(p => { params[p.paramKey] = p.paramValue; });

    const weights = {};
    version.weights.forEach(w => { weights[w.featureName] = w.weightValue; });

    let detectedTicker = asset.toUpperCase();
    let detectedTimeframe = timeframe;
    let visualObservations = null;

    // 2. OCR Validation Hardening
    if (sourceType === 'OCR_UPLOAD') {
      let ocrData = clientOcrResult;

      // Fallback to direct Gemini image analysis if OCR is not pre-processed
      if (!ocrData && imageBase64) {
        await prisma.dataSourceReliability.upsert({
          where: { sourceName: 'GEMINI_OCR' },
          update: { totalQueries: { increment: 1 } },
          create: { sourceName: 'GEMINI_OCR', totalQueries: 1 }
        });

        const ocrApiKey = process.env.GEMINI_API_KEY;
        const ocrResult = await analyzeChartImageWithGemini(ocrApiKey, imageBase64);

        if (ocrResult.success && ocrResult.data) {
          ocrData = ocrResult.data;
          await prisma.dataSourceReliability.update({
            where: { sourceName: 'GEMINI_OCR' },
            data: {
              successQueries: { increment: 1 },
              latencyMs: Math.round(ocrResult.latency)
            }
          });
        } else {
          await prisma.dataSourceReliability.update({
            where: { sourceName: 'GEMINI_OCR' },
            data: { failureQueries: { increment: 1 } }
          });
          
          await logBlockedSignal(prisma, authUser.userId, detectedTicker, ["OCR_API_FAILURE"], "Gemini vision call failed.");
          return NextResponse.json({ error: `AI Vision Error: ${ocrResult.error || 'Failed to scan image'}` }, { status: 400 });
        }
      }

      if (ocrData) {
        // Enforce OCR confidence thresholds
        const tickerConf = ocrData.tickerConfidence !== undefined ? ocrData.tickerConfidence : 100;
        const tfConf = ocrData.timeframeConfidence !== undefined ? ocrData.timeframeConfidence : 100;
        const patConf = ocrData.patternConfidence !== undefined ? ocrData.patternConfidence : 100;

        if (tickerConf < 90 || tfConf < 90 || patConf < 85) {
          const rejectMsg = `OCR Validation Rejected: tickerConfidence(${tickerConf} < 90), timeframeConfidence(${tfConf} < 90), or patternConfidence(${patConf} < 85)`;
          await logBlockedSignal(prisma, authUser.userId, detectedTicker, ["OCR_CONFIDENCE_THRESHOLD_VIOLATION"], rejectMsg);
          return NextResponse.json({ 
            error: "Deteksi OCR tidak memenuhi standar akurasi institusional. Harap unggah ulang tangkapan layar bagan yang lebih bersih." 
          }, { status: 400 });
        }

        visualObservations = ocrData;
        if (ocrData.detectedTicker) detectedTicker = ocrData.detectedTicker.toUpperCase();
        if (ocrData.detectedTimeframe) detectedTimeframe = ocrData.detectedTimeframe.toLowerCase();
      }
    }

    // Get asset-specific volatility parameters
    const assetProfile = getAssetParams(detectedTicker);

    // 3. Fetch Candles from Binance
    await prisma.dataSourceReliability.upsert({
      where: { sourceName: 'BINANCE_API' },
      update: { totalQueries: { increment: 1 } },
      create: { sourceName: 'BINANCE_API', totalQueries: 1 }
    });

    const fetchResult = await fetchBinanceCandles(detectedTicker, detectedTimeframe, 150);
    
    await prisma.dataSourceReliability.update({
      where: { sourceName: 'BINANCE_API' },
      data: {
        successQueries: fetchResult.success ? { increment: 1 } : undefined,
        failureQueries: !fetchResult.success ? { increment: 1 } : undefined,
        latencyMs: Math.round(fetchResult.latency)
      }
    });

    if (!fetchResult.success) {
      await logBlockedSignal(prisma, authUser.userId, detectedTicker, ["DATA_SOURCE_UNAVAILABLE"], `Binance fetch failed: ${fetchResult.error}`);
      return NextResponse.json({ error: `Gagal menarik data lilin Binance: ${fetchResult.error}` }, { status: 400 });
    }

    const candles = fetchResult.candles;
    const closePrices = candles.map(c => c.close);

    // 4. Run Quantitative Indicator Engine
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
    const futuresIntel = await fetchFuturesIntel(detectedTicker);

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

    // Trade direction detection for validation
    const trendIsBullish = emaFast[emaFast.length - 1] > emaSlow[emaSlow.length - 1];
    const tradeDirection = trendIsBullish ? 'LONG' : 'SHORT';
    const correlationRisk = checkCorrelationExposure(detectedTicker, tradeDirection, activeTrades);

    // Consecutive Loss Protection
    const lastSignals = await prisma.signalLifecycle.findMany({
      where: { 
        analysis: { userId: authUser.userId },
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
        break; // Stop counting at the first win
      }
    }

    // Apply loss penalties
    let defensiveLossPenalty = 0;
    let defensiveModeActive = false;
    if (consecutiveLosses >= 7) {
      // Strategy kill switch triggered
      const reason = `Strategy Level Kill Switch: ${consecutiveLosses} consecutive losses active. Entry rejected.`;
      await logBlockedSignal(prisma, authUser.userId, detectedTicker, ["CONSECUTIVE_LOSS_STRATEGY_KILL_SWITCH"], reason);
      return NextResponse.json({ 
        error: `Strategi ditangguhkan sementara. Proteksi Kerugian Beruntun aktif setelah ${consecutiveLosses} kekalahan berturut-turut.` 
      }, { status: 400 });
    } else if (consecutiveLosses >= 5) {
      defensiveModeActive = true; // Block anything below A+ grade
    } else if (consecutiveLosses >= 3) {
      defensiveLossPenalty = 15; // Apply raw confidence penalty
    }

    // 5. Global Kill Switch validation
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
      marketRegime: marketRegime,
      symbol: detectedTicker
    });

    if (killSwitch.killActive) {
      await logBlockedSignal(prisma, authUser.userId, detectedTicker, killSwitch.reasons, killSwitch.message);
      return NextResponse.json({ 
        error: `Analisis ditolak oleh Kill Switch Keamanan Global: ${killSwitch.reasons.join(', ')}` 
      }, { status: 400 });
    }

    // 6. Aggregate 10-Component Scoring Engine
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
    const hasPatterns = candlePatterns.length > 0 || (visualObservations?.candlestickPatterns?.length > 0);
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

    // Component 5: Market Structure BOS/CHOCH Breakout
    // Locate the breakout level (nearest S/R zone)
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

    // Component 6: Liquidity Sweeps and Clusters
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

    // Component 7: Distance to major S/R
    const distanceCheck = validateDistanceToSR(latestPrice, srZones, tradeDirection, 0.005);
    const distanceScoreVal = distanceCheck.tooClose ? 20 : 100;
    scores.push({
      name: 'SR_DISTANCE',
      weight: weights.SR_DISTANCE || 0.08,
      rawScore: distanceScoreVal,
      weightedScore: distanceScoreVal * (weights.SR_DISTANCE || 0.08),
      met: !distanceCheck.tooClose
    });

    // Component 8: ADX Market Regime strength
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

    // Component 9: Futures Crowding Risk
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

    // Sum weighted confidence scores
    const sumWeighted = scores.reduce((sum, s) => sum + s.weightedScore, 0);
    let rawConfidence = Math.round(sumWeighted);

    // Apply consecutive losses and risk penalties to confidence score
    rawConfidence = Math.max(0, rawConfidence - defensiveLossPenalty - correlationRisk.penalty - eventRisk.penalty - session.penalty);

    // 7. Calibrate Confidence against real-world performance
    const calibrationBins = await prisma.confidenceCalibration.findMany();
    const calibration = calibrateConfidence(rawConfidence, calibrationBins);
    const finalConfidence = calibration.calibratedConfidence;

    // 8. Dynamic Signal Expiration & Stop Loss Setup
    let signal = 'NO TRADE';
    let entryPrice = null;
    let stopLoss = null;
    let tp1 = null;
    let tp2 = null;
    let tp3 = null;
    let rawRR = 0;
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

      // ATR Stop Validation check
      const slAtrValidation = validateSLDistance(entryPrice, stopLoss, latestAtr, assetProfile.atrMultiplier);
      if (!slAtrValidation.isValid) {
        // Enforce correct distance
        stopLoss = tradeDirection === 'LONG' 
          ? entryPrice - (assetProfile.atrMultiplier * latestAtr) 
          : entryPrice + (assetProfile.atrMultiplier * latestAtr);
      }

      const riskAmt = Math.abs(entryPrice - stopLoss);
      if (riskAmt > 0) {
        tp1 = tradeDirection === 'LONG' ? entryPrice + riskAmt * 1.5 : entryPrice - riskAmt * 1.5;
        tp2 = tradeDirection === 'LONG' ? entryPrice + riskAmt * 2.0 : entryPrice - riskAmt * 2.0;
        tp3 = tradeDirection === 'LONG' ? entryPrice + riskAmt * 3.0 : entryPrice - riskAmt * 3.0;
        
        // Slippage risk modeling
        slippage = calculateSlippageRisk(entryPrice, stopLoss, tp1, latestAtr, assetProfile.spreadPercent);
      }
    }

    // Capital preservation check: Filter signals with bad slippage-adjusted Risk/Reward
    const targetRR = slippage ? slippage.adjustedRR : 0;
    if (signal !== 'NO TRADE' && targetRR < version.minRiskReward) {
      signal = 'NO TRADE';
      entryPrice = null;
      stopLoss = null;
      tp1 = null;
      tp2 = null;
      tp3 = null;
    }

    // 9. Expected Value & Grade Calculation
    // Fetch aggregate historical stats
    const totalSignalsAgg = calibrationBins.reduce((sum, b) => sum + b.totalSignals, 0);
    const winsAgg = calibrationBins.reduce((sum, b) => sum + b.wins, 0);
    const actualWinRate = totalSignalsAgg > 0 ? winsAgg / totalSignalsAgg : 0.50;

    const mockHistStats = {
      actualWinRate,
      avgActualRR: 1.8,
      regimePerformance: {} // Simple registry
    };

    const ev = calculateExpectedValue(mockHistStats, marketRegime);
    const finalGrade = determineTradeGrade(finalConfidence, ev.status);

    // If Defensive Mode is active (consecutive losses >= 5), only Grade A or A+ is allowed
    if (defensiveModeActive && !['A', 'A+'].includes(finalGrade) && signal !== 'NO TRADE') {
      const blockMsg = `Defensive Mode Active: Signal grade is ${finalGrade} (Required: A or A+). Entry blocked.`;
      await logBlockedSignal(prisma, authUser.userId, detectedTicker, ["DEFENSIVE_MODE_GRADE_REJECTION"], blockMsg);
      signal = 'NO TRADE';
      entryPrice = null;
      stopLoss = null;
      tp1 = null;
      tp2 = null;
      tp3 = null;
    }

    // Dynamic Expiration calculation (Timeframe Duration * ATR Ratio * 3)
    // Map timeframe string to minutes
    const tfMinutesMap = { '5m': 5, '15m': 15, '30m': 30, '1h': 60, '4h': 240, '1d': 1440 };
    const tfMin = tfMinutesMap[detectedTimeframe] || 60;
    const expMinutes = Math.round(tfMin * (latestAtr / latestPrice * 100) * 3);
    const expirationTime = new Date(Date.now() + Math.max(30, expMinutes) * 60000);

    // 10. Store Analysis and Scores to DB
    const analysis = await prisma.analysis.create({
      data: {
        userId: authUser.userId,
        tenantId: authUser.tenantId,
        strategyVerId: version.id,
        asset: detectedTicker,
        timeframe: detectedTimeframe,
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
        aiReasons: visualObservations 
          ? `AI Observations: ${visualObservations.keyObservations?.join('. ')} | EV: ${ev.message}` 
          : `Kuantitatif: ${regimeData.description} | EV: ${ev.message}`,
        aiRisks: visualObservations 
          ? `Slippage: ${slippage?.riskScore || 'LOW'}, ${visualObservations.criticalRisks?.join('. ')}` 
          : `Slippage: ${slippage?.riskScore || 'LOW'}, ATR Vol Ratio: ${(atrVolatilityRatio*100).toFixed(2)}%`
      }
    });

    // Write Component Scores
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

    // Save compressed ReplaySnapshot JSON
    const indicatorMap = { emaFast, emaSlow, rsi, macd, atr, adx, volumeSMA, rvol, srZones, fib, liquidityClusters, liquiditySweeps };
    const storagePath = await saveReplaySnapshot(analysis.id, candles, indicatorMap);
    
    await prisma.replaySnapshot.create({
      data: {
        analysisId: analysis.id,
        storagePath,
        compressed: true
      }
    });

    // Save lifecycle
    await prisma.signalLifecycle.create({
      data: {
        analysisId: analysis.id,
        currentState: signal === 'NO TRADE' ? 'CLOSED' : 'PENDING',
        expirationTime,
        expirationCandleCount: Math.ceil(expMinutes / tfMin),
        predictedRR: targetRR,
        expectedHoldingTime: expMinutes / 60, // in hours
        decayHistory: JSON.stringify([{ time: new Date().toISOString(), confidence: finalConfidence }])
      }
    });

    // Emit event hook
    tradeEvents.emit(EVENTS.SIGNAL_CREATED, { analysis, signal });

    // Generate AI explanation if API key is present
    let explanationText = null;
    const aiApiKey = process.env.GEMINI_API_KEY;
    if (aiApiKey) {
      explanationText = await generateAIExplanation(
        aiApiKey,
        detectedTicker,
        detectedTimeframe,
        signal,
        scores,
        marketRegime
      );
    }

    // Run Monte Carlo simulation for probability curves
    const monteWinRate = finalConfidence > 0 ? finalConfidence : 50;
    const monteRiskReward = targetRR || 1.5;
    const monteCarloResult = runMonteCarlo(
      monteWinRate,
      100 * monteRiskReward, // win size based on $100 risk
      100, // loss size
      50, // 50 trades
      1000, // 1000 simulations
      10000 // $10,000 capital
    );

    return NextResponse.json({
      success: true,
      analysis: {
        ...analysis,
        scoreComponents: scores
      },
      indicators: {
        emaFast: emaFast.slice(-30),
        emaSlow: emaSlow.slice(-30),
        rsi: rsi.slice(-30),
        atr: atr.slice(-30),
        adx: adx.slice(-30),
        rvol: rvol.slice(-30),
        srZones,
        fib,
        candlePatterns,
        liquiditySweeps,
        liquidityClusters
      },
      candles: candles.slice(-50),
      aiExplanation: explanationText,
      monteCarlo: monteCarloResult,
      ev,
      calibration,
      slippage,
      session
    });

  } catch (error) {
    console.error("Analysis scan route error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
