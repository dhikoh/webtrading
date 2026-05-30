import React, { useState, useEffect } from 'react';
import styles from '@/styles/governance.module.css';

export default function PositionSizingWizard({ initialBalance = 10000 }) {
  const [balance, setBalance] = useState(initialBalance);
  const [riskPct, setRiskPct] = useState(1);
  const [entry, setEntry] = useState(100);
  const [stopLoss, setStopLoss] = useState(95);
  const [leverage, setLeverage] = useState(10);

  const [outputs, setOutputs] = useState({
    positionSize: 0,
    marginNeeded: 0,
    liquidationPrice: 0,
    riskReward: 0,
    potentialLoss: 0
  });

  useEffect(() => {
    // Computes Position Size: (Balance * (RiskPct / 100)) / |Entry - StopLoss| * Entry
    const riskAmount = balance * (riskPct / 100);
    const priceDiff = Math.abs(entry - stopLoss);
    
    if (priceDiff > 0 && entry > 0) {
      // position size in asset units
      const units = riskAmount / priceDiff;
      const positionValue = units * entry;
      const margin = positionValue / leverage;
      
      // Potential loss
      const loss = units * priceDiff;

      // Risk-Reward mapping (assuming TP is 2x standard stop loss target range)
      const targetTP = entry + (entry > stopLoss ? priceDiff * 2 : -priceDiff * 2);
      const rr = 2.0;

      // Liquidation price (Simulated for Futures cross/isolated)
      const direction = entry > stopLoss ? 1 : -1;
      const liqPrice = entry - (direction * (entry / leverage) * 0.9); // 90% maintenance limit

      setOutputs({
        positionSize: parseFloat(positionValue.toFixed(2)),
        marginNeeded: parseFloat(margin.toFixed(2)),
        liquidationPrice: parseFloat(Math.max(0, liqPrice).toFixed(4)),
        riskReward: rr,
        potentialLoss: parseFloat(loss.toFixed(2))
      });
    }
  }, [balance, riskPct, entry, stopLoss, leverage]);

  return (
    <div className={styles.governanceCard} style={{ background: 'rgba(20, 20, 25, 0.65)', border: '1px solid var(--border-color)', backdropFilter: 'blur(10px)' }}>
      <h3>
        <span style={{ color: 'var(--accent-primary)' }}>⚡</span> Futures Position Sizing Wizard
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Account Balance ($)</label>
            <input 
              type="number" 
              value={balance} 
              onChange={(e) => setBalance(Number(e.target.value))}
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '4px', marginTop: '4px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Risk Percentage (%)</label>
            <input 
              type="number" 
              step="0.1" 
              value={riskPct} 
              onChange={(e) => setRiskPct(Number(e.target.value))}
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '4px', marginTop: '4px' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Entry Price</label>
            <input 
              type="number" 
              value={entry} 
              onChange={(e) => setEntry(Number(e.target.value))}
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '4px', marginTop: '4px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Stop Loss</label>
            <input 
              type="number" 
              value={stopLoss} 
              onChange={(e) => setStopLoss(Number(e.target.value))}
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '4px', marginTop: '4px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Leverage (x)</label>
            <input 
              type="number" 
              value={leverage} 
              onChange={(e) => setLeverage(Number(e.target.value))}
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '4px', marginTop: '4px' }}
            />
          </div>
        </div>

        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', borderLeft: '3px solid var(--accent-primary)', marginTop: '8px' }}>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '12px', color: 'var(--text-primary)' }}>📊 Sizing Summary Results</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Max Position Size:</span>
              <span className={styles.metricVal} style={{ color: 'var(--accent-primary)' }}>${outputs.positionSize}</span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Margin Required:</span>
              <span className={styles.metricVal}>${outputs.marginNeeded}</span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Est. Liquidation Price:</span>
              <span className={styles.metricVal} style={{ color: 'rgb(239, 68, 68)' }}>${outputs.liquidationPrice}</span>
            </div>
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Potential Loss (Risk):</span>
              <span className={styles.metricVal} style={{ color: 'rgb(245, 158, 11)' }}>${outputs.potentialLoss} (${riskPct}%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
