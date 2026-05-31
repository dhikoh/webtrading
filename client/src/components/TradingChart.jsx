import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
import { Activity, Info, BarChart2, Eye, EyeOff } from 'lucide-react';
import { API_URL } from '../config.js';

export default function TradingChart({ activeSymbol, marketType, socket, onPriceTick, lang = 'id' }) {
  const t = {
    id: {
      chartTab: 'Grafik',
      infoTab: 'Info',
      dataTab: 'Data Perdagangan',
      timeLabel: 'Waktu:',
      nowLabel: 'Sekarang',
      changeLabel: 'Ubah:',
      rangeLabel: 'Rentang:',
      assetInfoTitle: 'Info Aset:',
      assetDesc: `${activeSymbol.toUpperCase()} adalah aset kripto global terkemuka yang diperdagangkan secara real-time pada bursa utama dunia. Simulator Trading Machine mengambil feed pasar terenkripsi secara instan untuk memberikan pengalaman simulasi pesanan limit, stop, dan leverage berskala institusional.`,
      mechanismLabel: 'Mekanisme',
      feesLabel: 'Biaya Transaksi',
      liquidityLabel: 'Likuiditas Eksternal',
      statusLabel: 'Status Portal',
      statusValue: 'Aktif & Stabil',
      fundFlowTitle: 'Analisis Aliran Dana',
      netBuy: 'Beli Net',
      netInflow24h: 'Inflow Net 24J:',
      trendTitle: 'Tren Aliran Net Besar 5-Hari',
      dayPrefix: 'Hari ',
      liveStreamLabel: 'Aliran Langsung Terrelai',
      dataEngineLabel: 'Mesin Data Bybit V5'
    },
    en: {
      chartTab: 'Chart',
      infoTab: 'Info',
      dataTab: 'Trading Data',
      timeLabel: 'Time:',
      nowLabel: 'Now',
      changeLabel: 'Change:',
      rangeLabel: 'Range:',
      assetInfoTitle: 'Asset Info:',
      assetDesc: `${activeSymbol.toUpperCase()} is a leading global crypto asset traded real-time on major world exchanges. The Trading Machine Simulator retrieves instant encrypted market feeds to provide an institutional-grade simulation experience for limit, stop, and leverage orders.`,
      mechanismLabel: 'Mechanism',
      feesLabel: 'Transaction Fees',
      liquidityLabel: 'External Liquidity',
      statusLabel: 'Portal Status',
      statusValue: 'Active & Stable',
      fundFlowTitle: 'Fund Flow Analysis',
      netBuy: 'Net Buy',
      netInflow24h: '24H Net Inflow:',
      trendTitle: '5-Day Large Net Inflow Trend',
      dayPrefix: 'Day ',
      liveStreamLabel: 'Relayed Live Stream',
      dataEngineLabel: 'Bybit V5 Data Engine'
    }
  }[lang];

  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const ma7SeriesRef = useRef(null);
  const ma25SeriesRef = useRef(null);
  const ma99SeriesRef = useRef(null);
  const candleDataRef = useRef([]);

  const [activeInterval, setActiveInterval] = useState('1m');
  const [activeTab, setActiveTab] = useState('chart'); // 'chart' | 'info' | 'data'

  // Moving Average Toggles
  const [showMA7, setShowMA7] = useState(true);
  const [showMA25, setShowMA25] = useState(true);
  const [showMA99, setShowMA99] = useState(true);

  // Dynamic Ticker Legend
  const [legend, setLegend] = useState({
    time: '-',
    open: '-',
    high: '-',
    low: '-',
    close: '-',
    change: '-',
    range: '-',
    isUp: true
  });

  // Handle MA visibility changes
  useEffect(() => {
    if (ma7SeriesRef.current) ma7SeriesRef.current.applyOptions({ visible: showMA7 });
  }, [showMA7]);

  useEffect(() => {
    if (ma25SeriesRef.current) ma25SeriesRef.current.applyOptions({ visible: showMA25 });
  }, [showMA25]);

  useEffect(() => {
    if (ma99SeriesRef.current) ma99SeriesRef.current.applyOptions({ visible: showMA99 });
  }, [showMA99]);

  useEffect(() => {
    if (!containerRef.current || activeTab !== 'chart') return;

    let isCancelled = false;
    let chartPrecision = 2;

    // 1. Initialize Lightweight Chart Engine
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 330,
      layout: {
        background: { color: '#161a1e' },
        textColor: '#848e9c',
        fontSize: 11,
        fontFamily: 'Inter, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(43, 49, 57, 0.15)' },
        horzLines: { color: 'rgba(43, 49, 57, 0.15)' },
      },
      crosshair: {
        mode: 1, // Dotted
        vertLine: { color: '#848e9c', width: 1, style: 3 },
        horzLine: { color: '#848e9c', width: 1, style: 3 },
      },
      timeScale: {
        borderColor: '#2b3139',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#2b3139',
        autoScale: true,
      }
    });

    chartRef.current = chart;

    // 2. Add Candlestick Series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#0ecb81',
      downColor: '#f6465d',
      borderUpColor: '#0ecb81',
      borderDownColor: '#f6465d',
      wickUpColor: '#0ecb81',
      wickDownColor: '#f6465d',
    });
    candleSeriesRef.current = candleSeries;

    // 3. Add Volume Series overlay
    const volumeSeries = chart.addHistogramSeries({
      color: 'rgba(14, 203, 129, 0.15)',
      priceFormat: { type: 'volume' },
      priceScaleId: '', // Overlay over candle scales
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8, // volume rests at bottom 20%
        bottom: 0,
      },
    });
    volumeSeriesRef.current = volumeSeries;

    // 4. Add Moving Average series lines
    const ma7Series = chart.addLineSeries({
      color: '#f0b90b', // Yellow
      lineWidth: 1.2,
      priceScaleId: 'right',
      visible: showMA7
    });
    const ma25Series = chart.addLineSeries({
      color: '#ec4899', // Pink
      lineWidth: 1.2,
      priceScaleId: 'right',
      visible: showMA25
    });
    const ma99Series = chart.addLineSeries({
      color: '#a855f7', // Purple
      lineWidth: 1.2,
      priceScaleId: 'right',
      visible: showMA99
    });

    ma7SeriesRef.current = ma7Series;
    ma25SeriesRef.current = ma25Series;
    ma99SeriesRef.current = ma99Series;

    // Helper to calculate Moving Averages
    const calculateMA = (data, period) => {
      const maData = [];
      for (let i = 0; i < data.length; i++) {
        if (i < period - 1) continue;
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += data[i - j].close;
        }
        maData.push({
          time: data[i].time,
          value: sum / period
        });
      }
      return maData;
    };

    // Helper to update Dynamic HUD Legend
    const updateLegend = (candle, isLatest = false) => {
      if (isCancelled || !candle) return;
      const change = candle.open ? ((candle.close - candle.open) / candle.open) * 100 : 0;
      const range = candle.open ? ((candle.high - candle.low) / candle.open) * 100 : 0;
      
      let timeStr = '-';
      try {
        timeStr = new Date(candle.time * 1000).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US', {
          month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
        });
      } catch (e) {}

      setLegend({
        time: isLatest ? t.nowLabel : timeStr,
        open: candle.open.toFixed(chartPrecision),
        high: candle.high.toFixed(chartPrecision),
        low: candle.low.toFixed(chartPrecision),
        close: candle.close.toFixed(chartPrecision),
        change: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
        range: `${range.toFixed(2)}%`,
        isUp: candle.close >= candle.open
      });
    };

    // 5. Fetch historical Klines via unblocked Bybit adapter
    const loadHistory = async () => {
      try {
        const symbolUpper = activeSymbol.toUpperCase();
        const url = `${API_URL}/api/market/klines?symbol=${symbolUpper}&marketType=${marketType}&interval=${activeInterval}&limit=1000`;
        const res = await fetch(url);
        if (isCancelled) return;
        if (!res.ok) throw new Error('REST load failed');

        const klines = await res.json();
        if (isCancelled) return;

        if (klines.length > 0) {
          const samplePrice = String(klines[0][4] || ''); // Close price string
          const dotIdx = samplePrice.indexOf('.');
          if (dotIdx !== -1) {
            chartPrecision = Math.min(20, Math.max(2, samplePrice.length - dotIdx - 1));
          }
        }

        const formatOptions = {
          priceFormat: {
            type: 'price',
            precision: chartPrecision,
            minMove: 1 / Math.pow(10, chartPrecision),
          }
        };
        candleSeries.applyOptions(formatOptions);
        ma7Series.applyOptions(formatOptions);
        ma25Series.applyOptions(formatOptions);
        ma99Series.applyOptions(formatOptions);
        
        const candleData = [];
        const volumeData = [];

        klines.forEach(k => {
          const time = Math.floor(k[0] / 1000); // Unix timestamp in seconds
          const open = parseFloat(k[1]);
          const high = parseFloat(k[2]);
          const low = parseFloat(k[3]);
          const close = parseFloat(k[4]);
          const volume = parseFloat(k[5]);

          candleData.push({ time, open, high, low, close });
          volumeData.push({ 
            time, 
            value: volume, 
            color: close >= open ? 'rgba(14, 203, 129, 0.15)' : 'rgba(246, 70, 93, 0.15)'
          });
        });

        candleDataRef.current = candleData;

        candleSeries.setData(candleData);
        volumeSeries.setData(volumeData);

        // Load MAs
        ma7Series.setData(calculateMA(candleData, 7));
        ma25Series.setData(calculateMA(candleData, 25));
        ma99Series.setData(calculateMA(candleData, 99));

        // Initial legend setup
        if (candleData.length > 0) {
          updateLegend(candleData[candleData.length - 1], true);
        }

        chart.timeScale().fitContent();
      } catch (err) {
        if (!isCancelled) {
          console.error('Error loading candlestick historical data:', err.message);
        }
      }
    };

    loadHistory();

    // 6. Connect real-time WebSocket dynamic feeds
    const handleWsMessage = (event) => {
      try {
        if (isCancelled) return;
        const msg = JSON.parse(event.data);
        if (msg.type === 'BYBIT_RELAY' && msg.marketType === marketType && msg.stream.includes('@kline_')) {
          const streamSymbol = msg.stream.split('@')[0].toUpperCase();
          if (streamSymbol !== activeSymbol.toUpperCase()) return;

          const kline = msg.data.k;
          if (!kline || isCancelled) return;

          const time = Math.floor(kline.t / 1000);
          const open = parseFloat(kline.o);
          const high = parseFloat(kline.h);
          const low = parseFloat(kline.l);
          const close = parseFloat(kline.c);
          const volume = parseFloat(kline.v);

          const updatedCandle = { time, open, high, low, close };

          // Update main series
          candleSeries.update(updatedCandle);
          volumeSeries.update({
            time,
            value: volume,
            color: close >= open ? 'rgba(14, 203, 129, 0.15)' : 'rgba(246, 70, 93, 0.15)'
          });

          // Sync local ref for MA recalculation
          const lastIndex = candleDataRef.current.length - 1;
          if (lastIndex >= 0 && candleDataRef.current[lastIndex].time === time) {
            candleDataRef.current[lastIndex] = updatedCandle;
          } else if (lastIndex >= 0 && time > candleDataRef.current[lastIndex].time) {
            candleDataRef.current.push(updatedCandle);
          }

          // Real-time recalculation of Moving Averages
          const triggerMAUpdate = (period, maSeries) => {
            const data = candleDataRef.current;
            if (data.length >= period) {
              let sum = 0;
              for (let i = 0; i < period; i++) {
                sum += data[data.length - 1 - i].close;
              }
              if (!isCancelled) {
                maSeries.update({ time, value: sum / period });
              }
            }
          };

          triggerMAUpdate(7, ma7Series);
          triggerMAUpdate(25, ma25Series);
          triggerMAUpdate(99, ma99Series);

          // Update HUD Legend
          updateLegend(updatedCandle, true);

          // Trigger tick to parent components
          if (onPriceTick) {
            onPriceTick(close);
          }
        }
      } catch (error) {
        // Suppress json errors
      }
    };

    if (socket) {
      socket.addEventListener('message', handleWsMessage);
    }

    // 7. Dynamic Crosshair HUD Interactivity
    chart.subscribeCrosshairMove(param => {
      if (isCancelled) return;
      if (!param || !param.time || param.point === undefined || param.point.x < 0 || param.point.y < 0) {
        // Hover out: fallback to latest candle
        if (candleDataRef.current.length > 0) {
          updateLegend(candleDataRef.current[candleDataRef.current.length - 1], true);
        }
        return;
      }

      const candle = param.seriesData.get(candleSeries);
      if (candle) {
        updateLegend(candle, false);
      }
    });

    // 8. Responsive Observer
    const handleResize = () => {
      if (isCancelled) return;
      if (chartRef.current && containerRef.current) {
        chartRef.current.resize(containerRef.current.clientWidth, 330);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    return () => {
      isCancelled = true;
      resizeObserver.disconnect();
      if (socket) {
        socket.removeEventListener('message', handleWsMessage);
      }
      chart.remove();
    };
  }, [activeSymbol, marketType, activeInterval, socket, activeTab, lang]);

  return (
    <section className="trading-panel" style={{ gridColumn: '2', gridRow: '1', display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. Glassmorphic Tabs Navigator (Chart | Info | Trading Data) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 8px',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: '#1e2329',
        height: '42px',
        userSelect: 'none'
      }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button 
            onClick={() => setActiveTab('chart')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'chart' ? '3px solid var(--primary-gold)' : '3px solid transparent',
              color: activeTab === 'chart' ? 'var(--text-active)' : 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: 600,
              padding: '8px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <Activity size={14} style={{ color: activeTab === 'chart' ? 'var(--primary-gold)' : 'inherit' }} />
            {t.chartTab}
          </button>

          <button 
            onClick={() => setActiveTab('info')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'info' ? '3px solid var(--primary-gold)' : '3px solid transparent',
              color: activeTab === 'info' ? 'var(--text-active)' : 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: 600,
              padding: '8px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <Info size={14} style={{ color: activeTab === 'info' ? 'var(--primary-gold)' : 'inherit' }} />
            {t.infoTab}
          </button>

          <button 
            onClick={() => setActiveTab('data')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'data' ? '3px solid var(--primary-gold)' : '3px solid transparent',
              color: activeTab === 'data' ? 'var(--text-active)' : 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: 600,
              padding: '8px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <BarChart2 size={14} style={{ color: activeTab === 'data' ? 'var(--primary-gold)' : 'inherit' }} />
            {t.dataTab}
          </button>
        </div>

        {/* Action tags */}
        <div style={{ color: 'var(--text-muted)', fontSize: '10.5px', paddingRight: '8px' }}>
          {t.dataEngineLabel}
        </div>
      </div>

      {/* 2. TAB VIEWPORTS */}
      
      {/* VIEWPORT A: CANDLESTICK CHART */}
      {activeTab === 'chart' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, backgroundColor: '#161a1e' }}>
          
          {/* Sub Toolbar with Intervals & MA Toggles */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 12px',
            backgroundColor: '#161a1e',
            borderBottom: '1px solid rgba(255,255,255,0.02)',
            fontSize: '11px'
          }}>
            {/* Interval buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '2px' }}>
                {['1m', '5m', '15m', '1h', '1d'].map(interval => (
                  <button
                    key={interval}
                    onClick={() => setActiveInterval(interval)}
                    style={{
                      background: activeInterval === interval ? 'rgba(240,185,11,0.1)' : 'transparent',
                      border: 'none',
                      borderRadius: '2px',
                      padding: '2px 8px',
                      color: activeInterval === interval ? 'var(--primary-gold)' : 'var(--text-muted)',
                      fontSize: '10px',
                      fontWeight: activeInterval === interval ? '600' : '400',
                      cursor: 'pointer'
                    }}
                  >
                    {interval}
                  </button>
                ))}
              </div>

              {/* Technical Indicator Indicators selectors */}
              <div style={{ display: 'flex', gap: '8px', borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: '12px' }}>
                <button 
                  onClick={() => setShowMA7(!showMA7)}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px',
                    color: showMA7 ? '#f0b90b' : 'var(--text-muted)', fontSize: '9.5px', fontWeight: 'bold'
                  }}
                >
                  {showMA7 ? <Eye size={10} /> : <EyeOff size={10} />}
                  MA(7)
                </button>
                <button 
                  onClick={() => setShowMA25(!showMA25)}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px',
                    color: showMA25 ? '#ec4899' : 'var(--text-muted)', fontSize: '9.5px', fontWeight: 'bold'
                  }}
                >
                  {showMA25 ? <Eye size={10} /> : <EyeOff size={10} />}
                  MA(25)
                </button>
                <button 
                  onClick={() => setShowMA99(!showMA99)}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px',
                    color: showMA99 ? '#a855f7' : 'var(--text-muted)', fontSize: '9.5px', fontWeight: 'bold'
                  }}
                >
                  {showMA99 ? <Eye size={10} /> : <EyeOff size={10} />}
                  MA(99)
                </button>
              </div>
            </div>
            
            <div style={{ color: 'var(--text-muted)', fontSize: '9.5px' }}>
              {t.liveStreamLabel}
            </div>
          </div>

          {/* Premium Dynamic Legend HUD */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '4px 12px',
            backgroundColor: '#161a1e',
            borderBottom: '1px solid rgba(255,255,255,0.01)',
            fontSize: '10.5px',
            color: 'var(--text-muted)'
          }}>
            <span>{t.timeLabel} <b style={{ color: '#fff' }}>{legend.time}</b></span>
            <span>O: <b style={{ color: legend.isUp ? 'var(--green-bybit)' : 'var(--red-bybit)' }}>{legend.open}</b></span>
            <span>H: <b style={{ color: 'var(--green-bybit)' }}>{legend.high}</b></span>
            <span>L: <b style={{ color: 'var(--red-bybit)' }}>{legend.low}</b></span>
            <span>C: <b style={{ color: legend.isUp ? 'var(--green-bybit)' : 'var(--red-bybit)' }}>{legend.close}</b></span>
            <span>{t.changeLabel} <b style={{ color: legend.isUp ? 'var(--green-bybit)' : 'var(--red-bybit)' }}>{legend.change}</b></span>
            <span>{t.rangeLabel} <b style={{ color: '#fff' }}>{legend.range}</b></span>
          </div>

          {/* Canvas container */}
          <div 
            ref={containerRef} 
            style={{ 
              flex: '1', 
              width: '100%', 
              backgroundColor: '#161a1e',
              position: 'relative',
              minHeight: '300px'
            }} 
          />
        </div>
      )}

      {/* VIEWPORT B: TOKEN INFO */}
      {activeTab === 'info' && (
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, backgroundColor: '#161a1e', color: 'var(--text-active)' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: 'var(--primary-gold)' }}>{t.assetInfoTitle} {activeSymbol.toUpperCase()}</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6', margin: '0 0 20px 0' }}>
            {t.assetDesc}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.mechanismLabel}</div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '4px', color: 'var(--primary-gold)' }}>
                {marketType === 'futures' ? 'USDT-M Perpetual Futures' : 'Spot Market Trading'}
              </div>
            </div>

            <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.feesLabel}</div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '4px' }}>Maker: 0.02% | Taker: 0.04%</div>
            </div>

            <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.liquidityLabel}</div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '4px', color: 'var(--green-bybit)' }}>Bybit Order Book Tier-1</div>
            </div>

            <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.statusLabel}</div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '4px', color: 'var(--green-bybit)' }}>{t.statusValue}</div>
            </div>
          </div>
        </div>
      )}

      {/* VIEWPORT C: TRADING DATA (Fund Flow Analysis Dashboard) */}
      {activeTab === 'data' && (
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, backgroundColor: '#161a1e', color: 'var(--text-active)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--primary-gold)' }}>{t.fundFlowTitle} ({activeSymbol.toUpperCase()})</h3>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px', alignItems: 'center' }}>
            {/* Pie donut chart */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: 'conic-gradient(var(--green-bybit) 0% 51.38%, var(--red-bybit) 51.38% 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(0,0,0,0.4)'
              }}>
                <div style={{
                  width: '74px',
                  height: '74px',
                  borderRadius: '50%',
                  backgroundColor: '#161a1e',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  color: 'var(--text-muted)'
                }}>
                  <span>{t.netBuy}</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--green-bybit)', fontSize: '13px' }}>51.38%</span>
                </div>
              </div>

              {/* Pie Labels Legend */}
              <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--green-bybit)' }}></div>
                  <span style={{ color: 'var(--text-muted)' }}>Big Buy:</span>
                  <span style={{ fontWeight: 'bold' }}>26.37%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'rgba(14,203,129,0.7)' }}></div>
                  <span style={{ color: 'var(--text-muted)' }}>Med Buy:</span>
                  <span style={{ fontWeight: 'bold' }}>14.98%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'rgba(14,203,129,0.4)' }}></div>
                  <span style={{ color: 'var(--text-muted)' }}>Small Buy:</span>
                  <span style={{ fontWeight: 'bold' }}>10.03%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '4px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--red-bybit)' }}></div>
                  <span style={{ color: 'var(--text-muted)' }}>Big Sell:</span>
                  <span style={{ fontWeight: 'bold' }}>25.54%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'rgba(246,70,93,0.7)' }}></div>
                  <span style={{ color: 'var(--text-muted)' }}>Med Sell:</span>
                  <span style={{ fontWeight: 'bold' }}>13.23%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'rgba(246,70,93,0.4)' }}></div>
                  <span style={{ color: 'var(--text-muted)' }}>Small Sell:</span>
                  <span style={{ fontWeight: 'bold' }}>9.85%</span>
                </div>
              </div>
            </div>

            {/* Inflow flow bar display */}
            <div style={{ flex: 1, minWidth: '220px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                <span>{t.netInflow24h}</span>
                <span style={{ color: 'var(--green-bybit)', fontWeight: 'bold' }}>+64.43K USDT</span>
              </div>
              
              <div style={{ height: '6px', backgroundColor: 'var(--red-bybit)', borderRadius: '3px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '51.38%', backgroundColor: 'var(--green-bybit)' }}></div>
              </div>

              {/* Multi day metrics */}
              <h4 style={{ margin: '16px 0 8px 0', fontSize: '12px', color: 'var(--primary-gold)' }}>{t.trendTitle}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
                {[
                  { day: `${t.dayPrefix}1`, flow: '-413.73K', isPos: false },
                  { day: `${t.dayPrefix}2`, flow: '-225.29K', isPos: false },
                  { day: `${t.dayPrefix}3`, flow: '-1.33M', isPos: false },
                  { day: `${t.dayPrefix}4`, flow: '+125.40K', isPos: true },
                  { day: `${t.dayPrefix}5`, flow: '+64.43K', isPos: true },
                ].map((d, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '40px', color: 'var(--text-muted)' }}>{d.day}</span>
                    <div style={{ flex: 1, height: '4px', backgroundColor: 'rgba(255,255,255,0.03)', position: 'relative', borderRadius: '2px' }}>
                      <div style={{
                        position: 'absolute',
                        left: d.isPos ? '50%' : 'auto',
                        right: d.isPos ? 'auto' : '50%',
                        width: d.isPos ? '20%' : '35%',
                        height: '100%',
                        backgroundColor: d.isPos ? 'var(--green-bybit)' : 'var(--red-bybit)',
                        borderRadius: '2px'
                      }}></div>
                    </div>
                    <span style={{ width: '60px', textAlign: 'right', fontWeight: 'bold', color: d.isPos ? 'var(--green-bybit)' : 'var(--red-bybit)' }}>{d.flow}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}
