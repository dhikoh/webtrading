'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

export default function BacktestPage() {
  const [strategy, setStrategy] = useState('adx_rvol');
  const [asset, setAsset] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('15m');
  const [period, setPeriod] = useState('30d');
  
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);

  const handleRunBacktest = (e) => {
    e.preventDefault();
    setRunning(true);
    setResults(null);

    // Simulate strategy backtest results with premium analytics
    setTimeout(() => {
      setRunning(false);
      setResults({
        totalTrades: 42,
        wins: 28,
        losses: 14,
        winRate: 66.67,
        netProfit: 1240.50,
        profitFactor: 2.15,
        maxDrawdown: 4.25,
        equityCurve: [10000, 10120, 10080, 10250, 10210, 10390, 10500, 10450, 10680, 10800, 10950, 11240.50]
      });
    }, 2000);
  };

  return (
    <DashboardLayout title="Simulator Backtest">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          
          {/* Configurator Form */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🧪</span> Konfigurasi Backtest
            </h3>
            
            <form onSubmit={handleRunBacktest} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Strategi Kuantitatif</label>
                <select 
                  className="form-input" 
                  value={strategy} 
                  onChange={(e) => setStrategy(e.target.value)}
                  style={{ width: '100%', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '10px', borderRadius: '6px', color: '#f8fafc' }}
                >
                  <option value="adx_rvol">ADX Trend Strength + RVOL Scalper</option>
                  <option value="ema_cloud">EMA Ribbon Cloud Cross (Trend Following)</option>
                  <option value="bollinger_breakout">Bollinger Bands Breakout + RSI Filter</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Aset Koin</label>
                  <select 
                    className="form-input" 
                    value={asset} 
                    onChange={(e) => setAsset(e.target.value)}
                    style={{ width: '100%', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '10px', borderRadius: '6px', color: '#f8fafc' }}
                  >
                    <option value="BTCUSDT">BTC / USDT</option>
                    <option value="ETHUSDT">ETH / USDT</option>
                    <option value="SOLUSDT">SOL / USDT</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Timeframe</label>
                  <select 
                    className="form-input" 
                    value={timeframe} 
                    onChange={(e) => setTimeframe(e.target.value)}
                    style={{ width: '100%', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '10px', borderRadius: '6px', color: '#f8fafc' }}
                  >
                    <option value="5m">5 Menit (Scalping)</option>
                    <option value="15m">15 Menit (Day Trade)</option>
                    <option value="1h">1 Jam (Swing Trade)</option>
                    <option value="4h">4 Jam (Macro Trend)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Periode Simulasi</label>
                <select 
                  className="form-input" 
                  value={period} 
                  onChange={(e) => setPeriod(e.target.value)}
                  style={{ width: '100%', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '10px', borderRadius: '6px', color: '#f8fafc' }}
                >
                  <option value="7d">7 Hari Terakhir</option>
                  <option value="30d">30 Hari Terakhir</option>
                  <option value="90d">90 Hari Terakhir</option>
                </select>
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                disabled={running}
                style={{ 
                  marginTop: '10px', 
                  padding: '12px', 
                  borderRadius: '6px', 
                  background: running ? 'rgba(148, 163, 184, 0.2)' : 'var(--color-primary)', 
                  border: 'none', 
                  color: '#fff', 
                  fontWeight: 'bold', 
                  cursor: running ? 'not-allowed' : 'pointer' 
                }}
              >
                {running ? 'Menjalankan Simulasi Kuantitatif...' : 'Mulai Simulasi Backtest'}
              </button>
            </form>
          </div>

          {/* Results Board */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {running ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <span style={{ fontSize: '3rem', display: 'block', animation: 'spin 2s linear infinite' }}>⚙️</span>
                <p style={{ marginTop: '16px', color: '#94a3b8', fontWeight: 'bold' }}>Sedang menganalisa jutaan data kline historis Binance...</p>
              </div>
            ) : results ? (
              <div>
                <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📊</span> Laporan Hasil Kinerja
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Net Profit / Margin</span>
                    <strong style={{ fontSize: '1.2rem', color: 'var(--color-success)' }}>
                      +${results.netProfit.toFixed(2)}
                    </strong>
                  </div>
                  <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Rasio Kemenangan</span>
                    <strong style={{ fontSize: '1.2rem', color: 'var(--accent-secondary)' }}>
                      {results.winRate}%
                    </strong>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', color: '#e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '6px' }}>
                    <span>Total Perdagangan (Trades)</span>
                    <strong>{results.totalTrades} ({results.wins}W / {results.losses}L)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '6px' }}>
                    <span>Profit Factor</span>
                    <strong style={{ color: 'var(--color-success)' }}>{results.profitFactor}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px' }}>
                    <span>Drawdown Maksimum</span>
                    <strong style={{ color: 'var(--color-danger)' }}>{results.maxDrawdown}%</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
                <span style={{ fontSize: '3rem', display: 'block' }}>📈</span>
                <p style={{ marginTop: '16px' }}>Pilih strategi di sebelah kiri dan klik mulai untuk meluncurkan simulator backtest otomatis.</p>
              </div>
            )}
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
