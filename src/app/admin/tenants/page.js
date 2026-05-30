'use client';

import React, { useState, useEffect } from 'react';
import styles from '@/styles/governance.module.css';

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/tenants');
      const data = await res.json();
      if (data.success) {
        setTenants(data.tenants);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async (e) => {
    e.preventDefault();
    if (!newTenantName) return;
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CREATE', name: newTenantName })
      });
      const data = await res.json();
      if (data.success) {
        setNewTenantName('');
        setShowCreate(false);
        fetchTenants();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTenantAction = async (tenantId, action) => {
    if (action === 'DELETE' && !confirm('Are you sure you want to delete this tenant workspace?')) return;
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, tenantId })
      });
      const data = await res.json();
      if (data.success) {
        fetchTenants();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: 'var(--text-secondary)' }}>
        <span>⚡ Loading SaaS Workspace Governance...</span>
      </div>
    );
  }

  return (
    <main className={styles.container}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
            🏢 Tenant Workspace Governance
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
            Monitor real-time resource usage, set quota limits, and track pricing tier allocations per customer
          </p>
        </div>
        <div>
          <button className={styles.actionBtn} style={{ background: 'var(--accent-primary-glow)', color: '#fff', border: '1px solid var(--accent-primary)' }} onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? 'Hide Panel' : '+ Create Workspace'}
          </button>
        </div>
      </header>

      {showCreate && (
        <section className={styles.governanceCard} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
          <h3>🆕 Add New Tenant Workspace</h3>
          <form onSubmit={handleCreateTenant} style={{ display: 'flex', gap: '12px', marginTop: '12px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Workspace Name</label>
              <input type="text" value={newTenantName} onChange={(e) => setNewTenantName(e.target.value)} placeholder="e.g. Goldman Trading Group" style={{ width: '100%', background: '#000', border: '1px solid var(--border-color)', padding: '8px', color: '#fff', borderRadius: '4px', marginTop: '4px' }} required />
            </div>
            <button type="submit" className={styles.actionBtn} style={{ background: 'var(--accent-primary-glow)', color: '#fff', height: '38px' }}>
              Provision Workspace
            </button>
          </form>
        </section>
      )}

      {/* Grid summarizing usage */}
      <section className={styles.grid}>
        <div className={styles.governanceCard} style={{ background: 'rgba(20, 20, 25, 0.4)' }}>
          <h3>Total Workspaces</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: '800', margin: '8px 0', color: 'var(--accent-primary)' }}>{tenants.length}</p>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Active multi-tenant structures</span>
        </div>
        <div className={styles.governanceCard} style={{ background: 'rgba(20, 20, 25, 0.4)' }}>
          <h3>Active Subscriptions</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: '800', margin: '8px 0', color: 'rgb(16, 185, 129)' }}>
            {tenants.filter(t => t.subscriptionStatus === 'ACTIVE').length}
          </p>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Paying premium customer segments</span>
        </div>
      </section>

      {/* Main tenants table view */}
      <section className={styles.governanceCard} style={{ background: 'rgba(20, 20, 25, 0.4)' }}>
        <h3>Workspaces List</h3>
        <div className={styles.tableWrapper}>
          <table className={styles.governanceTable}>
            <thead>
              <tr>
                <th>Workspace Name</th>
                <th>Users</th>
                <th>Daily Scans</th>
                <th>AI OCR Count</th>
                <th>Storage Used</th>
                <th>Plan Tier</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 'bold' }}>{t.name}</td>
                  <td>{t.userCount} Active</td>
                  <td>{t.usage.scanVolumeCount} Scans</td>
                  <td>{t.usage.ocrSpamCount} Calls</td>
                  <td>{t.usage.storageUsed.toFixed(1)} MB</td>
                  <td>
                    <span className={styles.badge} style={{ background: 'rgba(167, 139, 250, 0.1)', color: 'rgb(167, 139, 250)', border: '1px solid rgb(167, 139, 250)' }}>
                      {t.subscriptionPlan}
                    </span>
                  </td>
                  <td>
                    <span className={styles.badge} style={{ 
                      background: t.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                      color: t.status === 'ACTIVE' ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)',
                      border: t.status === 'ACTIVE' ? '1px solid rgb(16, 185, 129)' : '1px solid rgb(239, 68, 68)'
                    }}>
                      {t.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {t.status === 'ACTIVE' ? (
                        <button className={styles.actionBtn} style={{ color: 'rgb(245, 158, 11)' }} onClick={() => handleTenantAction(t.id, 'SUSPEND')}>Suspend</button>
                      ) : (
                        <button className={styles.actionBtn} style={{ color: 'rgb(16, 185, 129)' }} onClick={() => handleTenantAction(t.id, 'REACTIVATE')}>Reactivate</button>
                      )}
                      <button className={styles.actionBtn} style={{ color: 'rgb(239, 68, 68)' }} onClick={() => handleTenantAction(t.id, 'DELETE')}>Delete</button>
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
