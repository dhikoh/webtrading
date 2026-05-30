'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import styles from '@/styles/dashboard.module.css';

export default function DashboardOverview() {
  const [data, setData] = useState(null);
  const [livePrices, setLivePrices] = useState({
    BTCUSDT: { price: '0.00', change: '0.00' },
    ETHUSDT: { price: '0.00', change: '0.00' },
    SOLUSDT: { price: '0.00', change: '0.00' },
    BNBUSDT: { price: '0.00', change: '0.00' },
    XRPUSDT: { price: '0.00', change: '0.00' }
  });
  const [recentSignals, setRecentSignals] = useState([]);
  const [error, setError] = useState('');

  // Fetch static summaries
  useEffect(() => {
    async function loadSummary() {
      try {
        const res = await fetch('/api/dashboard/summary');
        if (res.ok) {
          const summary = await res.json();
          setData(summary);
        }
      } catch (err) {
        setError('Gagal memuat ringkasan dashboard');
      }
    }
    loadSummary();
  }, []);

  // Poll live tickers from Binance (proxied through our server-side API to bypass country geoblocks)
  useEffect(() => {
    async function fetchTickers() {
      try {
        const res = await fetch('/api/binance/tickers');
        if (res.ok) {
          const prices = await res.json();
          setLivePrices(prev => ({ ...prev, ...prices }));
        }
      } catch (err) {
        console.error("Live ticker poll error:", err);
      }
    }

    fetchTickers();
    const interval = setInterval(fetchTickers, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch recent signals generated
  useEffect(() => {
    async function getSignals() {
      try {
        const res = await fetch('/api/signals/recent');
        if (res.ok) {
          const d = await res.json();
          setRecentSignals(d.signals || []);
          
          // Sound chime synthesized by Web Audio API if a new unread signal exists
          const hasUnread = (d.signals || []).some(s => s.isNew);
          if (hasUnread) {
            triggerChime();
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    getSignals();
    const interval = setInterval(getSignals, 10000);
    return () => clearInterval(interval);
  }, []);

  // Futuristic synth chime using Web Audio API
  const triggerChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.exponentialRampToValueAtTime(987.77, ctx.currentTime + 0.15); // B5
      
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (err) {
      console.warn("AudioContext block by browser autoplay rules.", err);
    }
  };

  return (
    <DashboardLayout title="Ringkasan Performa" user={{ tenantName: data?.tenantName }}>
      {error && <div className={styles.errorAlert}>{error}</div>}

      {/* Summary Grid Cards */}
      <div className={styles.grid}>
        <div className={`${styles.card} glass-panel`}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}>📈</span>
            <span className={styles.cardTitle}>Total Analisis</span>
          </div>
          <div className={styles.cardVal}>{data?.stats?.totalAnalyses ?? 0}</div>
          <div className={styles.cardDesc}>Visual & Binance realtime</div>
        </div>

        <div className={`${styles.card} glass-panel`}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}>🔔</span>
            <span className={styles.cardTitle}>Sinyal Aktif</span>
          </div>
          <div className={styles.cardVal} style={{ color: 'var(--accent-secondary)' }}>
            {data?.stats?.activeSignals ?? 0}
          </div>
          <div className={styles.cardDesc}>Menunggu eksekusi entry</div>
        </div>

        <div className={`${styles.card} glass-panel`}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}>🏆</span>
            <span className={styles.cardTitle}>Rasio Menang (Win Rate)</span>
          </div>
          <div className={styles.cardVal} style={{ color: 'var(--color-success)' }}>
            {data?.stats?.winRate ?? 0}%
          </div>
          <div className={styles.cardDesc}>
            {data?.stats?.wins ?? 0} Menang / {data?.stats?.losses ?? 0} Kalah
          </div>
        </div>

        <div className={`${styles.card} glass-panel`}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}>💰</span>
            <span className={styles.cardTitle}>Ekuitas Modal</span>
          </div>
          <div className={styles.cardVal}>${data?.portfolio?.capital?.toFixed(2) ?? '10,000.00'}</div>
          <div className={styles.marginUsage}>
            <div className={styles.bar}>
              <div 
                className={styles.fill} 
                style={{ width: `${(data?.portfolio?.riskAllocated / (data?.portfolio?.capital || 10000)) * 100}%` }} 
              />
            </div>
            <span className={styles.barLabel}>Resiko Teralokasi: ${data?.portfolio?.riskAllocated ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Main sections */}
      <div className={styles.sectionsContainer}>
        {/* Preset watchlists */}
        <section className={`${styles.watchlistSection} glass-panel`}>
          <h3>Pantauan Real-Time (Binance)</h3>
          <div className={styles.tickerList}>
            {Object.entries(livePrices).map(([symbol, item]) => {
              const isPositive = parseFloat(item.change) >= 0;
              return (
                <div key={symbol} className={styles.tickerItem}>
                  <div className={styles.symbolName}>
                    <span>{symbol.replace('USDT', '')}</span>
                    <span className={styles.quote}>/ USDT</span>
                  </div>
                  <div className={styles.priceContainer}>
                    <span className={styles.livePrice}>${item.price}</span>
                    <span className={`${styles.changePct} ${isPositive ? styles.green : styles.red}`}>
                      {isPositive ? '+' : ''}{item.change}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Recent Alerts Logs */}
        <section className={`${styles.signalsSection} glass-panel`}>
          <h3>Sinyal Terkini</h3>
          <div className={styles.signalsList}>
            {recentSignals.length === 0 ? (
              <div className={styles.emptySignals}>
                Belum ada sinyal terdeteksi. Silakan lakukan pemindaian chart atau aktifkan alarm.
              </div>
            ) : (
              recentSignals.map(sig => (
                <div key={sig.id} className={styles.signalRow}>
                  <div className={styles.signalInfo}>
                    <span className={styles.sigAsset}>{sig.asset}</span>
                    <span className={styles.sigTimeframe}>{sig.timeframe}</span>
                  </div>
                  <div className={styles.signalTag}>
                    <span className={`${styles.badge} ${sig.signal.includes('LONG') ? styles.buy : styles.sell}`}>
                      {sig.signal}
                    </span>
                  </div>
                  <div className={styles.signalStats}>
                    <span>Conf: {sig.confidence}%</span>
                    <span>R:R: {sig.riskReward?.toFixed(1) || '0.0'}</span>
                  </div>
                  <div className={styles.signalDate}>
                    {new Date(sig.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
