'use client';

import React, { useState, useEffect } from 'react';
import styles from '@/styles/governance.module.css';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('MEMBER');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId, action, extraBody = {}) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, targetUserId: userId, ...extraBody })
      });
      const result = await res.json();
      if (result.success) {
        fetchUsers();
        setEditingUser(null);
      } else {
        alert(result.error || 'Operation failed');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const startEdit = (user) => {
    setEditingUser(user);
    setNewName(user.name);
    setNewEmail(user.email);
    setNewRole(user.role);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: 'var(--text-secondary)' }}>
        <span>⚡ Loading SaaS User Management...</span>
      </div>
    );
  }

  return (
    <main className={styles.container}>
      <header style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
          👥 Superadmin User Management
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
          Manage multi-tenant SaaS user accounts, enforce security overrides, and track activity
        </p>
      </header>

      {/* Edit Form Modal Card */}
      {editingUser && (
        <section className={styles.governanceCard} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--accent-primary)' }}>
          <h3>✏️ Edit User: {editingUser.username}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Full Name</label>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ width: '100%', background: '#000', border: '1px solid var(--border-color)', padding: '6px', color: '#fff', borderRadius: '4px', marginTop: '4px' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Email</label>
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} style={{ width: '100%', background: '#000', border: '1px solid var(--border-color)', padding: '6px', color: '#fff', borderRadius: '4px', marginTop: '4px' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>System Role</label>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)} style={{ width: '100%', background: '#000', border: '1px solid var(--border-color)', padding: '6px', color: '#fff', borderRadius: '4px', marginTop: '4px' }}>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                <option value="ADMIN">ADMIN</option>
                <option value="ANALYST">ANALYST</option>
                <option value="MEMBER">MEMBER</option>
                <option value="VIEWER">VIEWER</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
            <button className={styles.actionBtn} style={{ background: 'var(--accent-primary-glow)', color: '#fff' }} onClick={() => handleUserAction(editingUser.id, 'UPDATE_PROFILE', { name: newName, email: newEmail, role: newRole })}>
              Save Profile
            </button>
            <button className={styles.actionBtn} onClick={() => setEditingUser(null)}>
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* Main Table view */}
      <section className={styles.governanceCard} style={{ background: 'rgba(20, 20, 25, 0.4)' }}>
        <h3>Active Users List</h3>
        <div className={styles.tableWrapper}>
          <table className={styles.governanceTable}>
            <thead>
              <tr>
                <th>Username</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Tenant</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td style={{ fontWeight: 'bold' }}>{user.username}</td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.tenant?.name || 'Isolated'}</td>
                  <td>
                    <span className={styles.badge} style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'rgb(96, 165, 250)', border: '1px solid rgb(59, 130, 246)' }}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span className={styles.badge} style={{ 
                      background: user.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                      color: user.status === 'ACTIVE' ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)',
                      border: user.status === 'ACTIVE' ? '1px solid rgb(16, 185, 129)' : '1px solid rgb(239, 68, 68)'
                    }}>
                      {user.status}
                    </span>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button className={styles.actionBtn} onClick={() => startEdit(user)}>Edit</button>
                      
                      {user.status === 'ACTIVE' ? (
                        <button className={styles.actionBtn} style={{ color: 'rgb(245, 158, 11)' }} onClick={() => handleUserAction(user.id, 'SUSPEND')}>Suspend</button>
                      ) : (
                        <button className={styles.actionBtn} style={{ color: 'rgb(16, 185, 129)' }} onClick={() => handleUserAction(user.id, 'REACTIVATE')}>Reactivate</button>
                      )}
                      
                      <button className={styles.actionBtn} onClick={() => handleUserAction(user.id, 'UNLOCK')} style={{ color: 'rgb(6, 182, 212)' }}>Unlock</button>
                      <button className={styles.actionBtn} onClick={() => handleUserAction(user.id, 'FORCE_RESET')} style={{ color: 'rgb(167, 139, 250)' }}>Force Reset</button>
                      <button className={styles.actionBtn} style={{ color: 'rgb(239, 68, 68)' }} onClick={() => handleUserAction(user.id, 'SOFT_DELETE')}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
