import React from 'react';
import styles from '@/styles/governance.module.css';

export default function ExplainableSignalUI({ factors = [] }) {
  // Default fallback confluences if none passed
  const displayFactors = factors.length > 0 ? factors : [
    { name: 'Base Setup Score', value: 50, type: 'positive' },
    { name: 'EMA Trend Alignment', value: 15, type: 'positive' },
    { name: 'RVOL Breakout Volume', value: 10, type: 'positive' },
    { name: 'Fibonacci Golden Pocket Match', value: 8, type: 'positive' },
    { name: 'Correlation Group Exposure Cap', value: -5, type: 'negative' },
    { name: 'Slippage Variance Adjustment', value: -3, type: 'negative' }
  ];

  // Calculate dynamic running totals to render a cascading waterfall chart
  let runningTotal = 0;
  const waterfallSteps = displayFactors.map((f) => {
    const start = runningTotal;
    runningTotal += f.value;
    return {
      ...f,
      start,
      end: runningTotal
    };
  });

  const finalScore = runningTotal;

  return (
    <div className={styles.governanceCard} style={{ background: 'rgba(20, 20, 25, 0.65)', border: '1px solid var(--border-color)', backdropFilter: 'blur(10px)' }}>
      <h3>
        <span style={{ color: 'var(--accent-primary)' }}>📊</span> Explainable Signal Waterfall
      </h3>
      
      <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {waterfallSteps.map((step, idx) => {
          const isPositive = step.value >= 0;
          const barColor = isPositive ? 'rgba(16, 185, 129, 0.75)' : 'rgba(239, 68, 68, 0.75)';
          
          return (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 50px', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {step.name}
              </span>
              
              <div style={{ position: 'relative', height: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', overflow: 'hidden' }}>
                <div 
                  style={{
                    position: 'absolute',
                    left: `${Math.max(0, step.start)}%`,
                    width: `${Math.abs(step.value)}%`,
                    height: '100%',
                    background: barColor,
                    borderRadius: '2px',
                    transition: 'all 0.5s ease-in-out'
                  }}
                />
              </div>

              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: isPositive ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)', textAlign: 'right' }}>
                {isPositive ? `+${step.value}` : step.value}
              </span>
            </div>
          );
        })}

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'grid', gridTemplateColumns: '150px 1fr 50px', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Calibrated Confidence</span>
          <div style={{ height: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
            <div 
              style={{
                width: `${finalScore}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--accent-primary-glow), var(--accent-primary))',
                borderRadius: '4px',
                boxShadow: '0 0 10px var(--accent-primary-glow)'
              }}
            />
          </div>
          <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--accent-primary)', textAlign: 'right' }}>
            {finalScore}%
          </span>
        </div>
      </div>
    </div>
  );
}
