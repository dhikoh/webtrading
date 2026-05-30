'use client';

import { useState, useEffect } from 'react';
import styles from '@/styles/header.module.css';

export default function Header({ title, user }) {
  const [apiLatency, setApiLatency] = useState(0);
  const [apiStatus, setApiStatus] = useState('CHECKING'); // OK, SLOW, DOWN
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Poll API health reliability statistics every 15 seconds
  useEffect(() => {
    async function checkReliability() {
      try {
        const res = await fetch('/api/monitoring/health');
        if (res.ok) {
          const data = await res.json();
          setApiLatency(data.latency);
          if (data.status === 'OK') setApiStatus('OK');
          else if (data.status === 'SLOW') setApiStatus('SLOW');
          else setApiStatus('DOWN');
        } else {
          setApiStatus('DOWN');
        }
      } catch (err) {
        setApiStatus('DOWN');
      }
    }

    checkReliability();
    const interval = setInterval(checkReliability, 15000);
    return () => clearInterval(interval);
  }, []);

  // Fetch and stream notifications
  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setUnreadCount((data.notifications || []).filter(n => !n.isRead).length);
        }
      } catch (err) {
        console.error("Notifications fetch error:", err);
      }
    }

    fetchNotifications();

    // Establish Server-Sent Events stream connection
    const eventSource = new EventSource('/api/notifications/stream');

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.status === 'CONNECTED' || parsed.heartbeat) return;

        if (parsed.type === 'SIGNAL') {
          const signalData = parsed.data;
          
          const newNotif = {
            id: signalData.id,
            title: `Sinyal Baru Terdeteksi (${signalData.asset})`,
            message: `Arah: ${signalData.signal.replace('_', ' ')} (Conf: ${signalData.confidence}%) pada TF ${signalData.timeframe}.`,
            type: signalData.signal === 'NO TRADE' ? 'INFO' : 'ALERT',
            isRead: false,
            createdAt: new Date().toISOString()
          };

          setNotifications(prev => [newNotif, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Trigger audio synth chimes
          if (signalData.signal !== 'NO TRADE' && typeof window !== 'undefined' && window.playNotificationChime) {
            window.playNotificationChime();
          }
        }
      } catch (e) {
        console.error("Error parsing SSE data:", e);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE Connection error, retrying...", err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read', { method: 'POST' });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <h2 className={styles.pageTitle}>{title}</h2>
        <span className={styles.workspaceName}>{user?.tenantName || 'Private Workspace'}</span>
      </div>

      <div className={styles.right}>
        {/* Binance API Health Status */}
        <div className={styles.healthBadge}>
          <span className={`${styles.statusDot} ${styles[apiStatus.toLowerCase()]}`} />
          <span className={styles.healthLabel}>
            Binance: {apiStatus === 'OK' ? `${apiLatency}ms` : apiStatus === 'SLOW' ? `SLOW (${apiLatency}ms)` : 'OFFLINE'}
          </span>
        </div>

        {/* Notifications Alert Bell */}
        <div className={styles.notificationWrapper}>
          <button className={styles.bellBtn} onClick={() => setShowNotifications(!showNotifications)}>
            🔔
            {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
          </button>
          
          {showNotifications && (
            <div className={`${styles.dropdown} glass-panel`}>
              <div className={styles.dropdownHeader}>
                <h4>Notifikasi</h4>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className={styles.readAllBtn}>Tandai dibaca</button>
                )}
              </div>
              <div className={styles.dropdownList}>
                {notifications.length === 0 ? (
                  <div className={styles.emptyState}>Tidak ada alarm sinyal saat ini.</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={`${styles.notifItem} ${n.isRead ? '' : styles.unread}`}>
                      <div className={styles.notifTitle}>{n.title}</div>
                      <div className={styles.notifMsg}>{n.message}</div>
                      <span className={styles.notifTime}>{new Date(n.createdAt).toLocaleTimeString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
