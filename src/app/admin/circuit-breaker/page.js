'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import styles from '@/styles/governance.module.css';

export default function InstitutionalGovernanceDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updatingMode, setUpdatingMode] = useState(false);

  async function fetchGovernanceData() {
    try {
      const res = await fetch('/api/admin/governance');
      if (res.ok) {
        const result = await res.json();
        setData(result.data);
      } else {
        setError('Gagal mengambil data tata kelola institusional.');
      }
    } catch (err) {
      setError('Kesalahan jaringan saat menghubungi API tata kelola.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchGovernanceData();
  }, []);

  const handleUpdateMode = async (strategyId, deploymentMode) => {
    setUpdatingMode(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/governance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_STRATEGY_MODE',
          strategyId,
          deploymentMode
        })
      });
      if (res.ok) {
        setSuccess(`Deployment Mode berhasil diubah ke ${deploymentMode}`);
        fetchGovernanceData();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Gagal mengubah Deployment Mode.');
      }
    } catch (err) {
      setError('Kesalahan koneksi saat memperbarui Deployment Mode.');
    } finally {
      setUpdatingMode(false);
    }
  };

  const handleUpdateStatus = async (strategyId, status) => {
    setUpdatingMode(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/governance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_STRATEGY_STATUS',
          strategyId,
          status
        })
      });
      if (res.ok) {
        setSuccess(`Status Strategi berhasil diubah ke ${status}`);
        fetchGovernanceData();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Gagal mengubah Status Strategi.');
      }
    } catch (err) {
      setError('Kesalahan koneksi saat memperbarui Status Strategi.');
    } finally {
      setUpdatingMode(false);
    }
  };

  const handleResetCircuit = async (sourceName) => {
    setUpdatingMode(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/governance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESET_CIRCUIT',
          sourceName
        })
      });
      if (res.ok) {
        setSuccess(`Circuit Breaker untuk ${sourceName} berhasil direset ke HEALTHY`);
        fetchGovernanceData();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Gagal mereset Circuit Breaker.');
      }
    } catch (err) {
      setError('Kesalahan koneksi saat mereset Circuit Breaker.');
    } finally {
      setUpdatingMode(false);
    }
  };

  const getCBStateClass = (state) => {
    switch (state) {
      case 'HEALTHY': return styles.badgeHealthy;
      case 'DEGRADED': return styles.badgeDegraded;
      case 'OFFLINE': return styles.badgeOffline;
      case 'RECOVERY': return styles.badgeRecovery;
      default: return '';
    }
  };

  const getStatusClass = (status) => {
    return status === 'ACTIVE' ? styles.badgeActive : styles.badgeDisabled;
  };

  const getDeploymentClass = (mode) => {
    switch (mode) {
      case 'LIVE': return styles.badgeLive;
      case 'SHADOW': return styles.badgeShadow;
      case 'PAPER': return styles.badgePaper;
      default: return '';
    }
  };

  return (
    <DashboardLayout title="Quant Risk & Governance Console">
      <div className={styles.container}>
        {error && <div className="alert alert-danger" style={{ padding: '12px 16px', borderRadius: '4px', marginBottom: '16px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ padding: '12px 16px', borderRadius: '4px', marginBottom: '16px', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.2)' }}>{success}</div>}

        {loading ? (
          <div className={styles.loadingCard}>Menganalisis matriks tata kelola kuantitatif...</div>
        ) : (
          <>
            {/* Top row: Strategy Health & Circuit Breakers */}
            <div className={styles.grid}>
              {/* Strategy Control Card */}
              <div className={`${styles.governanceCard} glass-panel`}>
                <h3>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  Strategy Health & Status
                </h3>
                {data?.activeStrategy ? (
                  <div>
                    <div className={styles.metricRow}>
                      <span className={styles.metricLabel}>Versi Aktif:</span>
                      <span className={styles.metricVal}>{data.activeStrategy.versionString}</span>
                    </div>
                    <div className={styles.metricRow}>
                      <span className={styles.metricLabel}>Status Strategi:</span>
                      <span className={`${styles.badge} ${getStatusClass(data.activeStrategy.status)}`}>
                        {data.activeStrategy.status}
                      </span>
                    </div>
                    <div className={styles.metricRow}>
                      <span className={styles.metricLabel}>Mode Deployment:</span>
                      <span className={`${styles.badge} ${getDeploymentClass(data.activeStrategy.deploymentMode)}`}>
                        {data.activeStrategy.deploymentMode}
                      </span>
                    </div>
                    <div className={styles.metricRow}>
                      <span className={styles.metricLabel}>Rolling Win Rate:</span>
                      <span className={styles.metricVal}>{(data.activeStrategy.rollingWinRate * 100).toFixed(1)}%</span>
                    </div>
                    <div className={styles.metricRow}>
                      <span className={styles.metricLabel}>Rolling Profit Factor:</span>
                      <span className={`${styles.metricVal} ${data.activeStrategy.rollingProfitFactor < 1.0 ? 'text-danger' : ''}`}>
                        {data.activeStrategy.rollingProfitFactor.toFixed(2)}
                      </span>
                    </div>
                    <div className={styles.metricRow}>
                      <span className={styles.metricLabel}>Max Drawdown (Rolling):</span>
                      <span className={`${styles.metricVal} ${data.activeStrategy.rollingMaxDrawdown > 15.0 ? 'text-danger' : ''}`}>
                        {data.activeStrategy.rollingMaxDrawdown.toFixed(1)}%
                      </span>
                    </div>

                    <div style={{ marginTop: '16px' }}>
                      <div className={styles.metricLabel} style={{ marginBottom: '8px' }}>Tindakan Tata Kelola:</div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button 
                          className={styles.actionBtn} 
                          disabled={updatingMode || data.activeStrategy.status === 'DISABLED'}
                          onClick={() => handleUpdateStatus(data.activeStrategy.id, 'DISABLED')}
                          style={{ borderColor: 'rgb(239, 68, 68)', color: 'rgb(248, 113, 113)' }}
                        >
                          Tangguhkan (DISABLE)
                        </button>
                        <button 
                          className={styles.actionBtn} 
                          disabled={updatingMode || data.activeStrategy.status === 'ACTIVE'}
                          onClick={() => handleUpdateStatus(data.activeStrategy.id, 'ACTIVE')}
                          style={{ borderColor: 'rgb(16, 185, 129)', color: 'rgb(52, 211, 153)' }}
                        >
                          Aktifkan (ACTIVE)
                        </button>
                        
                        <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.05)', margin: '8px 0' }}></div>
                        
                        <button 
                          className={`${styles.actionBtn} ${data.activeStrategy.deploymentMode === 'PAPER' ? styles.actionBtnPrimary : ''}`}
                          disabled={updatingMode}
                          onClick={() => handleUpdateMode(data.activeStrategy.id, 'PAPER')}
                        >
                          PAPER
                        </button>
                        <button 
                          className={`${styles.actionBtn} ${data.activeStrategy.deploymentMode === 'SHADOW' ? styles.actionBtnPrimary : ''}`}
                          disabled={updatingMode}
                          onClick={() => handleUpdateMode(data.activeStrategy.id, 'SHADOW')}
                        >
                          SHADOW
                        </button>
                        <button 
                          className={`${styles.actionBtn} ${data.activeStrategy.deploymentMode === 'LIVE' ? styles.actionBtnPrimary : ''}`}
                          disabled={updatingMode}
                          onClick={() => handleUpdateMode(data.activeStrategy.id, 'LIVE')}
                        >
                          LIVE
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.loadingCard}>Tidak ada strategi aktif di database.</div>
                )}
              </div>

              {/* Circuit Breakers Card */}
              <div className={`${styles.governanceCard} glass-panel`}>
                <h3>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
                  API Circuit Breakers
                </h3>
                <div>
                  <p className={styles.infoText} style={{ marginBottom: '12px' }}>
                    Modul circuit breaker otomatis memantau kegagalan API eksternal secara berturut-turut untuk melindungi dana dari data rusak.
                  </p>
                  {data?.circuitBreakers && data.circuitBreakers.length > 0 ? (
                    data.circuitBreakers.map((cb) => (
                      <div key={cb.id} style={{ marginBottom: '16px', background: 'rgba(255, 255, 255, 0.01)', padding: '12px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.03)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <strong style={{ fontSize: '0.9rem' }}>{cb.sourceName}</strong>
                          <span className={`${styles.badge} ${getCBStateClass(cb.currentState)}`}>
                            {cb.currentState}
                          </span>
                        </div>
                        <div className={styles.metricRow} style={{ padding: '4px 0' }}>
                          <span className={styles.metricLabel}>Kegagalan Beruntun:</span>
                          <span className={styles.metricVal}>{cb.consecutiveFailures} / 5 max</span>
                        </div>
                        <div className={styles.metricRow} style={{ padding: '4px 0' }}>
                          <span className={styles.metricLabel}>Keberhasilan Beruntun:</span>
                          <span className={styles.metricVal}>{cb.consecutiveSuccesses}</span>
                        </div>
                        <div className={styles.metricRow} style={{ padding: '4px 0' }}>
                          <span className={styles.metricLabel}>Rasio Sukses:</span>
                          <span className={styles.metricVal}>
                            {cb.totalQueries > 0 ? ((cb.successQueries / cb.totalQueries) * 100).toFixed(1) : 0}% 
                            ({cb.successQueries}/{cb.totalQueries})
                          </span>
                        </div>
                        {cb.currentState !== 'HEALTHY' && (
                          <button 
                            className={styles.actionBtn}
                            onClick={() => handleResetCircuit(cb.sourceName)}
                            style={{ marginTop: '8px', width: '100%', borderColor: 'rgba(6, 182, 212, 0.4)', color: 'rgb(6, 182, 212)' }}
                          >
                            Reset Circuit to HEALTHY
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className={styles.loadingCard}>Belum ada data circuit breaker tercatat.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Calibration Report & Monte Carlo reports */}
            <div className={styles.grid}>
              {/* Confidence Bucket Stats / Calibration Report */}
              <div className={`${styles.governanceCard} glass-panel`} style={{ gridColumn: 'span 2' }}>
                <h3>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  Confidence Bucket Stats (Calibration Report)
                </h3>
                <p className={styles.infoText}>
                  Membandingkan tingkat keyakinan analisis kuantitatif dengan hasil aktual perdagangan di bursa.
                </p>
                <div className={styles.tableWrapper}>
                  <table className={styles.governanceTable}>
                    <thead>
                      <tr>
                        <th>Rentang Keyakinan</th>
                        <th>Total Sinyal</th>
                        <th>Kemenangan (Wins)</th>
                        <th>Kekalahan (Losses)</th>
                        <th>Win Rate Aktual</th>
                        <th>Penyimpangan (Deviation)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.confidenceBucketStats && data.confidenceBucketStats.length > 0 ? (
                        data.confidenceBucketStats.map((stat) => {
                          const minConf = parseInt(stat.bucketRange.split('-')[0]);
                          const maxConf = parseInt(stat.bucketRange.split('-')[1]);
                          const targetWR = (minConf + maxConf) / 2 / 100;
                          const dev = stat.actualWinRate - targetWR;
                          const devColor = dev < -0.05 ? '#f87171' : dev > 0.05 ? '#34d399' : '#e5e7eb';
                          return (
                            <tr key={stat.id}>
                              <td><strong>{stat.bucketRange}%</strong></td>
                              <td>{stat.totalSignals}</td>
                              <td>{stat.totalWins}</td>
                              <td>{stat.totalLosses}</td>
                              <td>
                                <div className={styles.progressContainer}>
                                  <div 
                                    className={styles.progressBar} 
                                    style={{ 
                                      width: `${stat.actualWinRate * 100}%`,
                                      background: stat.actualWinRate > 0.5 ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'
                                    }}
                                  />
                                </div>
                                {(stat.actualWinRate * 100).toFixed(1)}%
                              </td>
                              <td style={{ color: devColor, fontWeight: '700' }}>
                                {dev >= 0 ? '+' : ''}{(dev * 100).toFixed(1)}%
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                            Belum ada trade yang ditutup untuk menghitung kalibrasi aktual.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Monte Carlo Validation Gate Reports */}
            <div className={styles.grid}>
              <div className={`${styles.governanceCard} glass-panel`} style={{ gridColumn: 'span 2' }}>
                <h3>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                  Monte Carlo Validation Gate Reports
                </h3>
                <p className={styles.infoText}>
                  Setiap strategi versi diwajibkan melewati gerbang validasi simulasi 5,000+ iterasi sebelum diizinkan untuk digunakan dalam mode LIVE.
                </p>
                <div className={styles.tableWrapper}>
                  <table className={styles.governanceTable}>
                    <thead>
                      <tr>
                        <th>Strategi ID / Versi</th>
                        <th>Jumlah Iterasi</th>
                        <th>Probabilitas Kebangkrutan</th>
                        <th>95% Drawdown CI</th>
                        <th>Profit Factor</th>
                        <th>Gerbang Keselamatan</th>
                        <th>Tanggal Validasi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.activeStrategy?.validationReports && data.activeStrategy.validationReports.length > 0 ? (
                        data.activeStrategy.validationReports.map((report) => (
                          <tr key={report.id}>
                            <td><strong>{data.activeStrategy.versionString}</strong></td>
                            <td>{report.iterations.toLocaleString()}</td>
                            <td className={report.ruinProbability > 0.05 ? 'text-danger' : ''}>
                              {(report.ruinProbability * 100).toFixed(2)}%
                            </td>
                            <td className={report.drawdownConfidenceInterval95 > 20.0 ? 'text-danger' : ''}>
                              {report.drawdownConfidenceInterval95.toFixed(2)}%
                            </td>
                            <td className={report.profitFactor < 1.3 ? 'text-danger' : ''}>
                              {report.profitFactor.toFixed(2)}
                            </td>
                            <td>
                              <span className={`${styles.badge} ${report.status === 'PASSED' ? styles.badgeHealthy : styles.badgeOffline}`}>
                                {report.status}
                              </span>
                            </td>
                            <td>{new Date(report.createdAt).toLocaleString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                            Belum ada laporan simulasi validasi Monte Carlo untuk versi strategi ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Portfolio Risk Sizing Decisions Logs */}
            <div className={styles.grid}>
              <div className={`${styles.governanceCard} glass-panel`} style={{ gridColumn: 'span 2' }}>
                <h3>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  Portfolio Risk Sizing Logs
                </h3>
                <p className={styles.infoText}>
                  Pemantauan real-time keputusan pengukur posisi portofolio yang disesuaikan secara dinamis berdasarkan batas risiko aktif dan korelasi kelompok aset.
                </p>
                <div className={styles.tableWrapper}>
                  <table className={styles.governanceTable}>
                    <thead>
                      <tr>
                        <th>Waktu Keputusan</th>
                        <th>Aset / Simbol</th>
                        <th>Risiko Diminta</th>
                        <th>Risiko Disetujui</th>
                        <th>Leverage</th>
                        <th>Grup Korelasi</th>
                        <th>Tindakan Portofolio</th>
                        <th>Detail Batasan Risiko</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.riskDecisions && data.riskDecisions.length > 0 ? (
                        data.riskDecisions.map((log) => (
                          <tr key={log.id}>
                            <td>{new Date(log.createdAt).toLocaleTimeString()}</td>
                            <td><strong>{log.symbol}</strong></td>
                            <td>{log.requestedRiskPct.toFixed(2)}%</td>
                            <td>{log.approvedRiskPct.toFixed(2)}%</td>
                            <td>{log.leverage}x</td>
                            <td><span className="badge badge-outline">{log.correlationGroup}</span></td>
                            <td>
                              <span className={`${styles.badge} ${
                                log.action === 'APPROVED' ? styles.badgeHealthy : 
                                log.action === 'DOWNSIZED' ? styles.badgeDegraded : styles.badgeOffline
                              }`}>
                                {log.action}
                              </span>
                            </td>
                            <td>
                              <div className={styles.detailBox} title={log.reason}>
                                {log.reason}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                            Belum ada log keputusan alokasi risiko portofolio saat ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
