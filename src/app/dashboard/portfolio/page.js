'use client';

import React, { useState, useEffect } from 'react';
import styles from '@/styles/governance.module.css';
import PositionSizingWizard from '@/components/PositionSizingWizard';
import ExplainableSignalUI from '@/components/ExplainableSignalUI';

export default function PortfolioPage() {
  const [range, setRange] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newCoin, setNewCoin] = useState('');

  useEffect(() => {
    fetchData();
  }, [range]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/member/analytics?range=${range}`);
      const result = await res.json();
      if (result.success) {
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch portfolio data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCoin = async (e) => {
    e.preventDefault();
    if (!newCoin) return;
    try {
      const res = await fetch('/api/member/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'WATCHLIST_ADD', symbol: newCoin })
      });
      const result = await res.json();
      if (result.success) {
        setNewCoin('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveCoin = async (symbol) => {
    try {
      const res = await fetch('/api/member/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'WATCHLIST_REMOVE', symbol })
      });
      const result = await res.json();
      if (result.success) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: 'var(--text-secondary)' }}>
        <span>⚡ Loading Portfolio Experience Engine...</span>
      </div>
    );
  }

  const { portfolio, metrics, watchlist, achievements, coachingTips } = data;

  return (
    <main className={styles.container}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
            💼 Member Experience Hub
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
            Premium Quantitative Portfolio & Diagnostics Console
          </p>
        </div>
        <div>
          <select 
            value={range} 
            onChange={(e) => setRange(e.target.value)}
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </header>

      {/* 1. Portfolio Telemetry Widgets */}
      <section className={styles.grid}>
        <div className={styles.governanceCard} style={{ background: 'rgba(20, 20, 25, 0.4)' }}>
          <h3><span style={{ color: 'var(--accent-primary)' }}>💰</span> Capital Allocation</h3>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Total Equity (USDT):</span>
            <span className={styles.metricVal}>${portfolio.currentCapital.toLocaleString()}</span>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Active Allocated Risk:</span>
            <span className={styles.metricVal} style={{ color: 'rgb(245, 158, 11)' }}>
              {portfolio.allocatedRisk.toFixed(2)}%
            </span>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Exposure Index:</span>
            <span className={styles.badge} style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'rgb(16, 185, 129)', border: '1px solid rgb(16, 185, 129)' }}>
              LOW EXPOSURE
            </span>
          </div>
        </div>

        <div className={styles.governanceCard} style={{ background: 'rgba(20, 20, 25, 0.4)' }}>
          <h3><span style={{ color: 'rgb(167, 139, 250)' }}>📈</span> Trading Performance</h3>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Win Rate:</span>
            <span className={styles.metricVal}>{metrics.winRate.toFixed(1)}%</span>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Profit Factor:</span>
            <span className={styles.metricVal} style={{ color: metrics.profitFactor >= 1 ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)' }}>
              {metrics.profitFactor.toFixed(2)}
            </span>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Expectancy Factor:</span>
            <span className={styles.metricVal}>{metrics.expectancy.toFixed(2)} R</span>
          </div>
        </div>

        <div className={styles.governanceCard} style={{ background: 'rgba(20, 20, 25, 0.4)' }}>
          <h3><span style={{ color: 'rgb(239, 68, 68)' }}>🛡️</span> Risk Drawdown</h3>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Max Drawdown (Period):</span>
            <span className={styles.metricVal} style={{ color: 'rgb(239, 68, 68)' }}>-{metrics.maxDrawdown}%</span>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Average Risk-Reward (RR):</span>
            <span className={styles.metricVal}>{metrics.avgRR.toFixed(1)}:1</span>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Active Group Correlation:</span>
            <span className={styles.badge} style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'rgb(16, 185, 129)', border: '1px solid rgb(16, 185, 129)' }}>
              LOW CORRELATION
            </span>
          </div>
        </div>
      </section>

      {/* 2. Interactive Sizing & Explanations */}
      <section className={styles.grid}>
        <PositionSizingWizard initialBalance={portfolio.currentCapital} />
        <ExplainableSignalUI />
      </section>

      {/* 3. Watchlist & Gamification Badge System */}
      <section className={styles.grid}>
        {/* Watchlist card */}
        <div className={styles.governanceCard} style={{ background: 'rgba(20, 20, 25, 0.4)' }}>
          <h3>🔍 Asset Watchlist</h3>
          <form onSubmit={handleAddCoin} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input 
              type="text" 
              placeholder="e.g. BTCUSDT" 
              value={newCoin}
              onChange={(e) => setNewCoin(e.target.value.toUpperCase())}
              style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '6px 12px', borderRadius: '4px', fontSize: '0.85rem' }}
            />
            <button type="submit" className={styles.actionBtn} style={{ background: 'var(--accent-primary-glow)', border: '1px solid var(--accent-primary)', color: '#fff' }}>
              Add
            </button>
          </form>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {watchlist.length > 0 ? (
              watchlist.map((coin, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem', border: '1px solid var(--border-color)' }}>
                  <span>{coin}</span>
                  <button onClick={() => handleRemoveCoin(coin)} style={{ background: 'none', border: 'none', color: 'rgb(239, 68, 68)', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
                </div>
              ))
            ) : (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No coins in watchlist. Add one above!</span>
            )}
          </div>
        </div>

        {/* AI Coaching & Achievements card */}
        <div className={styles.governanceCard} style={{ background: 'rgba(20, 20, 25, 0.4)' }}>
          <h3>🏆 Discipline Achievements</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '10px', borderRadius: '6px' }}>
              <span style={{ fontSize: '1.5rem' }}>🎯</span>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)' }}>Risk Disciplined Ninja</h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>All trades mapped strictly within the 1% risk budget.</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(167, 139, 250, 0.05)', border: '1px solid rgba(167, 139, 250, 0.2)', padding: '10px', borderRadius: '6px' }}>
              <span style={{ fontSize: '1.5rem' }}>🔥</span>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)' }}>Consecutive Winner Badge</h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Completed a consecutive series of 5 winning trades.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. AI Automated Coaching Center */}
      <section className={styles.governanceCard} style={{ background: 'rgba(20, 20, 25, 0.4)' }}>
        <h3>🤖 Intelligent Trading Coach</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
          {coachingTips.map((tip, idx) => {
            const isCritical = tip.type === 'CRITICAL';
            const icon = isCritical ? '🚨' : '💡';
            const borderColor = isCritical ? 'rgb(239, 68, 68)' : 'var(--accent-primary)';
            
            return (
              <div key={idx} style={{ display: 'flex', gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', borderLeft: `4px solid ${borderColor}` }}>
                <span style={{ fontSize: '1.5rem' }}>{icon}</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{tip.title}</h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{tip.message}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
