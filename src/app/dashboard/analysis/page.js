'use client';

import { useState, useEffect, useRef } from 'react';
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

  // Experience level & indicators (adapted from Cryptometer)
  const [experienceLevel, setExperienceLevel] = useState('PEMULA'); // PEMULA, PRO
  const [emaFastPeriod, setEmaFastPeriod] = useState('20');
  const [emaSlowPeriod, setEmaSlowPeriod] = useState('50');
  const [rsiPeriod, setRsiPeriod] = useState('14');
  const [atrPeriod, setAtrPeriod] = useState('14');
  const [adxPeriod, setAdxPeriod] = useState('14');
  const [volumePeriod, setVolumePeriod] = useState('20');
  const [showIndicatorSettings, setShowIndicatorSettings] = useState(false);

  // Live real-time candlestick data (before scan!)
  const [liveCandles, setLiveCandles] = useState([]);
  const [liveIndicators, setLiveIndicators] = useState({});
  const [liveCandleError, setLiveCandleError] = useState('');
  const [latestLivePrice, setLatestLivePrice] = useState(null);

  // Real-time Spot/Futures Trading Simulator (adapted from Cryptometer/Coinpulse)
  const [demoBalance, setDemoBalance] = useState(10000);
  const [simType, setSimType] = useState('SPOT'); // SPOT, FUTURES
  const [simDirection, setSimDirection] = useState('LONG'); // LONG, SHORT
  const [simLeverage, setSimLeverage] = useState('1'); // 1x to 50x
  const [simSize, setSimSize] = useState('1000'); // USDT size
  const [activePositions, setActivePositions] = useState([]);
  const [tradeLogs, setTradeLogs] = useState([]);
  const [simMessage, setSimMessage] = useState('');

  // 1. Synchronize presets based on experience level
  useEffect(() => {
    if (experienceLevel === 'PEMULA') {
      // Scientifically backed academic defaults
      setEmaFastPeriod('20');
      setEmaSlowPeriod('50');
      setRsiPeriod('14');
      setAtrPeriod('14');
      setAdxPeriod('14');
      setVolumePeriod('20');
    }
  }, [experienceLevel]);

  // 2. Poll live candles every 5 seconds (Geoblock Safe proxy)
  useEffect(() => {
    if (!asset || !timeframe) return;

    let active = true;
    async function loadLiveCandles() {
      try {
        const res = await fetch(`/api/binance/candles?symbol=${asset}&timeframe=${timeframe}&limit=100`);
        if (!res.ok) throw new Error("Gagal memuat chart real-time");
        const data = await res.json();
        
        if (data.success && active) {
          setLiveCandles(data.candles);
          setLiveCandleError('');
          
          if (data.candles.length > 0) {
            const closePrices = data.candles.map(c => c.close);
            const latestPrice = closePrices[closePrices.length - 1];
            setLatestLivePrice(latestPrice);

            // Compute client-side indicator overlays instantly
            const computedFast = calculateClientEMA(closePrices, parseInt(emaFastPeriod));
            const computedSlow = calculateClientEMA(closePrices, parseInt(emaSlowPeriod));
            setLiveIndicators({
              emaFast: computedFast,
              emaSlow: computedSlow
            });
          }
        }
      } catch (err) {
        if (active) {
          setLiveCandleError("Gagal memperbarui lilin Binance real-time (Proxy fallback aktif)");
        }
      }
    }

    loadLiveCandles();
    const interval = setInterval(loadLiveCandles, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [asset, timeframe, emaFastPeriod, emaSlowPeriod]);

  // 3. Persist demo trading accounts in LocalStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedBal = localStorage.getItem('demo_balance');
      const savedPositions = localStorage.getItem('demo_positions');
      const savedLogs = localStorage.getItem('demo_logs');

      if (savedBal) setDemoBalance(parseFloat(savedBal));
      if (savedPositions) setActivePositions(JSON.parse(savedPositions));
      if (savedLogs) setTradeLogs(JSON.parse(savedLogs));
    }
  }, []);

  // Update floating positions PnL in real-time when latestLivePrice moves
  useEffect(() => {
    if (latestLivePrice && activePositions.length > 0) {
      const updated = activePositions.map(pos => {
        if (pos.symbol !== asset) return pos;
        
        let pnl = 0;
        const entry = pos.entryPrice;
        const sizeVal = pos.size;
        const lev = pos.leverage;

        if (pos.type === 'SPOT') {
          // Spot PnL = qty * (current - entry)
          const qty = sizeVal / entry;
          pnl = qty * (latestLivePrice - entry);
        } else {
          // Futures PnL
          const qty = (sizeVal * lev) / entry;
          if (pos.direction === 'LONG') {
            pnl = qty * (latestLivePrice - entry);
          } else {
            pnl = qty * (entry - latestLivePrice);
          }
        }

        const pnlPct = (pnl / (sizeVal / (pos.type === 'FUTURES' ? lev : 1))) * 100;
        return {
          ...pos,
          currentPrice: latestLivePrice,
          pnl: Math.round(pnl * 100) / 100,
          pnlPercent: Math.round(pnlPct * 100) / 100
        };
      });

      setActivePositions(updated);
      localStorage.setItem('demo_positions', JSON.stringify(updated));
    }
  }, [latestLivePrice]);

  const handleOpenDemoPosition = () => {
    if (!latestLivePrice) {
      setSimMessage("Harap tunggu harga live terisi!");
      return;
    }

    const orderSize = parseFloat(simSize);
    if (isNaN(orderSize) || orderSize <= 0) {
      setSimMessage("Ukuran posisi harus lebih dari 0!");
      return;
    }

    // Verify balance
    const marginRequired = simType === 'SPOT' ? orderSize : orderSize / parseInt(simLeverage);
    if (marginRequired > demoBalance) {
      setSimMessage("Saldo demo tidak mencukupi untuk membuka posisi!");
      return;
    }

    const newPosition = {
      id: Date.now(),
      symbol: asset,
      type: simType,
      direction: simType === 'SPOT' ? 'LONG' : simDirection,
      leverage: simType === 'SPOT' ? 1 : parseInt(simLeverage),
      entryPrice: latestLivePrice,
      currentPrice: latestLivePrice,
      size: orderSize,
      margin: marginRequired,
      pnl: 0.0,
      pnlPercent: 0.0,
      time: new Date().toLocaleTimeString()
    };

    const newBal = demoBalance - marginRequired;
    const updatedPositions = [...activePositions, newPosition];

    setDemoBalance(newBal);
    setActivePositions(updatedPositions);
    localStorage.setItem('demo_balance', String(newBal));
    localStorage.setItem('demo_positions', JSON.stringify(updatedPositions));
    
    setSimMessage(`Posisi ${simType} ${newPosition.direction || 'BUY'} ${asset} berhasil dibuka!`);
    setTimeout(() => setSimMessage(''), 3000);
  };

  const handleCloseDemoPosition = (posId) => {
    const pos = activePositions.find(p => p.id === posId);
    if (!pos) return;

    // Realize profit and release margin
    const returnedFunds = pos.margin + pos.pnl;
    const newBal = Math.max(0, demoBalance + returnedFunds);

    const logEntry = {
      id: pos.id,
      symbol: pos.symbol,
      type: pos.type,
      direction: pos.direction,
      entryPrice: pos.entryPrice,
      exitPrice: pos.currentPrice,
      pnl: pos.pnl,
      pnlPercent: pos.pnlPercent,
      time: new Date().toLocaleTimeString()
    };

    const updatedPositions = activePositions.filter(p => p.id !== posId);
    const updatedLogs = [logEntry, ...tradeLogs.slice(0, 9)];

    setDemoBalance(newBal);
    setActivePositions(updatedPositions);
    setTradeLogs(updatedLogs);

    localStorage.setItem('demo_balance', String(newBal));
    localStorage.setItem('demo_positions', JSON.stringify(updatedPositions));
    localStorage.setItem('demo_logs', JSON.stringify(updatedLogs));

    setSimMessage(`Posisi ${pos.symbol} ditutup! Realisasi PnL: $${pos.pnl}`);
    setTimeout(() => setSimMessage(''), 3000);
  };

  const handleResetDemoAccount = () => {
    setDemoBalance(10000);
    setActivePositions([]);
    setTradeLogs([]);
    localStorage.setItem('demo_balance', '10000');
    localStorage.setItem('demo_positions', '[]');
    localStorage.setItem('demo_logs', '[]');
    setSimMessage("Akun simulasi demo di-reset ke $10,000.00!");
    setTimeout(() => setSimMessage(''), 3000);
  };

  // Client-side pure EMA logic
  const calculateClientEMA = (prices, period) => {
    if (prices.length < period) return Array(prices.length).fill(null);
    const k = 2 / (period + 1);
    const ema = [];
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += prices[i];
    }
    let prevEma = sum / period;
    
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        ema.push(null);
      } else if (i === period - 1) {
        ema.push(prevEma);
      } else {
        const nextEma = prices[i] * k + prevEma * (1 - k);
        ema.push(nextEma);
        prevEma = nextEma;
      }
    }
    return ema;
  };

  // 4. Capture SVG elements and convert to JPEG simulation Base64 (Take Picture!)
  const handleCaptureChart = () => {
    setLoading(true);
    setResult(null);
    setError('');

    try {
      // 1. Create client-side visual snapshot simulation via high-tech branded Canvas
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');

      // Styles
      ctx.fillStyle = '#0f172a'; // Slate-900 background
      ctx.fillRect(0, 0, 800, 400);

      // Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < 800; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 400);
        ctx.stroke();
      }
      for (let y = 0; y < 400; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(800, y);
        ctx.stroke();
      }

      // Title & Branded Header
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.fillText(`TRADEMACHINE AI EYE™ - ${asset} (${timeframe})`, 20, 35);
      
      ctx.fillStyle = '#10b981';
      ctx.font = '12px Outfit, sans-serif';
      ctx.fillText("STATUS: SCAN CAPTURED LIVE (INSTANT CONFLUENCE)", 20, 55);

      // Draw Candlesticks representation based on live candles
      if (liveCandles.length > 0) {
        const recent = liveCandles.slice(-30);
        const highs = recent.map(c => c.high);
        const lows = recent.map(c => c.low);
        const max = Math.max(...highs);
        const min = Math.min(...lows);
        const range = max - min;

        const getYVal = (price) => {
          return 340 - ((price - min) / range) * 220;
        };

        recent.forEach((candle, idx) => {
          const x = 80 + idx * 22;
          const openY = getYVal(candle.open);
          const closeY = getYVal(candle.close);
          const highY = getYVal(candle.high);
          const lowY = getYVal(candle.low);
          
          const isBullish = candle.close >= candle.open;
          ctx.strokeStyle = isBullish ? '#10b981' : '#ef4444';
          ctx.fillStyle = isBullish ? '#10b981' : '#ef4444';
          ctx.lineWidth = 1.5;

          // Wick
          ctx.beginPath();
          ctx.moveTo(x + 6, highY);
          ctx.lineTo(x + 6, lowY);
          ctx.stroke();

          // Body
          const bodyH = Math.max(2, Math.abs(closeY - openY));
          ctx.fillRect(x, Math.min(openY, closeY), 12, bodyH);
        });
      }

      // Branded branding overlay
      ctx.fillStyle = 'rgba(255, 183, 3, 0.1)';
      ctx.fillRect(600, 20, 180, 50);
      ctx.fillStyle = '#ffb703';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText("PROPRIETARY OCR OCR MODEL", 610, 38);
      ctx.fillText("HARDENED RISK GRADE", 610, 56);

      // Generate DataUrl and trigger scan in background!
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setFilePreview(compressedDataUrl);
      setFileName(`Instant-Chart-Capture-${asset}.jpg`);
      const base64String = compressedDataUrl.split(',')[1];
      setFileBase64(base64String);

      // Switch tab state visually to OCR_UPLOAD
      setTab('UPLOAD');

      // Trigger automatic scan handler!
      setTimeout(async () => {
        try {
          const payload = {
            sourceType: 'OCR_UPLOAD',
            asset,
            timeframe,
            imageBase64: base64String,
            explicitLeverage: leverage ? parseInt(leverage) : 10 // Default to 10x if unselected for simulation convenience
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
            setError(data.error || 'Pemindaian visual gagal dilakukan');
          }
        } catch (err) {
          setError('Gagal menghubungkan pemindaian visual');
        } finally {
          setLoading(false);
        }
      }, 500);

    } catch (err) {
      console.error(err);
      setError('Gagal menangkap layar grafik real-time');
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
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
            
            {/* Experience Level Presets Selector */}
            <div className={styles.formGroup} style={{ marginBottom: '14px' }}>
              <label className={styles.label}>Tingkat Pengalaman (Presets)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setExperienceLevel('PEMULA')}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    background: experienceLevel === 'PEMULA' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${experienceLevel === 'PEMULA' ? '#3b82f6' : 'rgba(255,255,255,0.08)'}`,
                    color: experienceLevel === 'PEMULA' ? '#60a5fa' : '#9ca3af'
                  }}
                  title="Gunakan parameter ilmiah standard bursa"
                >
                  🎓 PEMULA (Akademis)
                </button>
                <button
                  type="button"
                  onClick={() => setExperienceLevel('PRO')}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    background: experienceLevel === 'PRO' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${experienceLevel === 'PRO' ? '#a855f7' : 'rgba(255,255,255,0.08)'}`,
                    color: experienceLevel === 'PRO' ? '#c084fc' : '#9ca3af'
                  }}
                  title="Sesuaikan setelan indikator sebebasnya"
                >
                  🎛️ PRO (Kustom)
                </button>
              </div>
            </div>

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
                <span>🎛️ Pengaturan Parameter Indikator {experienceLevel === 'PEMULA' ? '(Kunci Pemula)' : '(Kustom Pro)'}</span>
                <span>{showIndicatorSettings ? '▲' : '▼'}</span>
              </button>
              
              {showIndicatorSettings && (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', fontStyle: 'italic', marginBottom: '4px' }}>
                    {experienceLevel === 'PEMULA' 
                      ? '* Terkunci ke parameter default standard akademis J. Welles Wilder (14) & EMA Trend.'
                      : '* Setelan terbuka penuh. Silakan kustomisasi sesuai strategi mitigasi resiko Anda.'}
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'block', marginBottom: '3px' }}>EMA Cepat</label>
                      <input
                        type="number"
                        className="form-input"
                        style={{ padding: '6px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)', width: '100%', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                        min="2"
                        max="200"
                        disabled={experienceLevel === 'PEMULA'}
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
                        disabled={experienceLevel === 'PEMULA'}
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
                        disabled={experienceLevel === 'PEMULA'}
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
                        disabled={experienceLevel === 'PEMULA'}
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
                        disabled={experienceLevel === 'PEMULA'}
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
                        disabled={experienceLevel === 'PEMULA'}
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
            <div className={styles.resultsWrapper}>
              
              {/* Interactive Real-Time Candlestick Chart (Active On Load!) */}
              <div className={`${styles.chartCard} glass-panel`} style={{ position: 'relative' }}>
                <div className={styles.chartHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0 }}>Live Real-Time Candlestick ({asset} - {timeframe})</h4>
                    <span style={{ fontSize: '0.72rem', color: '#10b981' }}>● Terkoneksi (Melacak Perubahan Dinamis)</span>
                  </div>
                  
                  {/* Instantly capture screenshot & scan workflow button! */}
                  <button
                    type="button"
                    onClick={handleCaptureChart}
                    style={{
                      background: 'rgba(251, 191, 36, 0.15)',
                      color: '#fbbf24',
                      border: '1px solid rgba(251, 191, 36, 0.3)',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease'
                    }}
                    title="Ambil foto dari grafik live saat ini dan langsung jalankan analisis OCR visual instan!"
                  >
                    📸 Ambil Foto Chart & Pindai
                  </button>
                </div>

                {liveCandleError ? (
                  <div style={{ padding: '20px', color: '#f87171', fontSize: '0.8rem', textAlign: 'center' }}>{liveCandleError}</div>
                ) : (
                  <ChartView 
                    candles={liveCandles} 
                    indicators={liveIndicators}
                  />
                )}
              </div>
            </div>
          )}

          {result && !loading && (
            <div className={styles.resultsWrapper}>
              {/* Captured visuals journal doc */}
              {tab === 'UPLOAD' && filePreview && (
                <div className={`${styles.chartCard} glass-panel`} style={{ marginBottom: '20px', padding: '16px' }}>
                  <div className={styles.chartHeader} style={{ marginBottom: '10px' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                      <span>📸</span> Dokumen Visual Jurnal (Hasil Jepretan Anda)
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

              {/* Main SVG Chart with target zones overlay */}
              <div className={`${styles.chartCard} glass-panel`}>
                <div className={styles.chartHeader}>
                  <h4>Grafik Evaluasi Strategi ({result.analysis.asset} - {result.analysis.timeframe})</h4>
                  <div className={styles.legend}>
                    <span style={{ color: 'var(--accent-primary)' }}>■ EMA Cepat ({emaFastPeriod})</span>
                    <span style={{ color: 'var(--accent-secondary)' }}>■ EMA Lambat ({emaSlowPeriod})</span>
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

              {/* Assessment Grid */}
              <div className={styles.assessmentGrid}>
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
                      <span>Keyakinan Sinyal (Confidence)</span>
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
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Real-time Demo Spot & Futures Trading Simulator (adapted from Cryptometer) */}
      <div className="glass-panel" style={{
        marginTop: '24px',
        padding: '20px',
        borderRadius: '12px',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(16px)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: '10px',
          marginBottom: '16px'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🎮</span> Simulasi Demo Trading (Spot & Futures)
            </h3>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Latih mitigasi resiko Anda dengan dana simulasi non-nyata</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ fontSize: '0.9rem', color: '#f8fafc' }}>
              Saldo Demo: <strong style={{ color: '#10b981', fontSize: '1rem' }}>${demoBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT</strong>
            </div>
            <button
              type="button"
              onClick={handleResetDemoAccount}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Reset Saldo
            </button>
          </div>
        </div>

        {simMessage && (
          <div style={{
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            color: '#60a5fa',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '0.8rem',
            marginBottom: '12px',
            fontWeight: '600'
          }}>
            {simMessage}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          
          {/* Order Placement Form */}
          <div style={{ background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.88rem', color: '#f8fafc', fontWeight: 'bold' }}>Buka Posisi Baru ({asset})</h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              
              {/* Spot/Futures Tabs */}
              <div>
                <label style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Tipe Transaksi</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => { setSimType('SPOT'); setSimLeverage('1'); }}
                    style={{
                      padding: '6px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      background: simType === 'SPOT' ? 'rgba(255,255,255,0.1)' : 'transparent',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#fff'
                    }}
                  >
                    SPOT (1x)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimType('FUTURES')}
                    style={{
                      padding: '6px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      background: simType === 'FUTURES' ? 'rgba(255,255,255,0.1)' : 'transparent',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#fff'
                    }}
                  >
                    FUTURES
                  </button>
                </div>
              </div>

              {/* Futures settings: direction & leverage */}
              {simType === 'FUTURES' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Arah</label>
                    <select
                      className="form-input"
                      style={{ padding: '6px', fontSize: '0.78rem', background: 'rgba(15,23,42,0.8)' }}
                      value={simDirection}
                      onChange={(e) => setSimDirection(e.target.value)}
                    >
                      <option value="LONG">📈 BUY (Long)</option>
                      <option value="SHORT">📉 SELL (Short)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Leverage</label>
                    <select
                      className="form-input"
                      style={{ padding: '6px', fontSize: '0.78rem', background: 'rgba(15,23,42,0.8)' }}
                      value={simLeverage}
                      onChange={(e) => setSimLeverage(e.target.value)}
                    >
                      <option value="2">2x</option>
                      <option value="5">5x</option>
                      <option value="10">10x</option>
                      <option value="20">20x</option>
                      <option value="50">50x</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Size input */}
              <div>
                <label style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>
                  Ukuran Posisi ({simType === 'SPOT' ? 'USDT' : 'Margin Nominal USDT'})
                </label>
                <input
                  type="number"
                  className="form-input"
                  style={{ padding: '6px', fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)', width: '100%' }}
                  value={simSize}
                  onChange={(e) => setSimSize(e.target.value)}
                  min="1"
                />
              </div>

              <div style={{ fontSize: '0.72rem', color: '#94a3b8', background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '4px' }}>
                <div>Harga Masuk Live: <strong style={{ color: '#fbbf24' }}>${latestLivePrice ? latestLivePrice.toLocaleString() : 'Memuat harga...'}</strong></div>
                {simType === 'FUTURES' && (
                  <div>Estimasi Margin Dipakai: <strong style={{ color: '#fff' }}>${(parseFloat(simSize) / parseInt(simLeverage)).toFixed(2)} USDT</strong></div>
                )}
              </div>

              <button
                type="button"
                onClick={handleOpenDemoPosition}
                disabled={!latestLivePrice}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: simDirection === 'LONG' || simType === 'SPOT' ? '#10b981' : '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  transition: 'opacity 0.2s'
                }}
              >
                {!latestLivePrice ? 'Memuat Harga...' : `BUKA POSISI DEMO ${simType}`}
              </button>
            </div>
          </div>

          {/* Active Positions & Logs */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h4 style={{ margin: 0, fontSize: '0.88rem', color: '#f8fafc', fontWeight: 'bold' }}>Posisi Demo Aktif</h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', maxHeight: '200px' }}>
              {activePositions.length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center', color: '#64748b', fontSize: '0.8rem', background: 'rgba(255,255,255,0.01)', borderRadius: '6px' }}>
                  Belum ada posisi simulasi yang terbuka.
                </div>
              ) : (
                activePositions.map((pos) => (
                  <div key={pos.id} style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '6px',
                    padding: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#f8fafc' }}>
                        {pos.symbol} <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '3px', marginLeft: '6px', background: pos.direction === 'LONG' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: pos.direction === 'LONG' ? '#10b981' : '#ef4444' }}>{pos.direction || 'BUY'} {pos.leverage}x</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '2px' }}>
                        Entry: ${pos.entryPrice.toLocaleString()} ➔ Live: ${pos.currentPrice.toLocaleString()}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: pos.pnl >= 0 ? '#10b981' : '#ef4444' }}>
                        {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toLocaleString()} ({pos.pnlPercent}%)
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCloseDemoPosition(pos.id)}
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.08)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          marginTop: '4px',
                          fontWeight: '600'
                        }}
                      >
                        Tutup Posisi
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* History Logs */}
            {tradeLogs.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <h5 style={{ margin: '0 0 6px 0', fontSize: '0.78rem', color: '#94a3b8' }}>Riwayat PnL Terakhir</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {tradeLogs.slice(0, 3).map((log) => (
                    <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8' }}>
                      <span>{log.time} - {log.symbol} ({log.type})</span>
                      <strong style={{ color: log.pnl >= 0 ? '#10b981' : '#ef4444' }}>
                        {log.pnl >= 0 ? '+' : ''}${log.pnl.toLocaleString()} ({log.pnlPercent}%)
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real-time WebSockets Market Feed Orderbook & Trade Flow (adapted from Coinpulse) */}
      <LiveOrderbook symbol={asset} />
    </DashboardLayout>
  );
}
