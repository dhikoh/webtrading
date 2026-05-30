'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import styles from '@/styles/journal.module.css';

export default function JournalPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form fields
  const [asset, setAsset] = useState('BTCUSDT');
  const [type, setType] = useState('BUY_LONG');
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [positionSize, setPositionSize] = useState('');
  const [profitLoss, setProfitLoss] = useState('');
  const [notes, setNotes] = useState('');
  
  // Submit state
  const [submitting, setSubmitting] = useState(false);

  async function fetchLogs() {
    try {
      const res = await fetch('/api/journal');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.journal || []);
      } else {
        setError('Gagal memuat jurnal');
      }
    } catch (err) {
      console.error(err);
      setError('Koneksi terputus');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset,
          type,
          entryPrice,
          exitPrice: exitPrice || undefined,
          positionSize,
          profitLoss: profitLoss || undefined,
          notes
        })
      });

      if (res.ok) {
        // Reset form
        setEntryPrice('');
        setExitPrice('');
        setPositionSize('');
        setProfitLoss('');
        setNotes('');
        fetchLogs();
      } else {
        const d = await res.json();
        setError(d.error || 'Gagal menyimpan catatan jurnal');
      }
    } catch (err) {
      setError('Koneksi terputus');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus jurnal ini? Tindakan ini akan mengembalikan saldo ekuitas Anda.')) return;
    
    try {
      const res = await fetch(`/api/journal/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchLogs();
      } else {
        setError('Gagal menghapus log');
      }
    } catch (err) {
      setError('Koneksi terputus');
    }
  };

  // Performance calculations
  const totalPnL = logs.reduce((sum, item) => sum + (item.profitLoss || 0), 0);
  const winsCount = logs.filter(item => item.outcomeStatus === 'WIN').length;
  const lossesCount = logs.filter(item => item.outcomeStatus === 'LOSS').length;
  const totalClosed = winsCount + lossesCount;
  const winRate = totalClosed > 0 ? (winsCount / totalClosed) * 100 : 0;

  return (
    <DashboardLayout title="Jurnal Transaksi Manual">
      {error && <div className={styles.errorAlert}>{error}</div>}

      {/* Analytics widgets */}
      <div className={styles.summaryBar}>
        <div className={`${styles.widget} glass-panel`}>
          <span>Akumulasi Keuntungan (PnL)</span>
          <strong style={{ color: totalPnL >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
          </strong>
        </div>

        <div className={`${styles.widget} glass-panel`}>
          <span>Rasio Kemenangan</span>
          <strong style={{ color: 'var(--accent-secondary)' }}>
            {Math.round(winRate * 10) / 10}%
          </strong>
        </div>

        <div className={`${styles.widget} glass-panel`}>
          <span>Rasio Menang / Kalah</span>
          <strong>{winsCount}W / {lossesCount}L</strong>
        </div>
      </div>

      <div className={styles.layout}>
        {/* Input Form */}
        <div className={`${styles.formCard} glass-panel`}>
          <h3>Catat Jurnal Transaksi Baru</h3>
          
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Aset Koin</label>
              <select className="form-input" value={asset} onChange={(e) => setAsset(e.target.value)}>
                <option value="BTCUSDT">BTC / USDT</option>
                <option value="ETHUSDT">ETH / USDT</option>
                <option value="SOLUSDT">SOL / USDT</option>
                <option value="BNBUSDT">BNB / USDT</option>
                <option value="XRPUSDT">XRP / USDT</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Tipe Entry</label>
              <select className="form-input" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="BUY_LONG">BUY LONG</option>
                <option value="SELL_SHORT">SELL SHORT</option>
              </select>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Harga Masuk (Entry)</label>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  placeholder="27400.0"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Harga Keluar (Exit) *Opsional</label>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  placeholder="28100.0"
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Ukuran Kontrak (Size)</label>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  value={positionSize}
                  onChange={(e) => setPositionSize(e.target.value)}
                  placeholder="0.05"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>PnL Keluar *Opsional</label>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  value={profitLoss}
                  onChange={(e) => setProfitLoss(e.target.value)}
                  placeholder="Auto-hitung jika kosong"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Catatan Analisis</label>
              <textarea
                rows="3"
                className="form-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Alasan entry, setup emosi, atau confluence chart..."
              />
            </div>

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Simpan Transaksi'}
            </button>
          </form>
        </div>

        {/* Logs Table */}
        <div className={`${styles.tableCard} glass-panel`}>
          <h3>Riwayat Jurnal Transaksi</h3>

          <div className={styles.tableWrapper}>
            {loading ? (
              <div className={styles.tableMessage}>Memuat riwayat transaksi...</div>
            ) : logs.length === 0 ? (
              <div className={styles.tableMessage}>Belum ada transaksi yang terdaftar. Mulai catat perdagangan Anda.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Aset</th>
                    <th>Tipe</th>
                    <th>Harga Entry</th>
                    <th>Harga Exit</th>
                    <th>Ukuran</th>
                    <th>Hasil PnL</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(item => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: '700' }}>{item.asset}</td>
                      <td>
                        <span className={`${styles.cellBadge} ${item.type.includes('LONG') ? styles.long : styles.short}`}>
                          {item.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td>${item.entryPrice.toFixed(2)}</td>
                      <td>{item.exitPrice ? `$${item.exitPrice.toFixed(2)}` : '-'}</td>
                      <td>{item.positionSize}</td>
                      <td style={{ fontWeight: '700', color: item.profitLoss >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {item.profitLoss >= 0 ? '+' : ''}${item.profitLoss.toFixed(2)}
                      </td>
                      <td>
                        <span className={`${styles.statusLabel} ${styles[item.outcomeStatus.toLowerCase()]}`}>
                          {item.outcomeStatus}
                        </span>
                      </td>
                      <td>
                        <button className={styles.deleteBtn} onClick={() => handleDelete(item.id)}>
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
