'use client';

import React, { useState, useEffect } from 'react';
import styles from '@/styles/governance.module.css';

export default function AdminSystemPage() {
  const [config, setConfig] = useState(null);
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [killReason, setKillReason] = useState('');
  const [customBackupName, setCustomBackupName] = useState('');

  useEffect(() => {
    fetchSystemConfig();
  }, []);

  const fetchSystemConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/system');
      const data = await res.json();
      if (data.success) {
        setConfig(data.systemConfig);
        setBackups(data.backups);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleKillSwitch = async (currentState) => {
    const newState = !currentState;
    if (newState && !killReason) {
      alert('You must provide a clear reason for activating the Global Kill Switch!');
      return;
    }
    try {
      const res = await fetch('/api/admin/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TOGGLE_KILL_SWITCH',
          globalKillSwitch: newState,
          killSwitchReason: newState ? killReason : ''
        })
      });
      const data = await res.json();
      if (data.success) {
        setKillReason('');
        fetchSystemConfig();
        alert(`Global Kill Switch successfully ${newState ? 'ACTIVATED' : 'DEACTIVATED'}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMaintenanceMode = async (mode) => {
    try {
      const res = await fetch('/api/admin/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SET_MAINTENANCE',
          maintenanceMode: mode
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchSystemConfig();
        alert(`System maintenance mode transitioned to: ${mode}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerBackup = async () => {
    try {
      const res = await fetch('/api/admin/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TRIGGER_BACKUP',
          backupName: customBackupName || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setCustomBackupName('');
        fetchSystemConfig();
        alert('Manual SQL database snapshot successfully generated!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerifyRestore = async (backupName) => {
    try {
      const res = await fetch('/api/admin/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'VERIFY_RESTORE',
          backupName
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchSystemConfig();
        alert(`Restoration integrity verify success for: ${backupName}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !config) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', color: 'var(--text-secondary)' }}>
        <span>⚡ Loading Global System Controls...</span>
      </div>
    );
  }

  return (
    <main className={styles.container}>
      <header style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
          ⚙️ Global System Configuration & Backups
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
          Enforce global kill switches, manage server maintenance windows, and handle disaster recovery snapshots
        </p>
      </header>

      {/* Grid: Global safety triggers */}
      <section className={styles.grid}>
        {/* Global Kill Switch */}
        <div className={styles.governanceCard} style={{ background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <h3 style={{ color: 'rgb(239, 68, 68)' }}>⚠️ Emergency Global Kill Switch</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Activating the Kill Switch suspends all scans, analyses, backtests, and AI engine computations immediately.
          </p>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Current Status:</span>
            <span className={styles.badge} style={{ 
              background: config.globalKillSwitch ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', 
              color: config.globalKillSwitch ? 'rgb(239,68,68)' : 'rgb(16,185,129)',
              border: config.globalKillSwitch ? '1px solid rgb(239,68,68)' : '1px solid rgb(16,185,129)'
            }}>
              {config.globalKillSwitch ? 'ACTIVE - LOCKED' : 'DEACTIVE - SECURE'}
            </span>
          </div>

          {config.globalKillSwitch && (
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '4px', margin: '10px 0', fontSize: '0.8rem', borderLeft: '3px solid rgb(239,68,68)' }}>
              <strong>Activation Reason:</strong> {config.killSwitchReason}
            </div>
          )}

          {!config.globalKillSwitch && (
            <div style={{ marginTop: '12px' }}>
              <input 
                type="text" 
                placeholder="Enter activation justification details..." 
                value={killReason}
                onChange={(e) => setKillReason(e.target.value)}
                style={{ width: '100%', background: '#000', border: '1px solid var(--border-color)', padding: '8px', color: '#fff', borderRadius: '4px', fontSize: '0.8rem' }}
              />
            </div>
          )}

          <div style={{ marginTop: '16px' }}>
            {config.globalKillSwitch ? (
              <button className={styles.actionBtn} style={{ background: 'rgb(16, 185, 129)', color: '#fff', width: '100%', padding: '10px' }} onClick={() => handleToggleKillSwitch(true)}>
                Deactivate Kill Switch (Resume Operations)
              </button>
            ) : (
              <button className={styles.actionBtn} style={{ background: 'rgb(239, 68, 68)', color: '#fff', width: '100%', padding: '10px' }} onClick={() => handleToggleKillSwitch(false)}>
                TRIGGER EMERGENCY KILL SWITCH
              </button>
            )}
          </div>
        </div>

        {/* Maintenance Level Selector */}
        <div className={styles.governanceCard} style={{ background: 'rgba(20, 20, 25, 0.4)' }}>
          <h3>🔧 Maintenance and System State</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Under maintenance mode, regular members are restricted from running OCR and scans. Admin accounts retain login capability.
          </p>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Maintenance State:</span>
            <span className={styles.badge} style={{ 
              background: config.maintenanceMode === 'NORMAL' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', 
              color: config.maintenanceMode === 'NORMAL' ? 'rgb(16,185,129)' : 'rgb(245,158,11)',
              border: config.maintenanceMode === 'NORMAL' ? '1px solid rgb(16,185,129)' : '1px solid rgb(245,158,11)'
            }}>
              {config.maintenanceMode}
            </span>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button className={styles.actionBtn} style={{ borderColor: config.maintenanceMode === 'NORMAL' ? 'var(--accent-primary)' : 'transparent' }} onClick={() => handleMaintenanceMode('NORMAL')}>
              Set State: NORMAL
            </button>
            <button className={styles.actionBtn} style={{ borderColor: config.maintenanceMode === 'MAINTENANCE' ? 'rgb(245, 158, 11)' : 'transparent' }} onClick={() => handleMaintenanceMode('MAINTENANCE')}>
              Set State: MAINTENANCE MODE
            </button>
            <button className={styles.actionBtn} style={{ borderColor: config.maintenanceMode === 'EMERGENCY' ? 'rgb(239, 68, 68)' : 'transparent' }} onClick={() => handleMaintenanceMode('EMERGENCY')}>
              Set State: EMERGENCY LOCKDOWN
            </button>
          </div>
        </div>
      </section>

      {/* Section: Cold storage database backups */}
      <section className={styles.grid}>
        <div className={styles.governanceCard} style={{ background: 'rgba(20, 20, 25, 0.4)' }}>
          <h3>💾 Disaster Recovery & Backups</h3>
          <div style={{ display: 'flex', gap: '10px', margin: '12px 0' }}>
            <input 
              type="text" 
              placeholder="e.g. backup_snapshot.sql" 
              value={customBackupName}
              onChange={(e) => setCustomBackupName(e.target.value)}
              style={{ flex: 1, background: '#000', border: '1px solid var(--border-color)', color: '#fff', padding: '6px 12px', borderRadius: '4px', fontSize: '0.85rem' }}
            />
            <button className={styles.actionBtn} style={{ background: 'var(--accent-primary-glow)', color: '#fff' }} onClick={handleTriggerBackup}>
              Generate Snapshot
            </button>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.governanceTable}>
              <thead>
                <tr>
                  <th>Backup File</th>
                  <th>Size</th>
                  <th>Action</th>
                  <th>Status</th>
                  <th>Integrity Check</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{log.fileName}</td>
                    <td>{log.fileSize} MB</td>
                    <td>{log.action}</td>
                    <td>
                      <span className={styles.badge} style={{ background: 'rgba(16,185,129,0.1)', color: 'rgb(16,185,129)' }}>
                        {log.status}
                      </span>
                    </td>
                    <td>
                      <button className={styles.actionBtn} onClick={() => handleVerifyRestore(log.fileName)}>
                        Verify Integrity
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
