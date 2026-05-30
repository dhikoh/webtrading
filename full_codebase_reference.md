# Referensi Kode Sumber Lengkap (Full Codebase Reference)
Dokumen ini berisi salinan lengkap (*source code*) dari seluruh logika inti Trade Machine untuk dipelajari oleh developer Anda.

---

## Prisma Schema Configuration (Database structure)
**Berkas:** [prisma/schema.prisma](file:///c:/Users/Dhiko Herlambang/.gemini/antigravity/playground/pulsing-pinwheel/Project/Trade Machine/prisma/schema.prisma)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ----------------------------------------------------
// AUTHENTICATION, MEMBERSHIP & MULTI-TENANCY
// ----------------------------------------------------
model User {
  id             String         @id @default(uuid())
  email          String         @unique
  username       String         @unique
  name           String
  passwordHash   String
  avatarUrl      String?
  role           String         @default("MEMBER") // SUPER_ADMIN, MEMBER
  status         String         @default("ACTIVE") // ACTIVE, SUSPENDED
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  tenantId       String
  tenant         Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  sessions       Session[]
  auditLogs      AuditLog[]
  analyses       Analysis[]
  notifications  Notification[]
  portfolioState PortfolioState?

  @@index([tenantId])
}

model Tenant {
  id             String         @id @default(uuid())
  name           String
  createdAt      DateTime       @default(now())
  users          User[]
  subscriptions  Subscription[]
  analyses       Analysis[]
  portfolioStates PortfolioState[]
}

model Subscription {
  id        String   @id @default(uuid())
  tenantId  String
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  tier      String   @default("FREE") // FREE, BASIC, PRO, ENTERPRISE
  status    String   @default("ACTIVE") // ACTIVE, EXPIRED, SUSPENDED
  startDate DateTime @default(now())
  endDate   DateTime

  @@index([tenantId])
}

model Session {
  id           String   @id @default(uuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  refreshToken String   @unique
  userAgent    String?
  ipAddress    String?
  expiresAt    DateTime
  createdAt    DateTime @default(now())

  @@index([userId])
}

// ----------------------------------------------------
// DYNAMIC STRATEGY REGISTRY & SYSTEM CONFIGURATION
// ----------------------------------------------------
model StrategyRegistry {
  id             String            @id @default(uuid())
  name           String            @unique
  description    String
  isActive       Boolean           @default(true)
  versions       StrategyVersion[]
}

model StrategyVersion {
  id             String            @id @default(uuid())
  strategyId     String
  strategy       StrategyRegistry  @relation(fields: [strategyId], references: [id], onDelete: Cascade)
  versionString  String            // e.g. "v1.0.0"
  isActive       Boolean           @default(false)
  createdAt      DateTime          @default(now())
  
  minConfidence  Int               @default(61)
  minRiskReward  Float             @default(1.5)
  maxDrawdownLmt Float             @default(15.0)
  
  parameters     StrategyParameter[]
  weights        FeatureWeight[]
  analyses       Analysis[]
  benchmarks     StrategyBenchmark[]
  backtests      BacktestResult[]

  @@index([strategyId])
}

model StrategyParameter {
  id             String            @id @default(uuid())
  versionId      String
  version        StrategyVersion   @relation(fields: [versionId], references: [id], onDelete: Cascade)
  paramKey       String            
  paramValue     String            

  @@index([versionId])
}

model FeatureWeight {
  id             String            @id @default(uuid())
  versionId      String
  version        StrategyVersion   @relation(fields: [versionId], references: [id], onDelete: Cascade)
  featureName    String            
  weightValue    Float             

  @@index([versionId])
}

// ----------------------------------------------------
// ANALYSIS ENGINE, LIFE CYCLE, & REPLAY SNAPSHOTS
// ----------------------------------------------------
model Analysis {
  id              String         @id @default(uuid())
  userId          String
  user            User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenantId        String
  tenant          Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  strategyVerId   String
  strategyVersion StrategyVersion @relation(fields: [strategyVerId], references: [id])
  
  asset           String         
  timeframe       String         
  sourceType      String         
  screenshotUrl   String?        
  
  signal          String         
  grade           String         
  confidence      Int            
  marketRegime    String         
  marketQuality   Int            
  liquidityRisk   String         
  
  entryPrice      Float?
  stopLoss        Float?
  tp1             Float?
  tp2             Float?
  tp3             Float?
  riskReward      Float?
  
  aiReasons       String?        
  aiRisks         String?
  createdAt       DateTime       @default(now())
  
  scoreComponents AnalysisScoreComponent[]
  lifecycle       SignalLifecycle?
  replaySnapshot  ReplaySnapshot?

  @@index([userId])
  @@index([tenantId])
  @@index([strategyVerId])
}

model AnalysisScoreComponent {
  id             String      @id @default(uuid())
  analysisId     String
  analysis       Analysis    @relation(fields: [analysisId], references: [id], onDelete: Cascade)
  componentName  String      
  weight         Float
  rawScore       Float       
  weightedScore  Float       
  isCriteriaMet  Boolean

  @@index([analysisId])
}

model ReplaySnapshot {
  id             String      @id @default(uuid())
  analysisId     String      @unique
  analysis       Analysis    @relation(fields: [analysisId], references: [id], onDelete: Cascade)
  storagePath    String      
  compressed     Boolean     @default(true)
  createdAt      DateTime    @default(now())
}

model SignalLifecycle {
  id             String      @id @default(uuid())
  analysisId     String      @unique
  analysis       Analysis    @relation(fields: [analysisId], references: [id], onDelete: Cascade)
  currentState   String      // PENDING, EXPIRED, TRIGGERED, INVALIDATED, EXECUTED, CLOSED
  expirationTime DateTime
  expirationCandleCount Int
  triggerPrice   Float?
  outcomeStatus  String?     
  outcomePnL     Float?      
  updatedAt      DateTime    @updatedAt
}

// ----------------------------------------------------
// PORTFOLIO, TELEMETRY, CALIBRATION, & INTEL
// ----------------------------------------------------
model PortfolioState {
  id             String      @id @default(uuid())
  userId         String      @unique
  user           User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenantId       String
  tenant         Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  currentCapital Float
  allocatedRisk  Float       @default(0.0) 
  activeTrades   Int         @default(0)
  updatedAt      DateTime    @updatedAt

  @@index([tenantId])
}

model ConfidenceCalibration {
  id              String   @id @default(uuid())
  confidenceMin   Int      
  confidenceMax   Int      
  totalSignals    Int      @default(0)
  wins            Int      @default(0)
  losses          Int      @default(0)
  actualWinRate   Float    @default(0.0)
  updatedAt       DateTime @updatedAt
}

model AssetProfile {
  id                 String   @id @default(uuid())
  symbol             String   @unique 
  averageATR         Float
  averageVolume      Float
  averageTrendLength Float
  averagePullback    Float
  correlationGroup   String
  updatedAt          DateTime @updatedAt
}

model StrategyBenchmark {
  id                String   @id @default(uuid())
  strategyVersionId String
  strategyVersion   StrategyVersion @relation(fields: [strategyVersionId], references: [id], onDelete: Cascade)
  totalSignals      Int      @default(0)
  wins              Int      @default(0)
  losses            Int      @default(0)
  winRate           Float    @default(0.0)
  profitFactor      Float    @default(0.0)
  maxDrawdown       Float    @default(0.0)
  sharpeRatio       Float    @default(0.0)
  updatedAt         DateTime @updatedAt

  @@index([strategyVersionId])
}

model BacktestResult {
  id                String   @id @default(uuid())
  strategyVersionId String
  strategyVersion   StrategyVersion @relation(fields: [strategyVersionId], references: [id], onDelete: Cascade)
  asset             String
  timeframe         String
  candleCount       Int
  totalTrades       Int
  winRate           Float
  profitFactor      Float
  maxDrawdown       Float
  sharpeRatio       Float
  createdAt         DateTime @default(now())

  @@index([strategyVersionId])
}

model FeaturePerformance {
  id                String   @id @default(uuid())
  featureName       String   @unique 
  timesTriggered    Int      @default(0)
  wins              Int      @default(0)
  losses            Int      @default(0)
  contributionScore Float    @default(0.0)
  updatedAt         DateTime @updatedAt
}

model DataSourceReliability {
  id             String      @id @default(uuid())
  sourceName     String      @unique 
  totalQueries   Int         @default(0)
  successQueries Int         @default(0)
  failureQueries Int         @default(0)
  latencyMs      Int         @default(0) 
  updatedAt      DateTime    @updatedAt
}

model AuditLog {
  id        String   @id @default(uuid())
  userId    String?
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  action    String
  details   String
  ipAddress String?
  createdAt DateTime @default(now())

  @@index([userId])
}

model Notification {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String
  message   String
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([userId])
}

```

---

## Technical Indicators Calculation Engine
**Berkas:** [src/utils/indicators.js](file:///c:/Users/Dhiko Herlambang/.gemini/antigravity/playground/pulsing-pinwheel/Project/Trade Machine/src/utils/indicators.js)

```javascript
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

```

---

## Market Structure & Support/Resistance Detection
**Berkas:** [src/utils/structure.js](file:///c:/Users/Dhiko Herlambang/.gemini/antigravity/playground/pulsing-pinwheel/Project/Trade Machine/src/utils/structure.js)

```javascript
// Detect local peaks (swing highs) and troughs (swing lows)
export function detectSwingPoints(candles, leftStrength = 3, rightStrength = 3) {
  const peaks = [];
  const troughs = [];

  for (let i = leftStrength; i < candles.length - rightStrength; i++) {
    const currentHigh = candles[i].high;
    const currentLow = candles[i].low;
    let isPeak = true;
    let isTrough = true;

    for (let j = 1; j <= leftStrength; j++) {
      if (candles[i - j].high >= currentHigh) isPeak = false;
      if (candles[i - j].low <= currentLow) isTrough = false;
    }
    for (let j = 1; j <= rightStrength; j++) {
      if (candles[i + j].high >= currentHigh) isPeak = false;
      if (candles[i + j].low <= currentLow) isTrough = false;
    }

    if (isPeak) {
      peaks.push({ index: i, price: currentHigh, time: candles[i].time });
    }
    if (isTrough) {
      troughs.push({ index: i, price: currentLow, time: candles[i].time });
    }
  }

  return { peaks, troughs };
}

// Cluster swing points into Support and Resistance zones using tolerance margins
export function calculateSRZones(peaks, troughs, priceTolerance = 0.005) {
  const zones = [];
  const allPoints = [
    ...peaks.map(p => ({ price: p.price, type: 'RESISTANCE' })),
    ...troughs.map(t => ({ price: t.price, type: 'SUPPORT' }))
  ];

  allPoints.forEach(point => {
    const matchingZone = zones.find(
      z => Math.abs(z.centerPrice - point.price) / point.price <= priceTolerance && z.type === point.type
    );

    if (matchingZone) {
      matchingZone.touches += 1;
      matchingZone.prices.push(point.price);
      matchingZone.centerPrice = matchingZone.prices.reduce((sum, p) => sum + p, 0) / matchingZone.prices.length;
    } else {
      zones.push({
        centerPrice: point.price,
        type: point.type,
        touches: 1,
        prices: [point.price]
      });
    }
  });

  // Sort by touch frequency (strongest zones first)
  return zones.sort((a, b) => b.touches - a.touches);
}

// Calculate Fibonacci Retracement Levels based on recent high/low swing range
export function calculateFibonacciLevels(candles) {
  if (candles.length < 20) return null;
  
  // Find highest high and lowest low of the candle array
  let highPrice = -Infinity;
  let lowPrice = Infinity;
  let highIndex = -1;
  let lowIndex = -1;

  for (let i = 0; i < candles.length; i++) {
    if (candles[i].high > highPrice) {
      highPrice = candles[i].high;
      highIndex = i;
    }
    if (candles[i].low < lowPrice) {
      lowPrice = candles[i].low;
      lowIndex = i;
    }
  }

  const range = highPrice - lowPrice;
  const direction = highIndex > lowIndex ? 'UPTREND' : 'DOWNTREND';

  // Levels: 23.6%, 38.2%, 50%, 61.8%, 78.6%
  const levels = {
    0.0: direction === 'UPTREND' ? highPrice : lowPrice,
    23.6: direction === 'UPTREND' ? highPrice - range * 0.236 : lowPrice + range * 0.236,
    38.2: direction === 'UPTREND' ? highPrice - range * 0.382 : lowPrice + range * 0.382,
    50.0: direction === 'UPTREND' ? highPrice - range * 0.500 : lowPrice + range * 0.500,
    61.8: direction === 'UPTREND' ? highPrice - range * 0.618 : lowPrice + range * 0.618,
    78.6: direction === 'UPTREND' ? highPrice - range * 0.786 : lowPrice + range * 0.786,
    100.0: direction === 'UPTREND' ? lowPrice : highPrice
  };

  return { direction, levels, range, highPrice, lowPrice };
}

// Detect Candlestick Patterns on the last 3 candles
export function detectCandlestickPatterns(candles) {
  if (candles.length < 3) return [];
  const patterns = [];

  const c1 = candles[candles.length - 3]; // oldest
  const c2 = candles[candles.length - 2]; // middle
  const c3 = candles[candles.length - 1]; // current (newest)

  const body1 = Math.abs(c1.close - c1.open);
  const body2 = Math.abs(c2.close - c2.open);
  const body3 = Math.abs(c3.close - c3.open);

  const range1 = c1.high - c1.low;
  const range2 = c2.high - c2.low;
  const range3 = c3.high - c3.low;

  const isBullish1 = c1.close > c1.open;
  const isBearish1 = c1.close < c1.open;
  const isBullish2 = c2.close > c2.open;
  const isBearish2 = c2.close < c2.open;
  const isBullish3 = c3.close > c3.open;
  const isBearish3 = c3.close < c3.open;

  // 1. Doji (Close extremely close to open)
  if (range3 > 0 && body3 <= range3 * 0.1) {
    patterns.push('Doji');
  }

  // 2. Hammer (Bullish Reversal: small body at top, long lower wick)
  const lowerWick3 = isBullish3 ? c3.open - c3.low : c3.close - c3.low;
  const upperWick3 = isBullish3 ? c3.high - c3.close : c3.high - c3.open;
  if (range3 > 0 && lowerWick3 >= body3 * 2 && upperWick3 <= range3 * 0.1) {
    patterns.push('Hammer');
  }

  // 3. Inverted Hammer / Shooting Star
  // Inverted Hammer is bullish at bottom; Shooting Star is bearish at top
  if (range3 > 0 && upperWick3 >= body3 * 2 && lowerWick3 <= range3 * 0.1) {
    if (isBearish3) patterns.push('Shooting Star');
    else patterns.push('Inverted Hammer');
  }

  // 4. Hanging Man (Bearish Reversal: small body at top, long lower wick, after uptrend)
  if (range3 > 0 && lowerWick3 >= body3 * 2 && upperWick3 <= range3 * 0.1 && isBearish3) {
    patterns.push('Hanging Man');
  }

  // 5. Engulfing Patterns (2-candle patterns)
  if (body2 > 0 && body3 > body2) {
    if (isBearish2 && isBullish3 && c3.open <= c2.close && c3.close >= c2.open) {
      patterns.push('Bullish Engulfing');
    }
    if (isBullish2 && isBearish3 && c3.open >= c2.close && c3.close <= c2.open) {
      patterns.push('Bearish Engulfing');
    }
  }

  // 6. Morning Star / Evening Star (3-candle patterns)
  const isLargeBody1 = body1 > range1 * 0.5;
  const isSmallBody2 = body2 <= range2 * 0.3;
  const isLargeBody3 = body3 > range3 * 0.5;

  if (isLargeBody1 && isSmallBody2 && isLargeBody3) {
    // Morning Star: Bearish -> Small -> Bullish (closing above c1 midpoint)
    if (isBearish1 && isBullish3 && c3.close > (c1.open + c1.close) / 2) {
      patterns.push('Morning Star');
    }
    // Evening Star: Bullish -> Small -> Bearish (closing below c1 midpoint)
    if (isBullish1 && isBearish3 && c3.close < (c1.open + c1.close) / 2) {
      patterns.push('Evening Star');
    }
  }

  // 7. Tweezers Top / Bottom
  const diffHigh = Math.abs(c2.high - c3.high) / c3.high;
  const diffLow = Math.abs(c2.low - c3.low) / c3.low;

  if (diffHigh <= 0.0005 && upperWick3 > body3 && upperWick3 > range3 * 0.3) {
    patterns.push('Tweezer Top');
  }
  if (diffLow <= 0.0005 && lowerWick3 > body3 && lowerWick3 > range3 * 0.3) {
    patterns.push('Tweezer Bottom');
  }

  return patterns;
}

```

---

## Monte Carlo Drawdown Simulator
**Berkas:** [src/utils/monteCarlo.js](file:///c:/Users/Dhiko Herlambang/.gemini/antigravity/playground/pulsing-pinwheel/Project/Trade Machine/src/utils/monteCarlo.js)

```javascript
export function runMonteCarlo(winRate, avgWin, avgLoss, numTrades = 100, simCount = 1000, initialCapital = 10000) {
  let count10 = 0;
  let count20 = 0;
  let count30 = 0;
  let count50 = 0;

  for (let s = 0; s < simCount; s++) {
    let balance = initialCapital;
    let maxBalance = balance;
    let maxDrawdown = 0;

    for (let t = 0; t < numTrades; t++) {
      const isWin = Math.random() * 100 < winRate;
      if (isWin) {
        balance += avgWin;
      } else {
        balance -= avgLoss;
      }
      
      // Capital protection check: if balance goes to 0 or less, trade sequence stops (100% drawdown)
      if (balance <= 0) {
        balance = 0;
        maxDrawdown = 1;
        break;
      }

      if (balance > maxBalance) {
        maxBalance = balance;
      }
      
      const dd = (maxBalance - balance) / maxBalance;
      if (dd > maxDrawdown) {
        maxDrawdown = dd;
      }
    }

    if (maxDrawdown >= 0.50) count50++;
    if (maxDrawdown >= 0.30) count30++;
    if (maxDrawdown >= 0.20) count20++;
    if (maxDrawdown >= 0.10) count10++;
  }

  return {
    drawdown10Prob: (count10 / simCount) * 100,
    drawdown20Prob: (count20 / simCount) * 100,
    drawdown30Prob: (count30 / simCount) * 100,
    drawdown50Prob: (count50 / simCount) * 100
  };
}

```

---

## Gemini Generative AI Integrations (Vision OCR & Explanation)
**Berkas:** [src/utils/gemini.js](file:///c:/Users/Dhiko Herlambang/.gemini/antigravity/playground/pulsing-pinwheel/Project/Trade Machine/src/utils/gemini.js)

```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Sends a base64 encoded screenshot of a chart to Gemini 1.5 Flash for vision technical analysis.
 */
export async function analyzeChartImageWithGemini(apiKey, imageBase64, mimeType = 'image/png') {
  if (!apiKey) {
    return { success: false, error: "API Key is required" };
  }

  const startTime = Date.now();
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      You are an expert crypto futures technical analyst. Analyze the attached trading chart screenshot.
      Locate and extract any indicators (EMA, RSI, MACD, Bollinger Bands), candlestick shapes, support/resistance levels, trendline breakouts, or market structures.
      Return the analysis STRICTLY in JSON format with no Markdown tags.
      Response must look exactly like this:
      {
        "detectedTicker": "BTCUSDT or other symbol",
        "detectedTimeframe": "1H, 4H, 1D, etc.",
        "detectedPrice": 12345.67,
        "chartPatterns": ["Bullish Flag", "Double Bottom", "Head and Shoulders", etc.],
        "candlestickPatterns": ["Hammer", "Engulfing", "Doji", etc.],
        "trendlines": "Short description of any visual trendline breakouts/breakdowns",
        "keyObservations": ["Detail 1", "Detail 2"],
        "criticalRisks": ["Risk factor 1", "Risk factor 2"]
      }
    `;

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanText);

    return {
      success: true,
      data: parsedData,
      latency: Date.now() - startTime,
      error: null
    };
  } catch (error) {
    console.error("Gemini Vision Error:", error);
    return {
      success: false,
      data: null,
      latency: Date.now() - startTime,
      error: error.message
    };
  }
}

/**
 * Generates natural language analysis explanation using structured technical inputs.
 */
export async function generateAIExplanation(apiKey, asset, timeframe, programSignal, scoreComponents, regime) {
  if (!apiKey) return null;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      You are an expert risk-averse crypto trading coach. Explain this trading setup to a user.
      
      Asset: ${asset}
      Timeframe: ${timeframe}
      Market Regime: ${regime}
      Programmatic Signal Recommendation: ${programSignal}
      Calculated Technical Scores:
      ${JSON.stringify(scoreComponents, null, 2)}
      
      Provide a highly professional explanation in Indonesian:
      1. Explain why this setup is valid or why it is marked NO TRADE.
      2. Detail the exact risks (cons) that the user must watch out for (e.g. key resistance near, upcoming session, volume tapering).
      3. List the positive confluences (pros).
      
      Return your explanation strictly in JSON format (no markdown blocks):
      {
        "pros": ["Reason 1", "Reason 2"],
        "cons": ["Risk 1", "Risk 2"],
        "summary": "Full natural language explanation paragraph"
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Gemini Explanation Error:", error);
    return null;
  }
}

```

---

## Background Worker & Expiration Sweeper Queue Handler
**Berkas:** [src/utils/worker.js](file:///c:/Users/Dhiko Herlambang/.gemini/antigravity/playground/pulsing-pinwheel/Project/Trade Machine/src/utils/worker.js)

```javascript
import { Queue, Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { fetchBinanceCandles } from './binance.js';
import { calculateEMA, calculateRSI, calculateATR, calculateMACD } from './indicators.js';
import { findSupportResistance, findFibonacciLevels, detectCandlestickPatterns } from './structure.js';
import { runMonteCarlo } from './monteCarlo.js';
import { saveReplaySnapshot } from './storage.js';
import { tradeEvents, EVENTS } from './events.js';
import IORedis from 'ioredis';

const connectionString = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redisConnection = new IORedis(connectionString, { maxRetriesPerRequest: null });

const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export const analysisQueue = new Queue('analysis-queue', { connection: redisConnection });
export const backtestQueue = new Queue('backtest-queue', { connection: redisConnection });

// 1. ANALYSIS SCAN BACKGROUND WORKER
let worker;
if (!global.tradeAnalysisWorker) {
  worker = new Worker('analysis-queue', async job => {
    const { userId, tenantId, strategyVersionId, asset, timeframe, sourceType } = job.data;
    console.log(`Starting scan job for ${asset} (${timeframe}) on user ${userId}`);

    try {
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

      // Indicator Calculations
      const emaFastPeriod = parseInt(params.emaFastPeriod || '20');
      const emaSlowPeriod = parseInt(params.emaSlowPeriod || '50');
      const rsiPeriod = parseInt(params.rsiPeriod || '14');
      const atrPeriod = parseInt(params.atrPeriod || '14');

      const emaFast = calculateEMA(closePrices, emaFastPeriod);
      const emaSlow = calculateEMA(closePrices, emaSlowPeriod);
      const rsi = calculateRSI(closePrices, rsiPeriod);
      const macd = calculateMACD(closePrices);
      const atr = calculateATR(candles, atrPeriod);

      const latestClose = closePrices[closePrices.length - 1];
      const latestFastEma = emaFast[emaFast.length - 1];
      const latestSlowEma = emaSlow[emaSlow.length - 1];
      const latestRsi = rsi[rsi.length - 1];
      const latestAtr = atr[atr.length - 1];

      // Structure Calculations
      const srZones = findSupportResistance(candles);
      const fib = findFibonacciLevels(candles);
      const candlePatterns = detectCandlestickPatterns(candles);

      // SCORING LOGIC
      const trendIsBullish = latestClose > latestFastEma && latestFastEma > latestSlowEma;
      const trendIsBearish = latestClose < latestFastEma && latestFastEma < latestSlowEma;

      let emaScore = 0;
      let trendDirection = 'NEUTRAL';
      if (trendIsBullish) { emaScore = 100; trendDirection = 'BULLISH'; }
      else if (trendIsBearish) { emaScore = 100; trendDirection = 'BEARISH'; }

      let rsiScore = 0;
      if (trendDirection === 'BULLISH' && latestRsi < 45) { rsiScore = 100; } // oversold pullback in uptrend
      else if (trendDirection === 'BEARISH' && latestRsi > 55) { rsiScore = 100; } // overbought pullback in downtrend

      let patternScore = 0;
      if (candlePatterns.length > 0) {
        const matchesTrend = candlePatterns.some(p => 
          (trendDirection === 'BULLISH' && p.type === 'BULLISH') ||
          (trendDirection === 'BEARISH' && p.type === 'BEARISH')
        );
        patternScore = matchesTrend ? 100 : 50;
      }

      // Feature weights aggregation
      const scores = [
        { name: 'EMA_ALIGNMENT', rawScore: emaScore, weight: weights.EMA_ALIGNMENT || 0.35, weightedScore: emaScore * (weights.EMA_ALIGNMENT || 0.35) },
        { name: 'RSI_EXHAUSTION', rawScore: rsiScore, weight: weights.RSI_EXHAUSTION || 0.30, weightedScore: rsiScore * (weights.RSI_EXHAUSTION || 0.30) },
        { name: 'CANDLESTICK_CONFLUENCE', rawScore: patternScore, weight: weights.CANDLESTICK_CONFLUENCE || 0.35, weightedScore: patternScore * (weights.CANDLESTICK_CONFLUENCE || 0.35) }
      ];

      const totalWeightedScore = scores.reduce((sum, s) => sum + s.weightedScore, 0);
      const triggerConfidence = Math.round(totalWeightedScore);

      // ATR Volatility constraints check
      const atrVolatilityRatio = (latestAtr / latestClose) * 100;
      let marketQuality = 80; // base score
      let liquidityRisk = 'LOW';
      if (atrVolatilityRatio > 3.0) { marketQuality -= 30; liquidityRisk = 'HIGH'; }
      else if (atrVolatilityRatio > 1.5) { marketQuality -= 10; liquidityRisk = 'MEDIUM'; }

      // REGIME CLASSIFICATION
      let marketRegime = 'RANGING';
      if (trendDirection !== 'NEUTRAL') {
        marketRegime = atrVolatilityRatio > 2.0 ? `TRENDING_VOLATILE_${trendDirection}` : `TRENDING_STABLE_${trendDirection}`;
      }

      // SIGNAL CRITERIA GENERATION
      let signal = 'NO TRADE';
      let entryPrice = null;
      let stopLoss = null;
      let tp1 = null;
      let tp2 = null;

      const minConfidence = version.minConfidence || 60;
      const minRR = version.minRiskReward || 1.5;

      if (triggerConfidence >= minConfidence && trendDirection !== 'NEUTRAL' && marketQuality >= 50) {
        signal = trendDirection === 'BULLISH' ? 'BUY_LONG' : 'SELL_SHORT';
        entryPrice = latestClose;
        const riskDistance = latestAtr * 1.5;

        if (signal === 'BUY_LONG') {
          stopLoss = latestClose - riskDistance;
          tp1 = latestClose + (riskDistance * minRR);
          tp2 = latestClose + (riskDistance * 2.0);
        } else {
          stopLoss = latestClose + riskDistance;
          tp1 = latestClose - (riskDistance * minRR);
          tp2 = latestClose - (riskDistance * 2.0);
        }
      }

      // Check for drawdown and risk limits (Monte Carlo simulation)
      const monteWinRate = triggerConfidence > 0 ? triggerConfidence : 50;
      const monteCarloResult = runMonteCarlo(
        monteWinRate,
        100 * minRR, // avgWin
        100, // avgLoss
        100, // numTrades
        1000, // simCount
        10000 // initialCapital
      );
      if (monteCarloResult.drawdown20Prob > (version.maxDrawdownLmt || 15.0)) {
        signal = 'NO TRADE'; // Override to NO TRADE if risk thresholds are breached
      }

      // 9. Save Analysis Record
      const analysis = await prisma.analysis.create({
        data: {
          userId,
          tenantId,
          strategyVerId: strategyVersionId,
          asset,
          timeframe,
          sourceType,
          signal,
          confidence: triggerConfidence,
          marketQuality,
          marketRegime,
          liquidityRisk,
          entryPrice,
          stopLoss,
          tp1,
          tp2,
          scoreComponents: {
            createMany: {
              data: scores.map(s => ({
                featureName: s.name,
                rawScore: s.rawScore,
                weightValue: s.weight,
                weightedScore: s.weightedScore
              }))
            }
          }
        }
      });

      // 10. Externalized Snapshot Storage (Compressed JSON)
      const indicatorMap = {
        emaFast,
        emaSlow,
        rsi,
        macd,
        atr,
        srZones,
        fib
      };
      
      const storagePath = await saveReplaySnapshot(analysis.id, candles, indicatorMap);
      
      await prisma.replaySnapshot.create({
        data: {
          analysisId: analysis.id,
          storagePath,
          compressed: true
        }
      });

      // 11. Create Signal Lifecycle record
      await prisma.signalLifecycle.create({
        data: {
          analysisId: analysis.id,
          currentState: signal === 'NO TRADE' ? 'CLOSED' : 'PENDING',
          expirationTime: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours expiration
          expirationCandleCount: 4
        }
      });

      // 12. Update feature contribution performance counters (for ML telemetry)
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

      // 13. Dispatch decoupled event hooks
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

```

---

## Hybrid Scan Evaluation Endpoint
**Berkas:** [src/app/api/analysis/scan/route.js](file:///c:/Users/Dhiko Herlambang/.gemini/antigravity/playground/pulsing-pinwheel/Project/Trade Machine/src/app/api/analysis/scan/route.js)

```javascript
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser } from '@/utils/auth';
import { fetchBinanceCandles } from '@/utils/binance';
import { calculateEMA, calculateRSI, calculateATR, calculateMACD } from '@/utils/indicators';
import { detectSwingPoints, calculateSRZones, calculateFibonacciLevels, detectCandlestickPatterns } from '@/utils/structure';
import { analyzeChartImageWithGemini, generateAIExplanation } from '@/utils/gemini';
import { saveReplaySnapshot } from '@/utils/storage';
import tradeEvents, { EVENTS } from '@/utils/events';
import { runMonteCarlo } from '@/utils/monteCarlo';

const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

// Safety check to ensure a default strategy is always present
async function getOrCreateActiveStrategy() {
  let activeVersion = await prisma.strategyVersion.findFirst({
    where: { isActive: true },
    include: { weights: true, parameters: true }
  });

  if (!activeVersion) {
    // Check if registry exists
    let registry = await prisma.strategyRegistry.findFirst({
      where: { name: 'Default Indicator Cross' }
    });

    if (!registry) {
      registry = await prisma.strategyRegistry.create({
        data: {
          name: 'Default Indicator Cross',
          description: 'EMA Cross & RSI Pullback Strategy'
        }
      });
    }

    activeVersion = await prisma.strategyVersion.create({
      data: {
        strategyId: registry.id,
        versionString: 'v1.0.0',
        isActive: true,
        minConfidence: 60,
        minRiskReward: 1.5,
        maxDrawdownLmt: 15.0,
        parameters: {
          createMany: {
            data: [
              { paramKey: 'emaFastPeriod', paramValue: '20' },
              { paramKey: 'emaSlowPeriod', paramValue: '50' },
              { paramKey: 'rsiPeriod', paramValue: '14' },
              { paramKey: 'atrPeriod', paramValue: '14' }
            ]
          }
        },
        weights: {
          createMany: {
            data: [
              { featureName: 'EMA_ALIGNMENT', weightValue: 0.35 },
              { featureName: 'RSI_EXHAUSTION', weightValue: 0.30 },
              { featureName: 'CANDLESTICK_CONFLUENCE', weightValue: 0.35 }
            ]
          }
        }
      },
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

    const { asset = 'BTCUSDT', timeframe = '1h', sourceType = 'LIVE_API', imageBase64 } = await req.json();

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

    // 2. If OCR, trigger Gemini Vision
    if (sourceType === 'OCR_UPLOAD' && imageBase64) {
      // Log Gemini OCR reliability
      await prisma.dataSourceReliability.upsert({
        where: { sourceName: 'GEMINI_OCR' },
        update: { totalQueries: { increment: 1 } },
        create: { sourceName: 'GEMINI_OCR', totalQueries: 1 }
      });

      const ocrApiKey = process.env.GEMINI_API_KEY;
      const ocrResult = await analyzeChartImageWithGemini(ocrApiKey, imageBase64);

      if (ocrResult.success && ocrResult.data) {
        visualObservations = ocrResult.data;
        if (ocrResult.data.detectedTicker) detectedTicker = ocrResult.data.detectedTicker.toUpperCase();
        if (ocrResult.data.detectedTimeframe) detectedTimeframe = ocrResult.data.detectedTimeframe.toLowerCase();
        
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
        return NextResponse.json({ error: `AI Vision Error: ${ocrResult.error || 'Failed to scan image'}` }, { status: 400 });
      }
    }

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
      return NextResponse.json({ error: `Gagal menarik data lilin Binance: ${fetchResult.error}` }, { status: 400 });
    }

    const candles = fetchResult.candles;
    const closePrices = candles.map(c => c.close);

    // Compare OCR visual price with Binance live price to verify consistency
    if (sourceType === 'OCR_UPLOAD' && visualObservations && visualObservations.detectedPrice) {
      const ocrPrice = parseFloat(visualObservations.detectedPrice);
      const livePrice = candles[candles.length - 1].close;
      const deviation = (Math.abs(ocrPrice - livePrice) / livePrice) * 100;

      if (deviation > 1.5) {
        await prisma.auditLog.create({
          data: {
            userId: authUser.userId,
            action: 'DATA_SOURCE_MISMATCH',
            details: `WARNING: Visual OCR price ($${ocrPrice}) deviates from Live API price ($${livePrice}) by ${deviation.toFixed(2)}% on ${detectedTicker}`
          }
        });

        await prisma.notification.create({
          data: {
            userId: authUser.userId,
            title: `Peringatan Deviasi Data (${detectedTicker})`,
            message: `Deteksi harga gambar ($${ocrPrice}) berbeda ${deviation.toFixed(1)}% dengan Binance API ($${livePrice}). Kemungkinan grafik out-of-date.`,
            type: 'WARNING'
          }
        });
      }
    }

    // 4. Indicator Calculations
    const emaFastPeriod = parseInt(params.emaFastPeriod || '20');
    const emaSlowPeriod = parseInt(params.emaSlowPeriod || '50');
    const rsiPeriod = parseInt(params.rsiPeriod || '14');
    const atrPeriod = parseInt(params.atrPeriod || '14');

    const emaFast = calculateEMA(closePrices, emaFastPeriod);
    const emaSlow = calculateEMA(closePrices, emaSlowPeriod);
    const rsi = calculateRSI(closePrices, rsiPeriod);
    const atr = calculateATR(candles, atrPeriod);
    const macd = calculateMACD(closePrices);

    const latestPrice = closePrices[closePrices.length - 1];
    const latestRsi = rsi[rsi.length - 1] || 50;
    const latestAtr = atr[atr.length - 1] || (latestPrice * 0.01);

    // Structural elements
    const { peaks, troughs } = detectSwingPoints(candles);
    const srZones = calculateSRZones(peaks, troughs);
    const fib = calculateFibonacciLevels(candles);
    const candlePatterns = detectCandlestickPatterns(candles);

    // 5. Score Components Assessment
    const emaFastVal = emaFast[emaFast.length - 1];
    const emaSlowVal = emaSlow[emaSlow.length - 1];
    const trendIsBullish = emaFastVal && emaSlowVal && emaFastVal > emaSlowVal;

    const scores = [];

    // EMA Alignment
    const emaWeight = weights.EMA_ALIGNMENT || 0.35;
    const emaScore = trendIsBullish ? 100 : 0;
    scores.push({
      name: 'EMA_ALIGNMENT',
      weight: emaWeight,
      rawScore: emaScore,
      weightedScore: emaScore * emaWeight,
      met: emaScore > 50
    });

    // RSI Exhaustion
    const rsiWeight = weights.RSI_EXHAUSTION || 0.30;
    let rsiScore = 50;
    if (trendIsBullish && latestRsi < 40) rsiScore = 100;
    if (!trendIsBullish && latestRsi > 70) rsiScore = 100;
    scores.push({
      name: 'RSI_EXHAUSTION',
      weight: rsiWeight,
      rawScore: rsiScore,
      weightedScore: rsiScore * rsiWeight,
      met: rsiScore > 50
    });

    // Candlestick Reversal
    const patternWeight = weights.CANDLESTICK_CONFLUENCE || 0.35;
    const hasReversals = candlePatterns.length > 0 || (visualObservations?.candlestickPatterns?.length > 0);
    const patternScore = hasReversals ? 100 : 0;
    scores.push({
      name: 'CANDLESTICK_CONFLUENCE',
      weight: patternWeight,
      rawScore: patternScore,
      weightedScore: patternScore * patternWeight,
      met: hasReversals
    });

    const totalWeightedScore = scores.reduce((sum, s) => sum + s.weightedScore, 0);
    const confidence = Math.round(totalWeightedScore);

    // 6. Signal Actions Determination
    let signal = 'NO TRADE';
    let entryPrice = null;
    let stopLoss = null;
    let tp1 = null;
    let tp2 = null;
    let tp3 = null;
    let riskReward = 0;

    if (confidence >= version.minConfidence) {
      entryPrice = latestPrice;
      if (trendIsBullish) {
        signal = 'BUY_LONG';
        const supportZone = srZones.find(z => z.type === 'SUPPORT' && z.centerPrice < latestPrice);
        stopLoss = supportZone ? supportZone.centerPrice : latestPrice - (1.5 * latestAtr);
        
        const riskAmount = entryPrice - stopLoss;
        if (riskAmount > 0) {
          tp1 = entryPrice + riskAmount * 1.5;
          tp2 = entryPrice + riskAmount * 2.0;
          tp3 = entryPrice + riskAmount * 3.0;
          riskReward = (tp1 - entryPrice) / riskAmount;
        }
      } else {
        signal = 'SELL_SHORT';
        const resistanceZone = srZones.find(z => z.type === 'RESISTANCE' && z.centerPrice > latestPrice);
        stopLoss = resistanceZone ? resistanceZone.centerPrice : latestPrice + (1.5 * latestAtr);
        
        const riskAmount = stopLoss - entryPrice;
        if (riskAmount > 0) {
          tp1 = entryPrice - riskAmount * 1.5;
          tp2 = entryPrice - riskAmount * 2.0;
          tp3 = entryPrice - riskAmount * 3.0;
          riskReward = (entryPrice - tp1) / riskAmount;
        }
      }
    }

    // Capital preservation check
    if (signal !== 'NO TRADE' && riskReward < version.minRiskReward) {
      signal = 'NO TRADE';
      entryPrice = null;
      stopLoss = null;
      tp1 = null;
      tp2 = null;
      tp3 = null;
      riskReward = 0;
    }

    const atrVolatilityRatio = latestAtr / latestPrice;
    const marketRegime = atrVolatilityRatio > 0.015 ? 'HIGH_VOLATILITY' : 'NORMAL_VOLATILITY';

    // 7. Save Analysis to DB
    const analysis = await prisma.analysis.create({
      data: {
        userId: authUser.userId,
        tenantId: authUser.tenantId,
        strategyVerId: version.id,
        asset: detectedTicker,
        timeframe: detectedTimeframe,
        sourceType,
        signal,
        grade: confidence >= 80 ? 'A' : confidence >= 60 ? 'B' : 'C',
        confidence,
        marketRegime,
        marketQuality: Math.round(confidence * 0.9),
        liquidityRisk: atrVolatilityRatio > 0.02 ? 'HIGH' : 'LOW',
        entryPrice,
        stopLoss,
        tp1,
        tp2,
        tp3,
        riskReward,
        aiReasons: visualObservations ? `AI Visual: ${visualObservations.keyObservations?.join(', ')}` : `Calculated programmatically based on indicator metrics.`,
        aiRisks: visualObservations ? visualObservations.criticalRisks?.join(', ') : 'Check for local ATR bounds.'
      }
    });

    // Write score components
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
    const indicatorMap = { emaFast, emaSlow, rsi, macd, atr, srZones, fib };
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
        expirationTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
        expirationCandleCount: 4
      }
    });

    // Emit event hook
    tradeEvents.emit(EVENTS.SIGNAL_CREATED, { analysis, signal });

    // Generate AI Explanation if API Key is available
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
    const monteWinRate = confidence > 0 ? confidence : 50;
    const monteRiskReward = riskReward || 1.5;
    const monteCarloResult = runMonteCarlo(
      monteWinRate,
      100 * monteRiskReward, // avgWin (based on 1% risk of $10,000)
      100, // avgLoss
      50, // numTrades
      1000, // simCount
      10000 // initialCapital
    );

    return NextResponse.json({
      success: true,
      analysis: {
        ...analysis,
        scoreComponents: scores
      },
      indicators: {
        emaFast: emaFast.slice(-30), // output recent elements
        emaSlow: emaSlow.slice(-30),
        rsi: rsi.slice(-30),
        srZones,
        fib,
        candlePatterns
      },
      candles: candles.slice(-50), // output recent elements for interactive SVG
      aiExplanation: explanationText,
      monteCarlo: monteCarloResult
    });

  } catch (error) {
    console.error("Analysis scan route error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

```

---

## Server-Sent Events Notifications Push Stream Route
**Berkas:** [src/app/api/notifications/stream/route.js](file:///c:/Users/Dhiko Herlambang/.gemini/antigravity/playground/pulsing-pinwheel/Project/Trade Machine/src/app/api/notifications/stream/route.js)

```javascript
import { NextResponse } from 'next/server';
import tradeEvents, { EVENTS } from '@/utils/events';
import { getAuthUser } from '@/utils/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return new Response('Unauthorized', { status: 401 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection confirmed packet
        controller.enqueue(encoder.encode("data: " + JSON.stringify({ status: "CONNECTED" }) + "\n\n"));

        // Callback event listener
        const onSignalCreated = (data) => {
          // Verify user tenant isolation
          if (data.analysis.tenantId === authUser.tenantId) {
            const message = {
              type: 'SIGNAL',
              data: data.analysis
            };
            controller.enqueue(encoder.encode("data: " + JSON.stringify(message) + "\n\n"));
          }
        };

        // Bind events
        tradeEvents.on(EVENTS.SIGNAL_CREATED, onSignalCreated);

        // Keep-alive heartbeat interval (30 seconds)
        const intervalId = setInterval(() => {
          try {
            controller.enqueue(encoder.encode("data: {\"heartbeat\":true}\n\n"));
          } catch (e) {
            // Stream already closed, clear safely
            clearInterval(intervalId);
          }
        }, 30000);

        // Abort cleanup event
        req.signal.addEventListener('abort', () => {
          clearInterval(intervalId);
          tradeEvents.off(EVENTS.SIGNAL_CREATED, onSignalCreated);
          console.log(`User ${authUser.userId} closed SSE session`);
        });
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Content-Encoding': 'none'
      }
    });
  } catch (error) {
    console.error("SSE stream route error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

```

---

## Dasbor Header (SSE Client-Listener & Audio Synth Chime)
**Berkas:** [src/components/Header.js](file:///c:/Users/Dhiko Herlambang/.gemini/antigravity/playground/pulsing-pinwheel/Project/Trade Machine/src/components/Header.js)

```javascript
'use client';

import { useState, useEffect } from 'react';
import styles from '@/styles/header.module.css';

export default function Header({ title, user }) {
  const [apiLatency, setApiLatency] = useState(0);
  const [apiStatus, setApiStatus] = useState('CHECKING'); // OK, SLOW, DOWN
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Poll API health reliability statistics every 15 seconds
  useEffect(() => {
    async function checkReliability() {
      try {
        const res = await fetch('/api/monitoring/health');
        if (res.ok) {
          const data = await res.json();
          setApiLatency(data.latency);
          if (data.status === 'OK') setApiStatus('OK');
          else if (data.status === 'SLOW') setApiStatus('SLOW');
          else setApiStatus('DOWN');
        } else {
          setApiStatus('DOWN');
        }
      } catch (err) {
        setApiStatus('DOWN');
      }
    }

    checkReliability();
    const interval = setInterval(checkReliability, 15000);
    return () => clearInterval(interval);
  }, []);

  // Fetch and stream notifications
  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setUnreadCount((data.notifications || []).filter(n => !n.isRead).length);
        }
      } catch (err) {
        console.error("Notifications fetch error:", err);
      }
    }

    fetchNotifications();

    // Establish Server-Sent Events stream connection
    const eventSource = new EventSource('/api/notifications/stream');

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.status === 'CONNECTED' || parsed.heartbeat) return;

        if (parsed.type === 'SIGNAL') {
          const signalData = parsed.data;
          
          const newNotif = {
            id: signalData.id,
            title: `Sinyal Baru Terdeteksi (${signalData.asset})`,
            message: `Arah: ${signalData.signal.replace('_', ' ')} (Conf: ${signalData.confidence}%) pada TF ${signalData.timeframe}.`,
            type: signalData.signal === 'NO TRADE' ? 'INFO' : 'ALERT',
            isRead: false,
            createdAt: new Date().toISOString()
          };

          setNotifications(prev => [newNotif, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Trigger audio synth chimes
          if (signalData.signal !== 'NO TRADE' && typeof window !== 'undefined' && window.playNotificationChime) {
            window.playNotificationChime();
          }
        }
      } catch (e) {
        console.error("Error parsing SSE data:", e);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE Connection error, retrying...", err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read', { method: 'POST' });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <h2 className={styles.pageTitle}>{title}</h2>
        <span className={styles.workspaceName}>{user?.tenantName || 'Private Workspace'}</span>
      </div>

      <div className={styles.right}>
        {/* Binance API Health Status */}
        <div className={styles.healthBadge}>
          <span className={`${styles.statusDot} ${styles[apiStatus.toLowerCase()]}`} />
          <span className={styles.healthLabel}>
            Binance: {apiStatus === 'OK' ? `${apiLatency}ms` : apiStatus === 'SLOW' ? `SLOW (${apiLatency}ms)` : 'OFFLINE'}
          </span>
        </div>

        {/* Notifications Alert Bell */}
        <div className={styles.notificationWrapper}>
          <button className={styles.bellBtn} onClick={() => setShowNotifications(!showNotifications)}>
            🔔
            {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
          </button>
          
          {showNotifications && (
            <div className={`${styles.dropdown} glass-panel`}>
              <div className={styles.dropdownHeader}>
                <h4>Notifikasi</h4>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className={styles.readAllBtn}>Tandai dibaca</button>
                )}
              </div>
              <div className={styles.dropdownList}>
                {notifications.length === 0 ? (
                  <div className={styles.emptyState}>Tidak ada alarm sinyal saat ini.</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={`${styles.notifItem} ${n.isRead ? '' : styles.unread}`}>
                      <div className={styles.notifTitle}>{n.title}</div>
                      <div className={styles.notifMsg}>{n.message}</div>
                      <span className={styles.notifTime}>{new Date(n.createdAt).toLocaleTimeString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

```

---

## Grafik Candlestick SVG Interaktif Component
**Berkas:** [src/components/ChartView.js](file:///c:/Users/Dhiko Herlambang/.gemini/antigravity/playground/pulsing-pinwheel/Project/Trade Machine/src/components/ChartView.js)

```javascript
'use client';

import { useState, useRef } from 'react';

export default function ChartView({ candles = [], indicators = {}, targetLines = null }) {
  const [hoveredCandle, setHoveredCandle] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  if (!candles || candles.length === 0) {
    return (
      <div style={{
        height: '350px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px dashed var(--border-color)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--text-muted)'
      }}>
        Belum ada data grafik yang dimuat.
      </div>
    );
  }

  // Define dimensions
  const width = 800;
  const height = 350;
  const paddingRight = 60;
  const paddingBottom = 30;
  const paddingTop = 20;
  const paddingLeft = 20;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Min/Max prices for scaling
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const maxPrice = Math.max(...highs);
  const minPrice = Math.min(...lows);
  const priceRange = maxPrice - minPrice;

  // Scale functions
  const getX = (index) => {
    return paddingLeft + (index / (candles.length - 1)) * chartWidth;
  };

  const getY = (price) => {
    if (priceRange === 0) return height / 2;
    return height - paddingBottom - ((price - minPrice) / priceRange) * chartHeight;
  };

  const handleMouseMove = (e, candle, index) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setHoveredCandle({ candle, index });
    setTooltipPos({ x: x + 15, y: y - 10 });
  };

  const handleMouseLeave = () => {
    setHoveredCandle(null);
  };

  // Compile path for EMAs
  const buildEmaPath = (emaArray) => {
    if (!emaArray || emaArray.length === 0) return '';
    let path = '';
    emaArray.forEach((val, idx) => {
      if (val !== null && val !== undefined) {
        const x = getX(idx);
        const y = getY(val);
        path += (path === '' ? 'M' : 'L') + ` ${x} ${y}`;
      }
    });
    return path;
  };

  const emaFastPath = buildEmaPath(indicators.emaFast);
  const emaSlowPath = buildEmaPath(indicators.emaSlow);

  return (
    <div style={{ position: 'relative', width: '100%' }} ref={containerRef}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" style={{ background: 'transparent' }}>
        {/* Y Axis Grid Lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const price = minPrice + priceRange * ratio;
          const y = getY(price);
          return (
            <g key={i}>
              <line 
                x1={paddingLeft} 
                y1={y} 
                x2={width - paddingRight} 
                y2={y} 
                stroke="var(--border-color)" 
                strokeWidth="0.5" 
                strokeDasharray="4 4" 
              />
              <text 
                x={width - paddingRight + 8} 
                y={y + 4} 
                fill="var(--text-muted)" 
                fontSize="10" 
                fontFamily="inherit"
              >
                ${price.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Candlesticks */}
        {candles.map((candle, idx) => {
          const x = getX(idx);
          const yOpen = getY(candle.open);
          const yClose = getY(candle.close);
          const yHigh = getY(candle.high);
          const yLow = getY(candle.low);
          
          const isBullish = candle.close >= candle.open;
          const strokeColor = isBullish ? 'var(--color-success)' : 'var(--color-danger)';
          const fillColor = isBullish ? 'var(--color-success-bg)' : 'var(--color-danger)';
          
          const candleWidth = Math.max(2, (chartWidth / candles.length) * 0.7);

          return (
            <g key={idx}>
              {/* Wick Shadow Line */}
              <line 
                x1={x} 
                y1={yHigh} 
                x2={x} 
                y2={yLow} 
                stroke={strokeColor} 
                strokeWidth="1.2" 
              />
              
              {/* Real Body Block */}
              <rect
                x={x - candleWidth / 2}
                y={Math.min(yOpen, yClose)}
                width={candleWidth}
                height={Math.max(1.5, Math.abs(yOpen - yClose))}
                fill={isBullish ? 'transparent' : fillColor}
                stroke={strokeColor}
                strokeWidth="1.5"
                rx="1"
              />

              {/* Invisible interactive zone for hover */}
              <rect
                x={x - chartWidth / (candles.length * 2)}
                y={paddingTop}
                width={chartWidth / candles.length}
                height={chartHeight}
                fill="transparent"
                onMouseMove={(e) => handleMouseMove(e, candle, idx)}
                onMouseLeave={handleMouseLeave}
                style={{ cursor: 'crosshair' }}
              />
            </g>
          );
        })}

        {/* Technical Indicators: EMA lines */}
        {emaFastPath && (
          <path 
            d={emaFastPath} 
            fill="none" 
            stroke="var(--accent-primary)" 
            strokeWidth="1.8" 
            style={{ filter: 'drop-shadow(0 0 2px var(--accent-primary-glow))' }}
          />
        )}
        {emaSlowPath && (
          <path 
            d={emaSlowPath} 
            fill="none" 
            stroke="var(--accent-secondary)" 
            strokeWidth="1.8" 
            style={{ filter: 'drop-shadow(0 0 2px var(--accent-secondary-glow))' }}
          />
        )}

        {/* Swing Points Highs / Lows Indicators */}
        {indicators.srZones && indicators.srZones.map((zone, zIdx) => {
          const y = getY(zone.centerPrice);
          if (y < paddingTop || y > height - paddingBottom) return null;
          return (
            <line
              key={zIdx}
              x1={paddingLeft}
              y1={y}
              x2={width - paddingRight}
              y2={y}
              stroke={zone.type === 'SUPPORT' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(239, 68, 68, 0.15)'}
              strokeWidth={Math.min(4, zone.touches)}
            />
          );
        })}

        {/* Overlay target price markers (SL / TP / Entry) */}
        {targetLines && (
          <>
            {/* Entry Price */}
            {targetLines.entryPrice && (
              <g>
                <line 
                  x1={paddingLeft} 
                  y1={getY(targetLines.entryPrice)} 
                  x2={width - paddingRight} 
                  y2={getY(targetLines.entryPrice)} 
                  stroke="var(--accent-secondary)" 
                  strokeWidth="1.5" 
                  strokeDasharray="2 2" 
                />
                <text x={paddingLeft + 10} y={getY(targetLines.entryPrice) - 6} fill="var(--accent-secondary)" fontSize="9" fontWeight="600">
                  ENTRY: ${targetLines.entryPrice.toFixed(2)}
                </text>
              </g>
            )}

            {/* Stop Loss */}
            {targetLines.stopLoss && (
              <g>
                <line 
                  x1={paddingLeft} 
                  y1={getY(targetLines.stopLoss)} 
                  x2={width - paddingRight} 
                  y2={getY(targetLines.stopLoss)} 
                  stroke="var(--color-danger)" 
                  strokeWidth="1.5" 
                  strokeDasharray="3 3" 
                />
                <text x={paddingLeft + 10} y={getY(targetLines.stopLoss) - 6} fill="var(--color-danger)" fontSize="9" fontWeight="600">
                  STOP LOSS: ${targetLines.stopLoss.toFixed(2)}
                </text>
              </g>
            )}

            {/* Take Profits */}
            {targetLines.tp1 && (
              <g>
                <line 
                  x1={paddingLeft} 
                  y1={getY(targetLines.tp1)} 
                  x2={width - paddingRight} 
                  y2={getY(targetLines.tp1)} 
                  stroke="var(--color-success)" 
                  strokeWidth="1.5" 
                  strokeDasharray="3 3" 
                />
                <text x={paddingLeft + 10} y={getY(targetLines.tp1) - 6} fill="var(--color-success)" fontSize="9" fontWeight="600">
                  TP1: ${targetLines.tp1.toFixed(2)}
                </text>
              </g>
            )}
          </>
        )}
      </svg>

      {/* Tooltip Overlay */}
      {hoveredCandle && (
        <div style={{
          position: 'absolute',
          left: tooltipPos.x,
          top: tooltipPos.y,
          background: 'var(--bg-main)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          padding: '8px 12px',
          pointerEvents: 'none',
          fontSize: '0.75rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          zIndex: 10
        }}>
          <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
            Candle #{hoveredCandle.index}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '4px 10px', color: 'var(--text-secondary)' }}>
            <span>Buka:</span><span style={{ color: 'white' }}>${hoveredCandle.candle.open.toFixed(2)}</span>
            <span>Tinggi:</span><span style={{ color: 'var(--color-success)' }}>${hoveredCandle.candle.high.toFixed(2)}</span>
            <span>Rendah:</span><span style={{ color: 'var(--color-danger)' }}>${hoveredCandle.candle.low.toFixed(2)}</span>
            <span>Tutup:</span><span style={{ color: 'white' }}>${hoveredCandle.candle.close.toFixed(2)}</span>
            <span>Volume:</span><span style={{ color: 'var(--accent-secondary)' }}>{hoveredCandle.candle.volume.toFixed(0)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

```

---

## Analisis & Kalkulator Dasbor UI Page View
**Berkas:** [src/app/dashboard/analysis/page.js](file:///c:/Users/Dhiko Herlambang/.gemini/antigravity/playground/pulsing-pinwheel/Project/Trade Machine/src/app/dashboard/analysis/page.js)

```javascript
'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ChartView from '@/components/ChartView';
import styles from '@/styles/analysis.module.css';

export default function AnalysisPage() {
  const [tab, setTab] = useState('API'); // API, UPLOAD
  const [asset, setAsset] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('1h');
  
  const [fileBase64, setFileBase64] = useState('');
  const [fileName, setFileName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Sizing inputs
  const [riskPct, setRiskPct] = useState(1); // default 1% risk

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      // Extract pure base64 content
      const base64String = reader.result.split(',')[1];
      setFileBase64(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleScan = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const payload = {
        sourceType: tab === 'API' ? 'LIVE_API' : 'OCR_UPLOAD',
        asset: tab === 'API' ? asset : undefined,
        timeframe: tab === 'API' ? timeframe : undefined,
        imageBase64: tab === 'UPLOAD' ? fileBase64 : undefined
      };

      const res = await fetch('/api/analysis/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Pemindaian gagal dilakukan');
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan koneksi ke server');
    } finally {
      setLoading(false);
    }
  };

  // Capital preservation helper logic
  const calculatePositionSize = (balance, entry, sl, riskPercentage) => {
    if (!entry || !sl || entry === sl) return { size: 0, cost: 0 };
    const riskAmount = balance * (riskPercentage / 100);
    const priceDiff = Math.abs(entry - sl);
    const positionSize = riskAmount / priceDiff;
    const requiredMargin = positionSize * entry; // nominal cost (leverage not applied)
    return {
      size: Math.round(positionSize * 10000) / 10000,
      cost: Math.round(requiredMargin * 100) / 100,
      riskAmount: Math.round(riskAmount * 100) / 100
    };
  };

  const userBalance = 10000.0; // fallback default capital
  const positionSizing = result?.analysis?.entryPrice && result?.analysis?.stopLoss
    ? calculatePositionSize(userBalance, result.analysis.entryPrice, result.analysis.stopLoss, riskPct)
    : null;

  return (
    <DashboardLayout title="Analisis Chart & Validasi">
      {/* Tabs */}
      <div className={styles.tabContainer}>
        <button 
          className={`${styles.tabBtn} ${tab === 'API' ? styles.activeTab : ''}`}
          onClick={() => { setTab('API'); setError(''); }}
        >
          🔍 Penarikan API Real-Time
        </button>
        <button 
          className={`${styles.tabBtn} ${tab === 'UPLOAD' ? styles.activeTab : ''}`}
          onClick={() => { setTab('UPLOAD'); setError(''); }}
        >
          📸 Visual OCR Chart AI
        </button>
      </div>

      <div className={styles.containerGrid}>
        {/* Controls Card */}
        <div className={`${styles.controlsCard} glass-panel`}>
          <form onSubmit={handleScan} className={styles.form}>
            {tab === 'API' ? (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Pilih Aset Kripto</label>
                  <select className="form-input" value={asset} onChange={(e) => setAsset(e.target.value)}>
                    <option value="BTCUSDT">BTC / USDT</option>
                    <option value="ETHUSDT">ETH / USDT</option>
                    <option value="SOLUSDT">SOL / USDT</option>
                    <option value="BNBUSDT">BNB / USDT</option>
                    <option value="XRPUSDT">XRP / USDT</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Timeframe</label>
                  <select className="form-input" value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
                    <option value="5m">5 Menit</option>
                    <option value="15m">15 Menit</option>
                    <option value="1h">1 Jam</option>
                    <option value="4h">4 Jam</option>
                    <option value="1d">1 Hari</option>
                  </select>
                </div>
              </>
            ) : (
              <div className={styles.formGroup}>
                <label className={styles.label}>Unggah Gambar Grafik</label>
                <div className={styles.uploadBox}>
                  <input 
                    type="file" 
                    id="chartFile" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    className={styles.fileInput} 
                    required
                  />
                  <label htmlFor="chartFile" className={styles.uploadLabel}>
                    <span>📁</span> {fileName || 'Pilih atau drop gambar di sini'}
                  </label>
                </div>
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Menganalisis Lilin...' : 'Jalankan Analisis Hybrid'}
            </button>
          </form>
        </div>

        {/* Dynamic Display results */}
        <div className={styles.resultsArea}>
          {error && <div className={styles.errorAlert}>{error}</div>}
          
          {loading && (
            <div className={`${styles.loadingCard} glass-panel`}>
              <span className="pulse-glow" style={{ fontSize: '3rem' }}>🔬</span>
              <p>Sedang mengevaluasi indikator matematika, structural S/R, dan model AI...</p>
            </div>
          )}

          {!result && !loading && (
            <div className={`${styles.emptyCard} glass-panel`}>
              <span>📈</span>
              <p>Pilih koin atau unggah screenshot chart di samping untuk memulai analisis instan.</p>
            </div>
          )}

          {result && !loading && (
            <div className={styles.resultsWrapper}>
              {/* SVG interactive chart */}
              <div className={`${styles.chartCard} glass-panel`}>
                <div className={styles.chartHeader}>
                  <h4>Grafik Candlestick ({result.analysis.asset} - {result.analysis.timeframe})</h4>
                  <div className={styles.legend}>
                    <span style={{ color: 'var(--accent-primary)' }}>■ EMA 20</span>
                    <span style={{ color: 'var(--accent-secondary)' }}>■ EMA 50</span>
                  </div>
                </div>
                <ChartView 
                  candles={result.candles} 
                  indicators={result.indicators}
                  targetLines={
                    result.analysis.signal !== 'NO TRADE'
                      ? {
                          entryPrice: result.analysis.entryPrice,
                          stopLoss: result.analysis.stopLoss,
                          tp1: result.analysis.tp1
                        }
                      : null
                  }
                />
              </div>

              {/* Signal Assessment & Risk calculations */}
              <div className={styles.assessmentGrid}>
                {/* Scorecard */}
                <div className={`${styles.scorecardCard} glass-panel`}>
                  <h3>Skor & Setup Rekomendasi</h3>
                  <div className={styles.signalBadgeWrapper}>
                    <span className={`${styles.badge} ${result.analysis.signal.includes('LONG') ? styles.buy : result.analysis.signal.includes('SHORT') ? styles.sell : styles.neutral}`}>
                      {result.analysis.signal}
                    </span>
                    <div className={styles.confCircle}>
                      <span className={styles.confVal}>{result.analysis.confidence}%</span>
                      <span className={styles.confLbl}>Confidence</span>
                    </div>
                  </div>

                  <div className={styles.statsRow}>
                    <span>Struktur Regime:</span>
                    <strong>{result.analysis.marketRegime}</strong>
                  </div>
                  <div className={styles.statsRow}>
                    <span>Kualitas Market:</span>
                    <strong>{result.analysis.marketQuality} / 100</strong>
                  </div>
                  <div className={styles.statsRow}>
                    <span>Resiko Likuiditas:</span>
                    <strong>{result.analysis.liquidityRisk}</strong>
                  </div>

                  {result.analysis.signal !== 'NO TRADE' && (
                    <div className={styles.targets}>
                      <div className={styles.targetRow}>Entry: <span>${result.analysis.entryPrice?.toFixed(2)}</span></div>
                      <div className={styles.targetRow} style={{ color: 'var(--color-danger)' }}>Stop Loss: <span>${result.analysis.stopLoss?.toFixed(2)}</span></div>
                      <div className={styles.targetRow} style={{ color: 'var(--color-success)' }}>TP 1 (1.5R): <span>${result.analysis.tp1?.toFixed(2)}</span></div>
                      <div className={styles.targetRow}>TP 2 (2.0R): <span>${result.analysis.tp2?.toFixed(2)}</span></div>
                    </div>
                  )}
                </div>

                {/* Capital preservation Sizing suggested */}
                <div className={`${styles.sizingCard} glass-panel`}>
                  <h3>Kalkulator Posisi & Resiko</h3>
                  
                  {result.analysis.signal === 'NO TRADE' ? (
                    <div className={styles.noTradeAlert}>
                      <strong>SISTEM REJECT SETUP:</strong> Sinyal di bawah ambang batas minimum scoring atau memiliki rasio risk-to-reward tidak menguntungkan. Mengutamakan No Trade demi mengamankan modal Anda.
                    </div>
                  ) : (
                    <div className={styles.sizingForm}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Persentase Resiko Saldo: {riskPct}%</label>
                        <input 
                          type="range" 
                          min="0.5" 
                          max="5" 
                          step="0.5" 
                          value={riskPct} 
                          onChange={(e) => setRiskPct(parseFloat(e.target.value))}
                          className={styles.rangeSlider}
                        />
                      </div>
                      
                      {positionSizing && (
                        <div className={styles.sizingResults}>
                          <div className={styles.sizingRow}>
                            <span>Estimasi Nilai Resiko:</span>
                            <strong>${positionSizing.riskAmount}</strong>
                          </div>
                          <div className={styles.sizingRow}>
                            <span>Ukuran Posisi (Kontrak):</span>
                            <strong>{positionSizing.size}</strong>
                          </div>
                          <div className={styles.sizingRow}>
                            <span>Persyaratan Margin (Cost):</span>
                            <strong>${positionSizing.cost}</strong>
                          </div>
                          <span className={styles.sizingNotice}>
                            *Saran ukuran posisi di atas didasarkan pada modal saat ini sebesar $10,000.
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Monte Carlo Risk Simulation Card */}
              {result.monteCarlo && (
                <div className={`${styles.monteCarloCard} glass-panel`}>
                  <h3>Simulasi Jalur Risiko Monte Carlo (50 Perdagangan)</h3>
                  <p className={styles.monteCarloIntro}>
                    Menghitung kemungkinan kejatuhan modal (*drawdown*) pada rangkaian perdagangan berikutnya menggunakan 1.000 simulasi acak berdasarkan parameter setup saat ini:
                  </p>
                  <div className={styles.monteCarloStats}>
                    <div className={styles.monteStat}>
                      <span className={styles.monteLabel}>Probabilitas Drawdown &gt;= 10%:</span>
                      <strong className={styles.monteValue}>{result.monteCarlo.drawdown10Prob.toFixed(1)}%</strong>
                    </div>
                    <div className={styles.monteStat}>
                      <span className={styles.monteLabel}>Probabilitas Drawdown &gt;= 20%:</span>
                      <strong className={styles.monteValue}>{result.monteCarlo.drawdown20Prob.toFixed(1)}%</strong>
                    </div>
                    <div className={styles.monteStat}>
                      <span className={styles.monteLabel}>Probabilitas Drawdown &gt;= 30%:</span>
                      <strong className={styles.monteValue}>{result.monteCarlo.drawdown30Prob.toFixed(1)}%</strong>
                    </div>
                    <div className={styles.monteStat}>
                      <span className={styles.monteLabel}>Probabilitas Drawdown &gt;= 50%:</span>
                      <strong className={styles.monteValue}>{result.monteCarlo.drawdown50Prob.toFixed(1)}%</strong>
                    </div>
                  </div>
                  
                  {/* Visual SVG curve showing probability bar chart */}
                  <div className={styles.monteCarloChartWrapper}>
                    <svg viewBox="0 0 500 150" className={styles.monteSvg}>
                      {/* Grid lines */}
                      <line x1="50" y1="20" x2="450" y2="20" stroke="#2a2f3a" strokeWidth="1" />
                      <line x1="50" y1="50" x2="450" y2="50" stroke="#2a2f3a" strokeWidth="1" />
                      <line x1="50" y1="80" x2="450" y2="80" stroke="#2a2f3a" strokeWidth="1" />
                      <line x1="50" y1="110" x2="450" y2="110" stroke="#2a2f3a" strokeWidth="1" />
                      <line x1="50" y1="130" x2="450" y2="130" stroke="#4a5264" strokeWidth="1.5" />

                      {/* Probabilities Bars */}
                      {[
                        { label: 'DD >= 10%', val: result.monteCarlo.drawdown10Prob, color: '#10b981' },
                        { label: 'DD >= 20%', val: result.monteCarlo.drawdown20Prob, color: '#f59e0b' },
                        { label: 'DD >= 30%', val: result.monteCarlo.drawdown30Prob, color: '#f97316' },
                        { label: 'DD >= 50%', val: result.monteCarlo.drawdown50Prob, color: '#ef4444' },
                      ].map((item, idx) => {
                        const barWidth = 40;
                        const spacing = 95;
                        const x = 70 + idx * spacing;
                        const maxVal = 100;
                        const heightScale = 110;
                        const barHeight = (item.val / maxVal) * heightScale;
                        const y = 130 - barHeight;

                        return (
                          <g key={idx}>
                            <rect x={x} y={20} width={barWidth} height={heightScale} fill="rgba(255,255,255,0.03)" rx="4" />
                            <rect x={x} y={y} width={barWidth} height={barHeight} fill={item.color} rx="4" style={{ transition: 'all 0.5s ease-out' }} />
                            <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold">
                              {item.val.toFixed(0)}%
                            </text>
                            <text x={x + barWidth / 2} y="145" textAnchor="middle" fill="#94a3b8" fontSize="10">
                              {item.label}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              )}

              {/* AI Explanation confluences */}
              {result.aiExplanation && (
                <div className={`${styles.explanationCard} glass-panel`}>
                  <h3>Penjelasan Confluence AI Gemini</h3>
                  <p className={styles.summaryText}>{result.aiExplanation.summary}</p>
                  
                  <div className={styles.prosConsGrid}>
                    <div className={styles.proBox}>
                      <h5>Confluences Pendukung (Pros)</h5>
                      <ul>
                        {result.aiExplanation.pros?.map((p, idx) => <li key={idx}>✓ {p}</li>)}
                      </ul>
                    </div>
                    
                    <div className={styles.conBox}>
                      <h5>Faktor Resiko (Cons)</h5>
                      <ul>
                        {result.aiExplanation.cons?.map((c, idx) => <li key={idx}>✗ {c}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

```

---

