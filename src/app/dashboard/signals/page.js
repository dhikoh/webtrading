'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

export default function SignalsPage() {
  const [alarms, setAlarms] = useState([
    { id: 1, asset: 'BTCUSDT', type: 'CROSS_UP', value: 68500, active: true, createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 2, asset: 'ETHUSDT', type: 'CROSS_DOWN', value: 3750, active: true, createdAt: new Date(Date.now() - 7200000).toISOString() },
    { id: 3, asset: 'SOLUSDT', type: 'VOLATILITY_SURGE', value: 5, active: false, createdAt: new Date(Date.now() - 86400000).toISOString() }
  ]);
  
  const [asset, setAsset] = useState('BTCUSDT');
  const [type, setType] = useState('CROSS_UP');
  const [value, setValue] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleAddAlarm = (e) => {
    e.preventDefault();
    if (!value) return;

    const newAlarm = {
      id: Date.now(),
      asset,
      type,
      value: parseFloat(value),
      active: true,
      createdAt: new Date().toISOString()
    };

    setAlarms([newAlarm, ...alarms]);
    setValue('');
    setSuccessMsg('Alarm baru berhasil dibuat dan aktif di pelacakan real-time!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const toggleAlarm = (id) => {
    setAlarms(alarms.map(a => a.id === id ? { ...a, active: !a.active } : a));
  };

  const deleteAlarm = (id) => {
    setAlarms(alarms.filter(a => a.id !== id));
  };

  return (
    <DashboardLayout title="Sinyal & Alarm Real-Time">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {successMsg && (
          <div style={{ 
            background: 'rgba(16, 185, 129, 0.15)', 
            border: '1px solid var(--color-success)', 
            color: 'var(--color-success)',
            padding: '12px 20px', 
            borderRadius: '8px', 
            fontSize: '0.9rem',
            fontWeight: '600'
          }}>
            {successMsg}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          
          {/* Creator Form */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔔</span> Buat Alarm Harga Baru
            </h3>
            
            <form onSubmit={handleAddAlarm} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                  <option value="BNBUSDT">BNB / USDT</option>
                  <option value="XRPUSDT">XRP / USDT</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Kondisi Pemicu</label>
                <select 
                  className="form-input" 
                  value={type} 
                  onChange={(e) => setType(e.target.value)}
                  style={{ width: '100%', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '10px', borderRadius: '6px', color: '#f8fafc' }}
                >
                  <option value="CROSS_UP">Harga Menembus Ke Atas (Cross Up)</option>
                  <option value="CROSS_DOWN">Harga Menembus Ke Bawah (Cross Down)</option>
                  <option value="VOLATILITY_SURGE">Lonjakan Volatilitas % (RVOL Surge)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Nilai Target (Harga / Volatilitas %)</label>
                <input 
                  type="number" 
                  step="any"
                  className="form-input"
                  placeholder={type === 'VOLATILITY_SURGE' ? '5 (%)' : '68500.00'}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  required
                  style={{ width: '100%', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '10px', borderRadius: '6px', color: '#f8fafc' }}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '10px', padding: '12px', borderRadius: '6px', background: 'var(--color-primary)', border: 'none', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
                Aktifkan Alarm
              </button>
            </form>
          </div>

          {/* Active Alarms List */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📡</span> Daftar Alarm Aktif ({alarms.filter(a => a.active).length})
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto' }}>
              {alarms.length === 0 ? (
                <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Belum ada alarm yang dipasang.</div>
              ) : (
                alarms.map(alarm => (
                  <div key={alarm.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    background: 'rgba(30, 41, 59, 0.5)', 
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    opacity: alarm.active ? 1 : 0.6
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ color: '#f8fafc' }}>{alarm.asset}</strong>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          background: alarm.type === 'CROSS_UP' ? 'rgba(16, 185, 129, 0.15)' : alarm.type === 'CROSS_DOWN' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                          color: alarm.type === 'CROSS_UP' ? 'var(--color-success)' : alarm.type === 'CROSS_DOWN' ? 'var(--color-danger)' : 'var(--accent-secondary)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 'bold'
                        }}>
                          {alarm.type.replace('_', ' ')}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                        Target: {alarm.type === 'VOLATILITY_SURGE' ? `${alarm.value}%` : `$${alarm.value.toLocaleString()}`}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button 
                        onClick={() => toggleAlarm(alarm.id)}
                        style={{
                          background: alarm.active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                          color: alarm.active ? 'var(--color-success)' : '#94a3b8',
                          border: 'none',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 'bold'
                        }}
                      >
                        {alarm.active ? 'Aktif' : 'Mati'}
                      </button>
                      <button 
                        onClick={() => deleteAlarm(alarm.id)}
                        style={{ background: 'transparent', border: 'none', fontSize: '1rem', cursor: 'pointer' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
