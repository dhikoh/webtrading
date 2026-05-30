# Rencana Kerja: Pengerasan Mesin Sinyal & Kuantitatif (Trading Engine Hardening Review)

Rencana kerja ini berfokus sepenuhnya pada peningkatan kualitas sinyal teknis, ketahanan statistik, dan mitigasi risiko perdagangan berjangka (*futures*). Infrastruktur utama database, antrean, dan sistem tenant tetap dipertahankan tanpa perubahan arsitektur.

---

## User Review Required

> [!IMPORTANT]
> **1. Integrasi API Futures Intelligence**: Untuk mengambil data Funding Rate, Open Interest, dan Long/Short Ratio, backend akan berintegrasi dengan endpoint publik Futures Binance API. Harap pastikan server tidak diblokir (*rate-limited*) saat melakukan panggilan ke Binance Futures API.
> **2. Penyesuaian Bobot Parameter**: Setelah modifikasi diaktifkan, parameter penilaian akan bertambah dari 3 indikator menjadi 10 faktor. Super Admin wajib mendaftarkan bobot nilai baru di tabel `FeatureWeight` melalui Admin Panel agar sistem pembobotan dinamis berjalan dengan seimbang.
> **3. Pemeliharaan Profil Aset & Kalender Ekonomi**: Pengembang harus memelihara profil volatilitas aset di tabel `AssetProfile` serta memastikan sistem mendapatkan data kalender ekonomi eksternal untuk mendeteksi event tinggi (FOMC, CPI, NFP).
> **4. Skema Database Baru**: Perubahan database mencakup penambahan tabel `FeatureWeightVersion` untuk melacak riwayat bobot strategi serta penambahan metrik kalibrasi baru di tabel `ConfidenceCalibration` dan `SignalLifecycle`.

---

## Open Questions

Ada beberapa detail yang perlu dikonfirmasi saat atau sebelum eksekusi:
1. **Penyedia Kalender Ekonomi**: Apakah data kalender ekonomi (CPI, FOMC, NFP) akan diambil via API eksternal gratis (misal: RapidAPI/TradingEconomics) atau diinput manual oleh Admin? (Diusulkan: Fallback diinput oleh Admin melalui Admin Panel).

---

## Rincian Perubahan Skema Database (Database Schema Updates)

Berikut adalah penyesuaian skema Prisma ORM (`prisma/schema.prisma`) untuk mendukung pengerasan mesin:

### 1. `StrategyVersion` (Verifikasi Model)
Menyimpan parameter ambang batas dasar per versi strategi.
```prisma
model StrategyVersion {
  id             String            @id @default(uuid())
  strategyId     String
  strategy       StrategyRegistry  @relation(fields: [strategyId], references: [id], onDelete: Cascade)
  versionString  String            // Contoh: "v1.0.0"
  isActive       Boolean           @default(false)
  createdAt      DateTime          @default(now())
  
  minConfidence  Int               @default(61)
  minRiskReward  Float             @default(1.5)
  maxDrawdownLmt Float             @default(15.0)
  
  parameters     StrategyParameter[]
  weights        FeatureWeight[]
  featureWeightVersions FeatureWeightVersion[]
  analyses       Analysis[]
  benchmarks     StrategyBenchmark[]
  backtests      BacktestResult[]

  @@index([strategyId])
}
```

### 2. `FeatureWeightVersion` [NEW]
Melacak riwayat versi bobot fitur untuk rebalancing tanpa menimpa data lama secara destruktif.
```prisma
model FeatureWeightVersion {
  id                String            @id @default(uuid())
  strategyVersionId String
  strategyVersion   StrategyVersion   @relation(fields: [strategyVersionId], references: [id], onDelete: Cascade)
  weightsJson       String            // Menyimpan objek pemetaan JSON bobot fitur
  createdAt         DateTime          @default(now())

  @@index([strategyVersionId])
}
```

### 3. `ConfidenceCalibration` (Penambahan Bidang Evaluasi)
Menyimpan metrik agregat performa nyata untuk penyesuaian keyakinan dari raw ke calibrated.
```prisma
model ConfidenceCalibration {
  id                     String   @id @default(uuid())
  confidenceMin          Int      
  confidenceMax          Int      
  totalSignals           Int      @default(0)
  wins                   Int      @default(0)
  losses                 Int      @default(0)
  actualWinRate          Float    @default(0.0)
  
  // Bidang Baru Tambahan
  avgPredictedRR         Float    @default(0.0)
  avgActualRR            Float    @default(0.0)
  avgExpectedHoldingTime Float    @default(0.0) // dalam jam
  avgActualHoldingTime   Float    @default(0.0) // dalam jam
  updatedAt              DateTime @updatedAt
}
```

### 4. `AssetProfile` (Verifikasi Model)
Menyimpan personalitas aset kuantitatif untuk penyesuaian ATR dan Volatilitas secara dinamis.
```prisma
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
```

### 5. `SignalLifecycle` (Penambahan Bidang Evaluasi)
Mencatat daur hidup sinyal serta melacak pinalti penyusutan (*decay*) dan holding time transaksi nyata.
```prisma
model SignalLifecycle {
  id                   String      @id @default(uuid())
  analysisId           String      @unique
  analysis             Analysis    @relation(fields: [analysisId], references: [id], onDelete: Cascade)
  currentState         String      // PENDING, EXPIRED, TRIGGERED, INVALIDATED, EXECUTED, CLOSED
  expirationTime       DateTime
  expirationCandleCount Int
  triggerPrice         Float?
  outcomeStatus        String?     // WIN, LOSS
  outcomePnL           Float?      
  
  // Bidang Baru Tambahan
  predictedRR          Float?
  actualRR             Float?
  expectedHoldingTime  Float?      // estimasi waktu holding dalam jam
  actualHoldingTime    Float?      // waktu holding nyata dalam jam
  decayHistory         String?     // riwayat penyusutan confidence (format JSON)
  updatedAt            DateTime    @updatedAt
}
```

---

## Rincian Perubahan Kode Sumber (Proposed Changes)

Berikut adalah daftar perubahan berkas diatur berdasarkan komponen fungsionalitasnya:

### 1. Mesin Kalkulasi Indikator & Struktur Baru (Kuantitatif)

#### [MODIFY] [indicators.js](file:///c:/Users/Dhiko%20Herlambang/.gemini/antigravity/playground/pulsing-pinwheel/Project/Trade%20Machine/src/utils/indicators.js)
* **ADX (Average Directional Index)**:
  * Menambahkan fungsi `calculateADX(candles, period = 14)` untuk mengukur kekuatan tren (ADX > 25 = Trending kuat; ADX < 20 = Ranging/Sideways).
* **Volume SMA & RVOL**:
  * Menambahkan fungsi `calculateVolumeSMA(candles, period = 20)`.
  * Menambahkan fungsi `calculateRVOL(candles, period = 20)` untuk mencari rasio volume saat ini dibanding rata-rata.

#### [MODIFY] [structure.js](file:///c:/Users/Dhiko%20Herlambang/.gemini/antigravity/playground/pulsing-pinwheel/Project/Trade%20Machine/src/utils/structure.js)
* **Market Structure & Breakout Confirmation (BOS / CHOCH)**:
  * Deteksi struktur tingkat tinggi: Higher High (HH), Higher Low (HL), Lower High (LH), Lower Low (LL).
  * Mengidentifikasi **BOS (Break of Structure)** & **CHOCH (Change of Character)**.
  * **Breakout Confirmation Engine**:
    * Memvalidasi breakout berdasarkan: Penutupan harga (*candle close*) melewati batas level swing, volume penembusan (`RVOL > 1.2`), dan konfirmasi lilin berikutnya.
    * Breakout yang gagal akan mendapatkan pemotongan nilai *confidence* secara signifikan atau langsung dipaksa `NO TRADE`.
* **Liquidity Sweep & Cluster Detection**:
  * Menambahkan deteksi Buy Side Liquidity (BSL) Sweep & Sell Side Liquidity (SSL) Sweep ketika harga menembus Swing High/Low terdekat tetapi ditutup kembali di dalam rentang.
  * **Liquidity Cluster Detection**: Mendeteksi swing points berulang pada level harga yang sama (toleransi ketat) untuk memetakan heatmap zona likuiditas utama. Memberikan peningkatan skor confluences jika breakout searah BOS/CHOCH terjadi bertepatan dengan pembersihan kluster likuiditas.
* **Fibonacci & S/R Distance Validation**:
  * Menhitung kelarasan harga terhadap Golden Pocket Fibonacci (0.382, 0.5, 0.618, 0.786).
  * Menghitung jarak persentase ke garis support/resistance terdekat untuk mencegah LONG di dekat Resistance atau SHORT di dekat Support.
* **ATR Risk, Stop Loss, & Slippage Validation**:
  * Memvalidasi bahwa jarak stop loss ke entri harus minimal $1.5 \times ATR$ untuk menghindari terkena stop oleh fluktuasi normal.
  * **Slippage Risk Model**: Mengestimasi deviasi harga entri, stop loss, dan take profit berdasarkan ATR serta *spread* bid/ask aktif. Menghasilkan skor risiko slippage (`LOW`, `MODERATE`, `HIGH`), dan menyesuaikan kalkulasi akhir Risk/Reward dengan pinalti slippage tersebut.
  * Mendeteksi "Noise Zone" jika kisaran volatilitas lilin berada di bawah rata-rata ATR.

#### [NEW] [expectedValue.js](file:///c:/Users/Dhiko%20Herlambang/.gemini/antigravity/playground/pulsing-pinwheel/Project/Trade%20Machine/src/utils/expectedValue.js)
* **Expected Value (EV) Calculator**:
  * Menghitung nilai EV berdasarkan metrik: *Historical Win Rate*, *Average Win*, *Average Loss*, dan *Regime Performance*.
  * Menghasilkan status EV: `POSITIVE_EV`, `NEUTRAL_EV`, atau `NEGATIVE_EV`.
  * EV bertindak sebagai faktor penilaian utama untuk menaikkan/menurunkan peringkat kelas transaksi (`Trade Grade`).

#### [NEW] [confidenceCalibration.js](file:///c:/Users/Dhiko%20Herlambang/.gemini/antigravity/playground/pulsing-pinwheel/Project/Trade%20Machine/src/utils/confidenceCalibration.js)
* **Confidence Calibration Engine**:
  * Melakukan kalibrasi nilai *confidence* mentah (*Raw Confidence*) terhadap performa historis nyata yang tersimpan di tabel `ConfidenceCalibration`.
  * Menghasilkan: `Raw Confidence` dan `Calibrated Confidence`.
  * Nilai *confidence* yang ditampilkan ke pengguna adalah hasil kalibrasi (`Calibrated Confidence`).

---

### 2. Modul Klasifikasi Regime, Intel Kontrak Berjangka, & Expiration

#### [NEW] [regime.js](file:///c:/Users/Dhiko%20Herlambang/.gemini/antigravity/playground/pulsing-pinwheel/Project/Trade%20Machine/src/utils/regime.js)
* Membuat klasifikasi regime pasar (`TRENDING`, `RANGING`, `VOLATILE`, `DEAD_MARKET`) berdasarkan kombinasi ADX, ATR, dan kemiringan EMA 20/50.

#### [NEW] [futuresIntel.js](file:///c:/Users/Dhiko%20Herlambang/.gemini/antigravity/playground/pulsing-pinwheel/Project/Trade%20Machine/src/utils/futuresIntel.js)
* Integrasi panggilan API Binance Futures untuk mengambil data: Funding Rate, Open Interest (OI), dan Long/Short Ratio.
* Menghasilkan **Crowding Risk Score (0-100)** untuk meminimalisir transaksi jika pasar sedang terlalu padat pada satu sisi arah.

#### [NEW] [sessionQuality.js](file:///c:/Users/Dhiko%20Herlambang/.gemini/antigravity/playground/pulsing-pinwheel/Project/Trade%20Machine/src/utils/sessionQuality.js)
* **Session Quality Engine**:
  * Mendeteksi sesi perdagangan aktif berdasarkan waktu UTC: Sesi Asia, London, New York, dan overlap antar-sesi.
  * Memberikan pinalti atau pengurangan skor confidence pada sesi dengan historis likuiditas sangat rendah (misal: Sesi Asia murni).

#### [NEW] [eventRisk.js](file:///c:/Users/Dhiko%20Herlambang/.gemini/antigravity/playground/pulsing-pinwheel/Project/Trade%20Machine/src/utils/eventRisk.js)
* **Market Event Risk Filter**:
  * Membaca tabel agenda ekonomi berimpak tinggi (FOMC, CPI, NFP).
  * Memberikan pinalti risiko atau memaksa status `NO TRADE` jika analisis dipicu mendekati rilis berita penting.

#### [NEW] [correlationGuard.js](file:///c:/Users/Dhiko%20Herlambang/.gemini/antigravity/playground/pulsing-pinwheel/Project/Trade%20Machine/src/utils/correlationGuard.js)
* **Portfolio Correlation Exposure Guard**:
  * Memantau matriks korelasi antar-aset berjangka (BTC, ETH, SOL, DOGE, dll).
  * Memberikan peringatan atau penolakan sinyal jika eksposur arah agregat (arah posisi terakumulasi) melampaui batas konsentrasi risiko yang telah diatur.

#### [NEW] [killSwitch.js](file:///c:/Users/Dhiko%20Herlambang/.gemini/antigravity/playground/pulsing-pinwheel/Project/Trade%20Machine/src/utils/killSwitch.js)
* **Global Risk Kill Switch**:
  * Memaksa keputusan `NO TRADE` secara global apabila: Event Risk = HIGH, keandalan sumber data di bawah ambang batas, *spread* harga tidak normal, atau pasar berada dalam regime volatilitas ekstrem.
  * Mencatat semua alasan penolakan ke database `AuditLog`.

#### [MODIFY] [worker.js (BullMQ Workers & Expiration)](file:///c:/Users/Dhiko%20Herlambang/.gemini/antigravity/playground/pulsing-pinwheel/Project/Trade%20Machine/src/utils/worker.js)
* **Dynamic Signal Expiration & Decay**:
  * Mengganti masa kadaluarsa 4 jam statis dengan nilai dinamis berbasis volatilitas pasar: $\text{Expiration} = \text{Timeframe Duration} \times ATR \text{ Multiplier}$.
  * **Confidence Decay Engine**: Mengurangi nilai keyakinan secara bertahap seiring berjalannya lilin harga tanpa menyentuh harga entri, dikonfigurasi melalui tabel `StrategyVersion`. Riwayat penyusutan disimpan di `SignalLifecycle`.
* **Walk-Forward Validation**:
  * Membagi data pengujian historis `backtest-queue` menjadi jendela Training (200 candle) dan Validation (50 candle) untuk evaluasi performa tanpa bias overfitting.

---

### 3. Logika Evaluasi Sinyal (API Route, Rebalancing, & Feedback Loop)

#### [MODIFY] [route.js (API Scan)](file:///c:/Users/Dhiko%20Herlambang/.gemini/antigravity/playground/pulsing-pinwheel/Project/Trade%20Machine/src/app/api/analysis/scan/route.js)
* **Asset Personality Layer**:
  * Membaca profil koin dari tabel `AssetProfile` secara dinamis untuk menyesuaikan pengali ATR, toleransi volatilitas, dan pinalti likuiditas unik antara aset besar (BTC, ETH) dibanding altcoin (SOL, DOGE, PEPE).
* **Multi-Timeframe Alignment Engine**:
  * Melakukan penarikan lilin tambahan di timeframe HTF (Higher Timeframe) dan LTF (Lower Timeframe) untuk mencocokkan kelarasan tren sebelum sinyal disetujui.
* **OCR Validation Hardening**:
  * Memvalidasi ketat akurasi OCR Gemini: Tolak otomatis jika `tickerConfidence` < 90, `timeframeConfidence` < 90, atau `patternConfidence` < 85.
* **Rebalancing Confidence Score**:
  * Mengagregasi nilai dari 10 komponen terbobot dinamis dari database `FeatureWeight`.
  * Memasukkan hasil evaluasi modul ke tabel `AnalysisScoreComponent`.
* **Consecutive Loss Protection**:
  * Memantau akumulasi kerugian berjalan (*rolling losses*).
  * Setelah 3 kekalahan beruntun: berikan pinalti confidence defensif.
  * Setelah 5 kekalahan beruntun: masuk ke Mode Defensif (hanya izinkan sinyal Grade A+).
  * Setelah 7 kekalahan beruntun: aktifkan *kill switch* strategi sementara waktu hingga di-reset atau dipulihkan.
* **Trade Quality Grading Engine**:
  * Menghasilkan peringkat kelas transaksi (`A+`, `A`, `B`, `C`) berdasarkan kombinasi EV (`POSITIVE_EV` dll), kelarasan volume, MTF alignment, validasi ATR, dan kecocokan kluster likuiditas.

#### [MODIFY] [journal/route.js & journal/[id]/route.js (Trade Feedback Loop)](file:///c:/Users/Dhiko%20Herlambang/.gemini/antigravity/playground/pulsing-pinwheel/Project/Trade%20Machine/src/app/api/journal/route.js)
* **Confidence Calibration Feedback Loop & Performance Tracking**:
  * Saat transaksi jurnal ditutup, sistem mencocokkan hasil akhir (Win/Loss) dengan tingkat confidence analisis awal.
  * Menyimpan metrik evaluasi tambahan: `Predicted RR`, `Actual RR`, `Expected Holding Time`, dan `Actual Holding Time` ke skema database untuk analisis kalibrasi mendalam.
  * **Regime Performance Analytics**: Menyimpan statistik performa (Win Rate, Profit Factor, Max Drawdown) berdasarkan regime pasar aktif untuk kalibrasi dinamis masa depan.

---

### 4. Komponen Tampilan (Antarmuka Pengguna)

#### [MODIFY] [page.js (Analysis Page)](file:///c:/Users/Dhiko%20Herlambang/.gemini/antigravity/playground/pulsing-pinwheel/Project/Trade%20Machine/src/app/dashboard/analysis/page.js)
* **Kalkulator Posisi Futures & Leverage**:
  * Pengguna **wajib memilih leverage secara eksplisit** (tanpa ada leverage default/asumsi otomatis). Angka 1x hanya bertindak sebagai placeholder visual di antarmuka.
  * Menampilkan informasi terperinci: Ukuran Posisi, Persyaratan Margin, Leverage terpilih, Estimasi Harga Likuidasi, dan Maintenance Margin.
* **Tabel Skor Komponen**:
  * Menampilkan rincian performa nilai bobot (Market Structure, Volume, S/R, Fib, ADX, MTF, Correlation, Slippage, Calibrated Confidence, EV) pada dasbor.

---

## Rencana Verifikasi (Verification Plan)

### Pengujian Otomatis (Automated Script)
* Mengubah berkas `verify-indicators.js` untuk menguji fungsionalitas ADX, Volume SMA, RVOL, deteksi BOS/CHOCH, deteksi Liquidity Sweep, deteksi Sesi Pasar, perhitungan korelasi aset, estimasi slippage, perlindungan beruntun (*consecutive loss*), perhitungan Expected Value (EV), dan kalibrasi confidence.
* Menjalankan perintah pengujian:
  ```bash
  node verify-indicators.js
  ```

### Uji Coba Integrasi Dasbor
* Melakukan scan koin tertentu melalui dasbor untuk memastikan rincian 10 komponen nilai tersimpan di database dan kalkulator leverage berfungsi dengan benar.
