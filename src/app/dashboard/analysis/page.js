'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ChartView from '@/components/ChartView';
import LiveOrderbook from '@/components/LiveOrderbook';
import styles from '@/styles/analysis.module.css';

export default function AnalysisPage() {
  const [tab, setTab] = useState('API'); // API, UPLOAD
  const [asset, setAsset] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('1h');
  
  const [fileBase64, setFileBase64] = useState('');
  const [fileName, setFileName] = useState('');
  const [filePreview, setFilePreview] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Sizing and Leverage inputs
  const [riskPct, setRiskPct] = useState(1); // default 1% risk
  const [userBalance, setUserBalance] = useState(10000); // customizable balance
  const [leverage, setLeverage] = useState(''); // explicitly unselected by default
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Custom Technical Indicator Parameter states (adapted from Cryptometer)
  const [emaFastPeriod, setEmaFastPeriod] = useState('20');
  const [emaSlowPeriod, setEmaSlowPeriod] = useState('50');
  const [rsiPeriod, setRsiPeriod] = useState('14');
  const [atrPeriod, setAtrPeriod] = useState('14');
  const [adxPeriod, setAdxPeriod] = useState('14');
  const [volumePeriod, setVolumePeriod] = useState('20');
  const [showIndicatorSettings, setShowIndicatorSettings] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        // Premium Client-Side Image Compressor & Downscaler
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 1200;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to highly optimized JPEG to stay safely within Next.js API limits (~150KB)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setFilePreview(compressedDataUrl);
        const base64String = compressedDataUrl.split(',')[1];
        setFileBase64(base64String);
      };
      img.src = reader.result;
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
        asset,
        timeframe,
        imageBase64: tab === 'UPLOAD' ? fileBase64 : undefined,
        explicitLeverage: leverage ? parseInt(leverage) : undefined,
        customParameters: {
          emaFastPeriod: parseInt(emaFastPeriod),
          emaSlowPeriod: parseInt(emaSlowPeriod),
          rsiPeriod: parseInt(rsiPeriod),
          atrPeriod: parseInt(atrPeriod),
          adxPeriod: parseInt(adxPeriod),
          volumePeriod: parseInt(volumePeriod)
        }
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

  // Capital preservation calculation including leverage
  const calculatePositionSize = (balance, entry, sl, riskPercentage, levVal) => {
    if (!entry || !sl || entry === sl) return { size: 0, cost: 0, warning: '' };
    const riskAmount = balance * (riskPercentage / 100);
    const priceDiff = Math.abs(entry - sl);
    const positionSize = riskAmount / priceDiff;
    const nominalCost = positionSize * entry;
    
    if (!levVal) {
      return {
        size: Math.round(positionSize * 10000) / 10000,
        cost: 0,
        riskAmount: Math.round(riskAmount * 100) / 100,
        warning: 'Pilih leverage untuk menghitung margin!'
      };
    }
    
    const requiredMargin = nominalCost / parseInt(levVal);
    return {
      size: Math.round(positionSize * 10000) / 10000,
      cost: Math.round(requiredMargin * 100) / 100,
      riskAmount: Math.round(riskAmount * 100) / 100,
      warning: ''
    };
  };

  const positionSizing = result?.analysis?.entryPrice && result?.analysis?.stopLoss
    ? calculatePositionSize(userBalance, result.analysis.entryPrice, result.analysis.stopLoss, riskPct, leverage)
    : null;

  const componentNamesMap = {
    'EMA_ALIGNMENT': '1. Penyelarasan EMA Trend',
    'RSI_EXHAUSTION': '2. RSI Momentum Pullback',
    'CANDLESTICK_CONFLUENCE': '3. Pola Candlestick Reversal',
    'VOLUME_CONFIRMATION': '4. Volume Konfirmasi RVOL',
    'MARKET_STRUCTURE': '5. Breakout Struktur CHOCH/BOS',
    'LIQUIDITY_CONFLUENCE': '6. Liquidity Sweep & Cluster',
    'SR_DISTANCE': '7. Buffer Jarak Support/Resistance',
    'ADX_REGIME': '8. Kekuatan Trend ADX Regime',
    'FUTURES_INTEL': '9. Resiko Futures Open Interest',
    'SESSION_QUALITY': '10. Kualitas Volatilitas Sesi'
  };

  const tooltipTextMap = {
    'EMA_ALIGNMENT': 'Kelarasan arah trend antara Exponential Moving Average cepat (20) dan lambat (50) untuk melacak kemiringan momentum aktif.',
    'RSI_EXHAUSTION': 'Indikator momentum kekuatan jenuh Relative Strength Index (RSI) guna menyaring kondisi terlalu jenuh beli atau jenuh jual.',
    'CANDLESTICK_CONFLUENCE': 'Sinyal konfirmasi bentuk pola lilin (Pinbar, Engulfing, dsb.) yang memperkuat potensi pembalikan arah harga.',
    'VOLUME_CONFIRMATION': 'Volume Relatif (RVOL) melacak apakah penembusan harga saat ini didukung likuiditas volume di atas rata-rata 20 periode.',
    'MARKET_STRUCTURE': 'Deteksi validitas pematahan tren utama (BOS/CHOCH). Pematahan struktur yang lemah atau palsu otomatis digugurkan.',
    'LIQUIDITY_CONFLUENCE': 'Zona kluster pesanan likuiditas (Buy-side & Sell-side sweeps) guna mendeteksi area pembalikan arah harga yang efisien.',
    'SR_DISTANCE': 'Perhitungan jarak harga masuk terhadap garis Support/Resistance terdekat untuk mencegah posisi buruk di dekat batas pertahanan.',
    'ADX_REGIME': 'Kekuatan tren harga berdasarkan skala ADX (ADX > 25 = Trend Kuat; ADX < 20 = Sideways/Ranging).',
    'FUTURES_INTEL': 'Crowding risk dan data Funding Rate pasar berjangka Binance untuk melacak arah taruhan pelaku pasar ritel vs bandar.',
    'SESSION_QUALITY': 'Kualitas volatilitas berdasarkan sesi trading UTC aktif (Sesi London/New York memiliki likuiditas premium).'
  };

  return (
    <DashboardLayout title="Analisis Chart & Validasi">
      {/* 3-Step Progress Indicator */}
      <div className={styles.stepIndicator}>
        <div className={`${styles.stepItem} ${styles.stepActive}`}>
          <div className={styles.stepNum}>1</div>
          <span>Pilih Aset / Unggah Grafik</span>
        </div>
        <div className={styles.stepLine}></div>
        <div className={`${styles.stepItem} ${leverage ? styles.stepActive : ''}`}>
          <div className={styles.stepNum}>2</div>
          <span>Tentukan Leverage</span>
        </div>
        <div className={styles.stepLine}></div>
        <div className={`${styles.stepItem} ${result ? styles.stepActive : ''}`}>
          <div className={styles.stepNum}>3</div>
          <span>Kalkulasi Analisis</span>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabContainer}>
        <button 
          className={`${styles.tabBtn} ${tab === 'API' ? styles.activeTab : ''}`}
          onClick={() => { 
            setTab('API'); 
            setError(''); 
            setFilePreview('');
            setFileBase64('');
            setFileName('');
          }}
        >
          🔍 Penarikan API Real-Time
        </button>
        <button 
          className={`${styles.tabBtn} ${tab === 'UPLOAD' ? styles.activeTab : ''}`}
          onClick={() => { 
            setTab('UPLOAD'); 
            setError(''); 
          }}
        >
          📸 Visual OCR Chart AI
        </button>
      </div>

      <div className={styles.containerGrid}>
        {/* Controls Card */}
        <div className={`${styles.controlsCard} glass-panel`}>
          <form onSubmit={handleScan} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Pilih Aset Kripto</label>
              <select className="form-input" value={asset} onChange={(e) => setAsset(e.target.value)}>
                <option value="BTCUSDT">BTC / USDT (Bitcoin)</option>
                <option value="ETHUSDT">ETH / USDT (Ethereum)</option>
                <option value="BNBUSDT">BNB / USDT (Binance Coin)</option>
                <option value="SOLUSDT">SOL / USDT (Solana)</option>
                <option value="XRPUSDT">XRP / USDT (Ripple)</option>
                <option value="ADAUSDT">ADA / USDT (Cardano)</option>
                <option value="LINKUSDT">LINK / USDT (Chainlink)</option>
                <option value="SUIUSDT">SUI / USDT (Sui Network)</option>
                <option value="DOGEUSDT">DOGE / USDT (Dogecoin)</option>
                <option value="PEPEUSDT">PEPE / USDT (Pepe Coin)</option>
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

            {tab === 'UPLOAD' && (
              <>
                <div className={styles.formGroup} style={{ marginTop: '12px' }}>
                  <label className={styles.label}>Unggah Gambar Grafik</label>
                  <div className={styles.uploadBox}>
                    <input 
                      type="file" 
                      id="chartFile" 
                      accept="image/*" 
                      onChange={handleFileChange} 
                      className={styles.fileInput} 
                      required={!fileBase64}
                    />
                    <label htmlFor="chartFile" className={styles.uploadLabel}>
                      <span>📁</span> {fileName || 'Pilih atau drop gambar di sini'}
                    </label>
                  </div>
                </div>

                {filePreview && (
                  <div className={styles.formGroup} style={{ marginTop: '12px', textAlign: 'center' }}>
                    <label className={styles.label} style={{ display: 'block', textAlign: 'left', marginBottom: '6px' }}>
                      Pratinjau Grafik yang Dipilih:
                    </label>
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      height: '160px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      background: 'rgba(10, 15, 30, 0.5)',
                      backdropFilter: 'blur(8px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <img 
                        src={filePreview} 
                        alt="Chart Preview" 
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '100%', 
                          objectFit: 'contain'
                        }} 
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          setFilePreview('');
                          setFileBase64('');
                          setFileName('');
                        }}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'rgba(239, 68, 68, 0.85)',
                          border: 'none',
                          color: 'white',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          transition: 'background 0.2s',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
                        }}
                        title="Hapus gambar"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Custom Technical settings accordion (adapted from Cryptometer) */}
            <div className={styles.formGroup} style={{ marginTop: '12px', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '10px', background: 'rgba(255, 255, 255, 0.02)' }}>
              <button
                type="button"
                onClick={() => setShowIndicatorSettings(!showIndicatorSettings)}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  padding: '2px 0'
                }}
              >
                <span>🎛️ Pengaturan Parameter Indikator (Kustom)</span>
                <span>{showIndicatorSettings ? '▲' : '▼'}</span>
              </button>
              
              {showIndicatorSettings && (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>EMA Cepat</label>
                      <input
                        type="number"
                        className="form-input"
                        style={{ padding: '6px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)', width: '100%', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                        min="2"
                        max="200"
                        value={emaFastPeriod}
                        onChange={(e) => setEmaFastPeriod(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>EMA Lambat</label>
                      <input
                        type="number"
                        className="form-input"
                        style={{ padding: '6px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)', width: '100%', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                        min="2"
                        max="200"
                        value={emaSlowPeriod}
                        onChange={(e) => setEmaSlowPeriod(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>RSI Period</label>
                      <input
                        type="number"
                        className="form-input"
                        style={{ padding: '6px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)', width: '100%', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                        min="2"
                        max="200"
                        value={rsiPeriod}
                        onChange={(e) => setRsiPeriod(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>ATR Period</label>
                      <input
                        type="number"
                        className="form-input"
                        style={{ padding: '6px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)', width: '100%', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                        min="2"
                        max="200"
                        value={atrPeriod}
                        onChange={(e) => setAtrPeriod(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>ADX Period</label>
                      <input
                        type="number"
                        className="form-input"
                        style={{ padding: '6px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)', width: '100%', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                        min="2"
                        max="200"
                        value={adxPeriod}
                        onChange={(e) => setAdxPeriod(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>Vol SMA Period</label>
                      <input
                        type="number"
                        className="form-input"
                        style={{ padding: '6px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)', width: '100%', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                        min="2"
                        max="200"
                        value={volumePeriod}
                        onChange={(e) => setVolumePeriod(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.formGroup} style={{ marginBottom: '16px', marginTop: '16px' }}>
              <label className={styles.label} style={{ color: '#ffb703', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
                Pilih Leverage * (Wajib)
              </label>
              <select 
                className="form-input" 
                value={leverage} 
                onChange={(e) => setLeverage(e.target.value)} 
                required
                style={{ 
                  width: '100%', 
                  borderColor: !leverage ? '#ffb703' : 'rgba(255,255,255,0.1)', 
                  background: 'rgba(15, 23, 42, 0.6)', 
                  border: '1px solid rgba(255, 255, 255, 0.1)', 
                  padding: '10px', 
                  borderRadius: '6px', 
                  color: '#f8fafc' 
                }}
              >
                <option value="">-- Pilih Leverage --</option>
                <option value="1">1x (Placeholder)</option>
                <option value="2">2x</option>
                <option value="5">5x</option>
                <option value="10">10x</option>
                <option value="20">20x</option>
                <option value="50">50x</option>
              </select>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Menganalisis Lilin & Indikator Kuantitatif...' : 'Jalankan Analisis Hardened'}
            </button>
          </form>
        </div>

        {/* Dynamic Display results */}
        <div className={styles.resultsArea}>
          {error && <div className={styles.errorAlert}>{error}</div>}
          
          {loading && (
            <div className={`${styles.loadingCard} glass-panel`}>
              <span className="pulse-glow" style={{ fontSize: '3rem' }}>🔬</span>
              <p>Sedang mengevaluasi indikator kuantitatif, market regime, risk limits, dan model AI...</p>
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
              {/* Visual Journal Image Reference Preview */}
              {tab === 'UPLOAD' && filePreview && (
                <div className={`${styles.chartCard} glass-panel`} style={{ marginBottom: '20px', padding: '16px' }}>
                  <div className={styles.chartHeader} style={{ marginBottom: '10px' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                      <span>📸</span> Dokumen Visual Jurnal (Screenshot Anda)
                    </h4>
                  </div>
                  <div style={{
                    width: '100%',
                    maxHeight: '260px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <img 
                      src={filePreview} 
                      alt="Uploaded Chart Reference" 
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '260px', 
                        objectFit: 'contain' 
                      }} 
                    />
                  </div>
                </div>
              )}

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

              {/* Hardened Assessment Grid */}
              <div className={styles.assessmentGrid}>
                {/* Scorecard */}
                <div className={`${styles.scorecardCard} glass-panel`}>
                  <h3>Skor & Setup Rekomendasi</h3>
                  <div className={styles.signalBadgeWrapper}>
                    <span className={`${styles.badge} ${result.analysis.signal.includes('LONG') ? styles.buy : result.analysis.signal.includes('SHORT') ? styles.sell : styles.neutral}`}>
                      {result.analysis.signal}
                    </span>
                    <div className={styles.gradeBadge} style={{
                      backgroundColor: result.analysis.grade?.includes('A') ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                      color: result.analysis.grade?.includes('A') ? '#10b981' : '#ef4444',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      fontSize: '1.2rem',
                      border: `1px solid ${result.analysis.grade?.includes('A') ? '#10b981' : '#ef4444'}`
                    }}>
                      Grade {result.analysis.grade}
                    </div>
                  </div>

                  <div className={styles.gaugeContainer} style={{ marginTop: '16px', marginBottom: '16px' }}>
                    <div className={styles.gaugeHeader}>
                      <span>Keyakinan Sinyal (Calibrated Confidence)</span>
                      <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>{result.analysis.confidence}%</span>
                    </div>
                    <div className={styles.gaugeBar}>
                      <div 
                        className={styles.gaugeFill} 
                        style={{ 
                          width: `${result.analysis.confidence}%`,
                          color: result.analysis.signal?.includes('LONG') ? '#10b981' : result.analysis.signal?.includes('SHORT') ? '#ef4444' : '#8b5cf6',
                          backgroundColor: 'currentColor'
                        }} 
                      />
                    </div>
                    {result.calibration && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                        * Terkalibrasi secara dinamis terhadap performa trading nyata (Nilai mentah: {result.calibration.rawConfidence}%)
                      </span>
                    )}
                  </div>

                  <div className={styles.statsRow}>
                    <span>Expected Value (EV):</span>
                    <strong style={{ 
                      color: result.ev?.status === 'POSITIVE_EV' ? '#10b981' : result.ev?.status === 'NEGATIVE_EV' ? '#ef4444' : '#f59e0b'
                    }}>
                      {result.ev?.status || 'NEUTRAL_EV'}
                    </strong>
                  </div>

                  <div className={styles.statsRow}>
                    <span>Regime Market & Volatilitas:</span>
                    <strong>{result.analysis.marketRegime}</strong>
                  </div>

                  <div className={styles.statsRow}>
                    <span>Resiko Slippage Eksekusi:</span>
                    <strong style={{ 
                      color: result.slippage?.riskScore === 'HIGH' ? '#ef4444' : result.slippage?.riskScore === 'MODERATE' ? '#f59e0b' : '#10b981'
                    }}>
                      {result.slippage?.riskScore || 'LOW'} ({result.slippage?.slippagePercent?.toFixed(3)}%)
                    </strong>
                  </div>

                  <div className={styles.statsRow}>
                    <span>Sesi Likuiditas Aktif:</span>
                    <strong>{result.session?.sessionName || 'ASIA'} (Skor: {result.session?.qualityScore}/100)</strong>
                  </div>

                  {result.analysis.signal !== 'NO TRADE' && (
                    <div className={styles.targets} style={{ marginTop: '20px' }}>
                      <div className={styles.targetRow}>Entry Price: <span>${result.analysis.entryPrice?.toFixed(4)}</span></div>
                      <div className={styles.targetRow} style={{ color: '#ef4444' }}>Stop Loss: <span>${result.analysis.stopLoss?.toFixed(4)}</span></div>
                      <div className={styles.targetRow} style={{ color: '#10b981' }}>Take Profit 1 (1.5R): <span>${result.analysis.tp1?.toFixed(4)}</span></div>
                      {result.analysis.tp2 && <div className={styles.targetRow}>Take Profit 2 (2.0R): <span>${result.analysis.tp2?.toFixed(4)}</span></div>}
                      {result.analysis.tp3 && <div className={styles.targetRow}>Take Profit 3 (3.0R): <span>${result.analysis.tp3?.toFixed(4)}</span></div>}
                      <div className={styles.targetRow} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', fontWeight: 'bold' }}>
                        Risk/Reward Rasio: <span>{result.analysis.riskReward?.toFixed(2)}R</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Hardened Sizing & Leverage Calculator */}
                <div className={`${styles.sizingCard} glass-panel`}>
                  <h3>Kalkulator Posisi & Resiko Hardened</h3>
                  
                  {result.analysis.signal === 'NO TRADE' ? (
                    <div className={styles.noTradeAlert} style={{ color: '#ef4444', border: '1px solid #ef4444', padding: '16px', borderRadius: '6px' }}>
                      <strong>SISTEM REJECT SETUP:</strong> Sinyal di bawah ambang batas minimum scoring, memiliki bias negatif (NEGATIVE_EV), atau terdeteksi resiko event ekstrim. Eksekusi trade dibatalkan demi keamanan modal.
                    </div>
                  ) : (
                    <div className={styles.sizingForm}>
                      {/* Primary Leverage Selection */}
                      <div className={styles.formGroup} style={{ marginBottom: '12px' }}>
                        <label className={styles.label} style={{ color: '#ffb703', fontWeight: 'bold' }}>
                          Pilih Leverage * (Wajib Dipilih)
                        </label>
                        <select 
                          className="form-input" 
                          value={leverage} 
                          onChange={(e) => setLeverage(e.target.value)} 
                          style={{ width: '100%', borderColor: !leverage ? '#ffb703' : 'var(--border-color)' }}
                        >
                          <option value="">-- Pilih Leverage --</option>
                          <option value="1">1x (Placeholder)</option>
                          <option value="2">2x</option>
                          <option value="5">5x</option>
                          <option value="10">10x</option>
                          <option value="20">20x</option>
                          <option value="50">50x</option>
                        </select>
                      </div>

                      {/* Advanced Settings Accordion Toggle */}
                      <button 
                        type="button" 
                        className={styles.advancedToggle} 
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        style={{ marginBottom: '8px' }}
                      >
                        <span>🎛️ Atur Saldo & Toleransi Resiko Lanjutan</span>
                        <span>{showAdvanced ? '▲ Lipat' : '▼ Tampilkan'}</span>
                      </button>

                      {/* Advanced Parameters */}
                      <div className={`${styles.advancedContent} ${showAdvanced ? styles.advancedContentActive : ''}`}>
                        <div className={styles.formGroup} style={{ width: '100%' }}>
                          <label className={styles.label}>Saldo Akun Aktif ($)</label>
                          <input 
                            type="number" 
                            className="form-input" 
                            value={userBalance} 
                            onChange={(e) => setUserBalance(Math.max(1, parseFloat(e.target.value) || 0))} 
                            style={{ width: '100%', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px', borderRadius: '6px', color: '#f8fafc' }}
                          />
                        </div>

                        <div className={styles.formGroup} style={{ width: '100%' }}>
                          <label className={styles.label}>Resiko Per Perdagangan: {riskPct}%</label>
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
                      </div>
                      
                      {positionSizing && (
                        <div className={styles.sizingResults} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                          <div className={styles.sizingRow}>
                            <span>Nilai Resiko Maksimal ($):</span>
                            <strong>${positionSizing.riskAmount}</strong>
                          </div>
                          <div className={styles.sizingRow}>
                            <span>Ukuran Posisi Kontrak:</span>
                            <strong>{positionSizing.size} {result.analysis.asset?.replace('USDT', '')}</strong>
                          </div>
                          
                          {positionSizing.warning ? (
                            <div style={{ color: '#ffb703', fontSize: '0.85rem', marginTop: '10px', fontWeight: 'bold' }}>
                              ⚠️ {positionSizing.warning}
                            </div>
                          ) : (
                            <div className={styles.sizingRow} style={{ color: '#10b981' }}>
                              <span>Margin Dibutuhkan (Cost):</span>
                              <strong>${positionSizing.cost}</strong>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 10-Component Scoring Details Table */}
              <div className="glass-panel" style={{ padding: '24px', marginTop: '24px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                  Matriks Skor 10-Komponen Kuantitatif & Risk Safeguard
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '10px' }}>Indikator / Filter Resiko</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>Bobot</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>Skor Mentah</th>
                        <th style={{ padding: '10px', textAlign: 'center' }}>Skor Terbobot</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.analysis.scoreComponents?.map((comp, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                            <span>{componentNamesMap[comp.componentName] || comp.componentName}</span>
                            {tooltipTextMap[comp.componentName] && (
                              <span className={styles.tooltipWrapper}>
                                <i className={styles.infoIcon}>i</i>
                                <span className={styles.tooltipText}>{tooltipTextMap[comp.componentName]}</span>
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>{(comp.weight * 100).toFixed(0)}%</td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>{comp.rawScore.toFixed(0)}</td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>{comp.weightedScore.toFixed(1)}</td>
                          <td style={{ padding: '10px', textAlign: 'right' }}>
                            <span style={{
                              backgroundColor: comp.isCriteriaMet ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                              color: comp.isCriteriaMet ? '#10b981' : '#ef4444',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              fontWeight: 'bold'
                            }}>
                              {comp.isCriteriaMet ? '✓ Lolos' : '✗ Gagal'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Monte Carlo Risk Simulation Card */}
              {result.monteCarlo && (
                <div className={`${styles.monteCarloCard} glass-panel`} style={{ marginTop: '24px' }}>
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
                      <line x1="50" y1="20" x2="450" y2="20" stroke="#2a2f3a" strokeWidth="1" />
                      <line x1="50" y1="50" x2="450" y2="50" stroke="#2a2f3a" strokeWidth="1" />
                      <line x1="50" y1="80" x2="450" y2="80" stroke="#2a2f3a" strokeWidth="1" />
                      <line x1="50" y1="110" x2="450" y2="110" stroke="#2a2f3a" strokeWidth="1" />
                      <line x1="50" y1="130" x2="450" y2="130" stroke="#4a5264" strokeWidth="1.5" />

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
                            <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fill="#relative" fontSize="11" fontWeight="bold">
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

              {/* Quantitative Engine Explanation confluences */}
              {result.aiExplanation && (
                <div className={`${styles.explanationCard} glass-panel`} style={{ marginTop: '24px' }}>
                  <h3>Justifikasi Confluence Kuantitatif (Institutional Engine)</h3>
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

      {/* Real-time WebSockets Market Feed Orderbook & Trade Flow (adapted from Coinpulse) */}
      <LiveOrderbook symbol={asset} />
    </DashboardLayout>
  );
}
