'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import styles from '@/styles/admin.module.css';

export default function AdminStrategyConsole() {
  const [strategy, setStrategy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  // Form values
  const [minConfidence, setMinConfidence] = useState(60);
  const [minRiskReward, setMinRiskReward] = useState(1.5);
  const [maxDrawdownLmt, setMaxDrawdownLmt] = useState(15.0);

  // Parameters
  const [emaFastPeriod, setEmaFastPeriod] = useState(20);
  const [emaSlowPeriod, setEmaSlowPeriod] = useState(50);
  const [rsiPeriod, setRsiPeriod] = useState(14);
  const [atrPeriod, setAtrPeriod] = useState(14);

  // Feature weights
  const [emaWeight, setEmaWeight] = useState(0.35);
  const [rsiWeight, setRsiWeight] = useState(0.30);
  const [patternWeight, setPatternWeight] = useState(0.35);

  async function loadStrategy() {
    try {
      const res = await fetch('/api/admin/strategy');
      if (res.ok) {
        const data = await res.json();
        const strat = data.strategy;
        if (strat) {
          setStrategy(strat);
          setMinConfidence(strat.minConfidence);
          setMinRiskReward(strat.minRiskReward);
          setMaxDrawdownLmt(strat.maxDrawdownLmt);

          // Map params
          strat.parameters.forEach(p => {
            if (p.paramKey === 'emaFastPeriod') setEmaFastPeriod(parseInt(p.paramValue));
            if (p.paramKey === 'emaSlowPeriod') setEmaSlowPeriod(parseInt(p.paramValue));
            if (p.paramKey === 'rsiPeriod') setRsiPeriod(parseInt(p.paramValue));
            if (p.paramKey === 'atrPeriod') setAtrPeriod(parseInt(p.paramValue));
          });

          // Map weights
          strat.weights.forEach(w => {
            if (w.featureName === 'EMA_ALIGNMENT') setEmaWeight(w.weightValue);
            if (w.featureName === 'RSI_EXHAUSTION') setRsiWeight(w.weightValue);
            if (w.featureName === 'CANDLESTICK_CONFLUENCE') setPatternWeight(w.weightValue);
          });
        }
      } else {
        setError('Gagal memuat parameter strategi');
      }
    } catch (err) {
      setError('Terjadi kesalahan koneksi');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStrategy();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    // Weight integrity check
    const sum = parseFloat(emaWeight) + parseFloat(rsiWeight) + parseFloat(patternWeight);
    if (Math.abs(sum - 1.0) > 0.01) {
      setError(`Kesalahan Kalibrasi: Jumlah total bobot parameter (Feature Weights) harus berjumlah 1.0 (Sekarang: ${sum.toFixed(2)})`);
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minConfidence,
          minRiskReward,
          maxDrawdownLmt,
          parameters: {
            emaFastPeriod,
            emaSlowPeriod,
            rsiPeriod,
            atrPeriod
          },
          weights: {
            EMA_ALIGNMENT: emaWeight,
            RSI_EXHAUSTION: rsiWeight,
            CANDLESTICK_CONFLUENCE: patternWeight
          }
        })
      });

      if (res.ok) {
        setSuccess('Kalibrasi strategi berhasil diperbarui! Versi baru telah ditambahkan ke database.');
        loadStrategy();
      } else {
        const data = await res.json();
        setError(data.error || 'Gagal menyimpan strategi');
      }
    } catch (err) {
      setError('Terjadi kesalahan koneksi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title="Setelan & Kalibrasi Strategi">
      {error && <div className={styles.errorBox}>{error}</div>}
      {success && <div className={styles.successBox}>{success}</div>}

      {loading ? (
        <div className={styles.loadingCard}>Sedang memuat data kalibrasi...</div>
      ) : (
        <div className={styles.splitLayout}>
          {/* Editor Form */}
          <form onSubmit={handleSave} className={`${styles.formCard} glass-panel`}>
            <h3>Kalibrasi Parameter & Bobot Kontrol</h3>

            <div className={styles.sectionHeader}>
              <span>1</span> Aturan Umum Batasan Sinyal
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Ambang Sinyal Min (Confidence %)</label>
                <input
                  type="number"
                  className="form-input"
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(parseInt(e.target.value))}
                  min="30"
                  max="95"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Min Risk-to-Reward Ratio (R:R)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={minRiskReward}
                  onChange={(e) => setMinRiskReward(parseFloat(e.target.value))}
                  min="1.0"
                  max="5.0"
                  required
                />
              </div>
            </div>

            <div className={styles.sectionHeader} style={{ marginTop: '24px' }}>
              <span>2</span> Periode Indikator Matematika
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>EMA Cepat (Fast Period)</label>
                <input
                  type="number"
                  className="form-input"
                  value={emaFastPeriod}
                  onChange={(e) => setEmaFastPeriod(parseInt(e.target.value))}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>EMA Lambat (Slow Period)</label>
                <input
                  type="number"
                  className="form-input"
                  value={emaSlowPeriod}
                  onChange={(e) => setEmaSlowPeriod(parseInt(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Periode RSI</label>
                <input
                  type="number"
                  className="form-input"
                  value={rsiPeriod}
                  onChange={(e) => setRsiPeriod(parseInt(e.target.value))}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Periode ATR (Volatilitas)</label>
                <input
                  type="number"
                  className="form-input"
                  value={atrPeriod}
                  onChange={(e) => setAtrPeriod(parseInt(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className={styles.sectionHeader} style={{ marginTop: '24px' }}>
              <span>3</span> Pembobotan Fitur Sinyal (Feature Weights)
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Bobot Tren Lilin / EMA Alignment (0.0 - 1.0): {emaWeight}</label>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={emaWeight}
                onChange={(e) => setEmaWeight(parseFloat(e.target.value))}
                className={styles.rangeInput}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Bobot RSI Exhaustion (0.0 - 1.0): {rsiWeight}</label>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={rsiWeight}
                onChange={(e) => setRsiWeight(parseFloat(e.target.value))}
                className={styles.rangeInput}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Bobot Konfluensi Candlestick Reversal (0.0 - 1.0): {patternWeight}</label>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={patternWeight}
                onChange={(e) => setPatternWeight(parseFloat(e.target.value))}
                className={styles.rangeInput}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={saving} style={{ marginTop: '20px', width: '100%' }}>
              {saving ? 'Menyimpan Versi...' : 'Konfirmasi & Terapkan Kalibrasi'}
            </button>
          </form>

          {/* Info and Versioning Logs Card */}
          <div className={`${styles.infoCard} glass-panel`}>
            <h3>Detail Versi Strategi</h3>
            
            <div className={styles.versionBadgeArea}>
              <span className={styles.versionTag}>{strategy?.versionString || 'v1.0.0'}</span>
              <span className={styles.statusBadge}>ACTIVE</span>
            </div>

            <p className={styles.infoText}>
              Kalibrasi TradeMachine menggunakan model versioning database yang terisolasi. 
              Setiap kali Anda menekan tombol simpan, parameter lama tidak akan dihapus. 
              Sistem akan membuat versi baru (misalnya <code>v1.0.x</code>) dan menjadikannya aktif. 
              Metode ini memastikan replayability historis yang konsisten.
            </p>

            <div className={styles.metaInfo}>
              <div className={styles.metaRow}>
                <span>Nama Registry:</span>
                <strong>{strategy?.strategy?.name || 'Default Strategy'}</strong>
              </div>
              <div className={styles.metaRow}>
                <span>Tanggal Rilis:</span>
                <strong>{strategy ? new Date(strategy.createdAt).toLocaleDateString() : '-'}</strong>
              </div>
              <div className={styles.metaRow}>
                <span>Max Drawdown Limit:</span>
                <strong>{strategy?.maxDrawdownLmt || 15.0}%</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
