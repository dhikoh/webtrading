'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import styles from '@/styles/admin.module.css';

export default function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actioning, setActioning] = useState(false);

  async function loadUsers() {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      } else {
        setError('Gagal memuat daftar pengguna');
      }
    } catch (err) {
      console.error(err);
      setError('Koneksi terputus');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const handleUpdate = async (id, currentRole, currentStatus, type) => {
    setActioning(true);
    setError('');

    let payload = {};
    if (type === 'STATUS') {
      payload.status = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    } else if (type === 'ROLE') {
      payload.role = currentRole === 'SUPER_ADMIN' ? 'MEMBER' : 'SUPER_ADMIN';
    }

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        loadUsers();
      } else {
        const data = await res.json();
        setError(data.error || 'Gagal mengubah setelan pengguna');
      }
    } catch (err) {
      setError('Koneksi terputus');
    } finally {
      setActioning(false);
    }
  };

  return (
    <DashboardLayout title="Manajemen Pengguna & Workspace">
      {error && <div className={styles.errorBox}>{error}</div>}

      <div className={`${styles.tableCard} glass-panel`}>
        <h3>Daftar Pengguna Aktif</h3>

        <div className={styles.userTableWrapper}>
          {loading ? (
            <div className={styles.loadingCard}>Memuat daftar pengguna...</div>
          ) : users.length === 0 ? (
            <div className={styles.loadingCard}>Tidak ada pengguna terdaftar.</div>
          ) : (
            <table className={styles.userTable}>
              <thead>
                <tr>
                  <th>Nama Lengkap</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Tenant Workspace</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Aksi Kontrol</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: '600' }}>{u.name}</td>
                    <td>@{u.username}</td>
                    <td>{u.email}</td>
                    <td>{u.tenant?.name || 'Isolated tenant'}</td>
                    <td>
                      <span className={styles.statusBadge} style={{ background: u.role === 'SUPER_ADMIN' ? 'var(--accent-primary-glow)' : 'rgba(255, 255, 255, 0.05)', color: u.role === 'SUPER_ADMIN' ? 'var(--accent-primary)' : 'var(--text-secondary)', borderColor: u.role === 'SUPER_ADMIN' ? 'var(--accent-primary)' : 'var(--border-color)' }}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className={styles.statusBadge} style={{ background: u.status === 'ACTIVE' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)', color: u.status === 'ACTIVE' ? 'var(--color-success)' : 'var(--color-danger)', borderColor: u.status === 'ACTIVE' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {u.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className={`${styles.actionBtn} ${u.status === 'ACTIVE' ? styles.suspend : styles.activate}`}
                          disabled={actioning}
                          onClick={() => handleUpdate(u.id, u.role, u.status, 'STATUS')}
                        >
                          {u.status === 'ACTIVE' ? 'Suspend' : 'Aktifkan'}
                        </button>
                        <button 
                          className={`${styles.actionBtn} ${styles.roleBtn}`}
                          disabled={actioning}
                          onClick={() => handleUpdate(u.id, u.role, u.status, 'ROLE')}
                        >
                          Tukar Role
                        </button>
                      </div>
                    </td>
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
