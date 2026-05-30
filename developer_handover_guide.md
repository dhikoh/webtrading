# Dokumen Serah Terima Teknis (Developer Handover Guide)
**Proyek:** Trade Machine Platform
**Status:** Siap Produksi (Build Sukses)

Dokumen ini ditujukan bagi pengembang perangkat lunak (*developer*) untuk memahami arsitektur, struktur proyek, alur kode utama, serta cara meluncurkan dan memelihara aplikasi Trade Machine.

---

## 1. Arsitektur Sistem & Aliran Data

Sistem didekopel menggunakan pola antrean kerja latar belakang (*background queues*) untuk memastikan antarmuka web tetap responsif selama proses kalkulasi kuantitatif yang berat.

```mermaid
graph TD
    Client[Browser Client] -->|HTTP Request| API[Next.js App API Routes]
    Client -->|SSE Connection| SSE[SSE Route: /api/notifications/stream]
    API -->|Create Job| Queue[Redis BullMQ: analysis-queue / backtest-queue]
    Queue -->|Process Job| Worker[Background Worker: worker.js]
    Worker -->|Fetch Candles| Exchange[Binance API]
    Worker -->|OCR / Explanation| Gemini[Gemini 1.5 Flash API]
    Worker -->|Read/Write| DB[(PostgreSQL Database)]
    Worker -->|Emit Event| EventBus[Global Event Emitter]
    EventBus -->|Push Event| SSE
    SSE -->|Real-time Push| Client
```

---

## 2. Struktur Direktori Proyek

Berikut adalah file-file kunci yang mengendalikan logika bisnis platform:

```text
├── prisma/
│   └── schema.prisma           # Skema database PostgreSQL (Multi-tenant, Registry, Telemetry)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── analysis/scan/  # Endpoint evaluasi hybrid & OCR (Binance + Gemini)
│   │   │   ├── notifications/
│   │   │   │   └── stream/     # Endpoint Server-Sent Events (SSE)
│   │   │   └── admin/          # Endpoint manajemen parameter & audit log
│   │   └── dashboard/
│   │       ├── analysis/       # Halaman eksekusi scan & calculator member
│   │       └── page.js         # Dasbor utama dengan SSE listener & audio chime
│   ├── components/
│   │   ├── ChartView.js        # Komponen grafik candlestick SVG interaktif
│   │   ├── Header.js           # Header dengan SSE notification listener & chime
│   │   └── DashboardLayout.js  # Wrapper tata letak dasbor umum
│   ├── styles/
│   │   ├── variables.css       # Token warna HSL & gaya neon neon
│   │   └── analysis.module.css # Styling halaman analisis & Monte Carlo
│   └── utils/
│       ├── indicators.js       # Logika perhitungan EMA, RSI, ATR, MACD
│       ├── structure.js        # Deteksi Pivot, S/R clustering, Fibonacci, candle patterns
│       ├── monteCarlo.js       # Simulator probabilitas drawdown portofolio
│       ├── gemini.js           # Integrasi Google AI Vision OCR & AI Confluences
│       ├── worker.js           # Background Worker BullMQ & Signal Expiration Sweep
│       ├── events.js           # Global EventEmitter untuk komunikasi antar-modul
│       └── auth.js             # Enkripsi bcrypt & pembuatan token JWT
├── docker-compose.yml          # Konfigurasi kontainer docker PostgreSQL, Redis, & Next.js
└── jsconfig.json               # Konfigurasi path alias (@/* -> ./src/*)
```

---

## 3. Variabel Lingkungan (.env)

Buat file `.env` di direktori akar proyek dengan parameter konfigurasi berikut:

```env
# Database PostgreSQL URL
DATABASE_URL="postgresql://postgres:postgres_password@localhost:5432/trademachine?schema=public"

# Redis Server URL (untuk BullMQ)
REDIS_URL="redis://127.0.0.1:6379"

# Token Keamanan JWT
JWT_SECRET="ganti_dengan_key_rahasia_dan_panjang_anda"

# Google Gemini API Key (untuk OCR & Confluences)
GEMINI_API_KEY="AIzaSy..."

# Environment Mode
NODE_ENV="production"
PORT=3000
```

---

## 4. Skema Database Utama (Prisma PostgreSQL)

Skema database di rancang dinamis untuk mendukung optimasi Machine Learning (ML) di masa depan dengan menormalisasi seluruh skor masukan.

1. **Multi-Tenancy**:
   * `Tenant` & `User`: Hubungan satu tenant ke banyak user. User memiliki `role` (`SUPER_ADMIN`, `MEMBER`) dan `status` (`ACTIVE`, `SUSPENDED`).
   * `PortfolioState`: Melacak nilai ekuitas saat ini (`equity`), saldo tunai (`balance`), dan jumlah perdagangan aktif (`activeTrades`) untuk pembatasan risiko per tenant.
2. **Strategy Registry**:
   * `StrategyRegistry` & `StrategyVersion`: Parameter strategi disimpan per baris di tabel `StrategyParameter` dan `FeatureWeight` alih-alih ditulis keras (*hardcoded*) di kode program, sehingga perubahan di Admin Panel langsung memengaruhi perhitungan tanpa *redeploy*.
3. **Audit & Telemetry**:
   * `Analysis` & `AnalysisScoreComponent`: Menyimpan hasil scan lengkap dengan pecahan skor masing-masing indikator.
   * `ReplaySnapshot`: Menyimpan data lilin (*candles*) dan nilai indikator dalam format JSON yang dikompresi di luar database (referensi path saja) untuk menghindari pembengkakan database.
   * `SignalLifecycle`: Melacak status sinyal dari `PENDING`, `EXECUTED`, hingga `EXPIRED`.
   * `BacktestResult`: Laporan hasil pengujian historis strategi (*Win Rate*, *Profit Factor*, dll).

---

## 5. Aliran Kode Penting (Core Flows)

### A. Alur Evaluasi Sinyal (Hybrid Scan Pipeline)
Terjadi pada berkas [scan/route.js](file:///c:/Users/Dhiko%20Herlambang/.gemini/antigravity/playground/pulsing-pinwheel/Project/Trade%20Machine/src/app/api/analysis/scan/route.js):
1. **Verifikasi Token**: Memeriksa otentikasi JWT pengguna.
2. **AI OCR Parsing** (Jika metode UPLOAD dipilih): Screenshot dikirim ke Gemini Vision API untuk mengekstrak `detectedTicker`, `detectedTimeframe`, dan `detectedPrice`.
3. **Penyelarasan Data**: Sistem menarik lilin harga asli Binance API terbaru.
4. **Validasi Konsistensi**: Membandingkan `detectedPrice` OCR gambar dengan harga candle aktual Binance. Jika deviasi $> 1.5\%$, sistem memicu peringatan deviasi dan menulis audit log.
5. **Kalkulasi Teknis & S/R**: Menghitung indikator teknis di `indicators.js` & `structure.js`.
6. **Penghitungan Skor & Monte Carlo**: Menjumlahkan skor terbobot. Jika skor melewati ambang batas, jalankan simulasi risiko Monte Carlo drawdown 50 trade ke depan.
7. **Penerapan Hasil**: Jika probabilitas drawdown $20\%$ melampaui toleransi pengguna (`maxDrawdownLmt`), ubah sinyal menjadi `NO TRADE`.
8. **Penyimpanan Snapshot**: Menyimpan snapshot Lilin & Indikator ke server penyimpanan lokal (dikompresi), lalu membuat record `Analysis` & `SignalLifecycle`.
9. **Real-time Dispatch**: Memancarkan event `EVENTS.SIGNAL_CREATED`.

### B. Notifikasi Real-time SSE
1. Endpoint `/api/notifications/stream` membuka koneksi HTTP streaming (`text/event-stream`).
2. Endpoint mengikat pendengar acara (*event listener*) ke `tradeEvents.on(EVENTS.SIGNAL_CREATED)`.
3. Ketika worker memancarkan sinyal baru, SSE membungkus data ke dalam format SSE `data: {...}\n\n` dan mendorongnya ke client secara instan.
4. Komponen [Header.js](file:///c:/Users/Dhiko%20Herlambang/.gemini/antigravity/playground/pulsing-pinwheel/Project/Trade%20Machine/src/components/Header.js) menangkap event tersebut, memperbarui lencana notifikasi, dan memanggil `window.playNotificationChime()` untuk memutar efek chimes audio Web Audio API.

---

## 6. Prosedur Pemasangan (Setup & Development)

Untuk menjalankan proyek ini secara lokal, ikuti instruksi berikut:

```bash
# 1. Pasang seluruh dependensi NPM
npm install

# 2. Setup skema database PostgreSQL menggunakan Prisma Migrations
npx prisma migrate dev --name init

# 3. Jalankan pengujian unit kalkulasi indikator teknis
node verify-indicators.js

# 4. Jalankan aplikasi dalam mode pengembangan
npm run dev

# 5. Nyalakan Background Worker secara terpisah
# Di lingkungan produksi/Coolify, jalankan background worker ini sebagai service daemon konstan
node -e "require('./src/utils/worker.js')"
```
