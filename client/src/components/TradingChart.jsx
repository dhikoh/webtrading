import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
import { Activity, Minimize2, Maximize2 } from 'lucide-react';
import { API_URL } from '../config.js';

export default function TradingChart({ activeSymbol, marketType, onPriceTick }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const wsRef = useRef(null);
  const [activeInterval, setActiveInterval] = useState('1m');

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Initialize Lightweight Chart Engine
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 350,
      layout: {
        background: { color: '#161a1e' },
        textColor: '#848e9c',
        fontSize: 11,
        fontFamily: 'Inter, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(43, 49, 57, 0.2)' },
        horzLines: { color: 'rgba(43, 49, 57, 0.2)' },
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
      color: 'rgba(14, 203, 129, 0.2)',
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

    // 4. Fetch historical Klines via backend proxy to bypass local ISP censorship
    const loadHistory = async () => {
      try {
        const symbolUpper = activeSymbol.toUpperCase();
        const url = `${API_URL}/api/market/klines?symbol=${symbolUpper}&marketType=${marketType}&interval=${activeInterval}&limit=300`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('REST load failed');

        const klines = await res.json();
        
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
            color: close >= open ? 'rgba(14, 203, 129, 0.2)' : 'rgba(246, 70, 93, 0.2)'
          });
        });

        candleSeries.setData(candleData);
        volumeSeries.setData(volumeData);
        chart.timeScale().fitContent();
      } catch (err) {
        console.error('Error loading candlestick historical data:', err.message);
      }
    };

    loadHistory();

    // 5. Connect real-time WebSocket dynamic feeds via unblocked Binance mirror servers (.cc)
    const wsUrl = marketType === 'spot'
      ? `wss://stream.binance.cc:9443/ws/${activeSymbol.toLowerCase()}@kline_${activeInterval}`
      : `wss://fstream.binance.cc/ws/${activeSymbol.toLowerCase()}@kline_${activeInterval}`;

    console.log(`Connecting live charting WS: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const kline = data.k;
        if (!kline) return;

        const time = Math.floor(kline.t / 1000);
        const open = parseFloat(kline.o);
        const high = parseFloat(kline.h);
        const low = parseFloat(kline.l);
        const close = parseFloat(kline.c);
        const volume = parseFloat(kline.v);

        // Update candle series
        candleSeries.update({ time, open, high, low, close });
        
        // Update volume series
        volumeSeries.update({
          time,
          value: volume,
          color: close >= open ? 'rgba(14, 203, 129, 0.2)' : 'rgba(246, 70, 93, 0.2)'
        });

        // Trigger callback to parents header index/latest tick values
        if (onPriceTick) {
          onPriceTick(close);
        }
      } catch (error) {
        // quiet error
      }
    };

    // 6. Responsive ResizeObserver
    const handleResize = () => {
      if (chartRef.current && containerRef.current) {
        chartRef.current.resize(containerRef.current.clientWidth, 350);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (wsRef.current) {
        wsRef.current.close();
      }
      chart.remove();
    };
  }, [activeSymbol, marketType, activeInterval]);

  return (
    <section className="trading-panel" style={{ gridColumn: '2', gridRow: '1', display: 'flex', flexDirection: 'column' }}>
      
      {/* Interval Toolbar Selector */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '6px 12px', 
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: '#161a1e',
        userSelect: 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={14} style={{ color: 'var(--primary-gold)' }} />
          <span style={{ fontSize: '11px', fontWeight: 600 }}>Interactive Charting</span>
          
          <div style={{ display: 'flex', gap: '2px', marginLeft: '12px', borderLeft: '1px solid var(--border-color)', paddingLeft: '12px' }}>
            {['1m', '5m', '15m', '1h', '1d'].map(interval => (
              <button
                key={interval}
                style={{
                  background: activeInterval === interval ? 'var(--bg-input)' : 'transparent',
                  border: 'none',
                  borderRadius: '2px',
                  padding: '2px 8px',
                  color: activeInterval === interval ? 'var(--primary-gold)' : 'var(--text-muted)',
                  fontSize: '10px',
                  fontWeight: activeInterval === interval ? '600' : '400',
                  cursor: 'pointer'
                }}
                onClick={() => setActiveInterval(interval)}
              >
                {interval}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '10.5px' }}>
          <span>TradingView Tech</span>
        </div>
      </div>

      {/* Embedded Chart Canvas */}
      <div 
        ref={containerRef} 
        style={{ 
          flex: '1', 
          width: '100%', 
          height: '100%', 
          backgroundColor: '#161a1e',
          position: 'relative'
        }} 
      />

    </section>
  );
}
