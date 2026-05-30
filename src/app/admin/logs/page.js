'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import styles from '@/styles/admin.module.css';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadLogs() {
    try {
      const res = await fetch('/api/admin/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.auditLogs || []);
      } else {
        setError('Gagal memuat log audit sistem');
      }
    } catch (err) {
      console.error(err);
      setError('Koneksi terputus');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <DashboardLayout title="Log Audit Keamanan & Sistem">
      {error && <div className={styles.errorBox}>{error}</div>}

      <div className={`${styles.tableCard} glass-panel`}>
        <h3>Catatan Aktivitas Sistem</h3>

        <div className={styles.userTableWrapper}>
          {loading ? (
            <div className={styles.loadingCard}>Memuat data log audit...</div>
          ) : logs.length === 0 ? (
            <div className={styles.loadingCard}>Belum ada log audit terekam.</div>
          ) : (
            <table className={styles.auditTable}>
              <thead>
                <tr>
                  <th>Waktu Kejadian</th>
                  <th>Aksi Tindakan</th>
                  <th>Pengguna</th>
                  <th>Detail & Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <span className={`${styles.actionBadge} ${styles[log.action.toLowerCase()] || ''}`}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <strong>@{log.user?.username || 'SYSTEM'}</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>
                        {log.user?.role || 'SYSTEM'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
