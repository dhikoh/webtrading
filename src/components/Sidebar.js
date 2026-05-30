'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from '@/styles/sidebar.module.css';

export default function Sidebar({ user, onLogout }) {
  const pathname = usePathname();
  const router = useRouter();

  const menuItems = [
    { name: 'Ringkasan', path: '/dashboard', icon: '📊' },
    { name: 'Analisis Chart', path: '/dashboard/analysis', icon: '📈' },
    { name: 'Sinyal & Alarm', path: '/dashboard/signals', icon: '🔔' },
    { name: 'Simulator Backtest', path: '/dashboard/backtest', icon: '🧪' },
    { name: 'Jurnal Trading', path: '/dashboard/journal', icon: '📓' },
    { name: 'Profil & Setelan', path: '/dashboard/settings', icon: '⚙️' }
  ];

  const adminItems = [
    { name: 'Setelan Parameter', path: '/admin', icon: '🛠️' },
    { name: 'Manajemen User', path: '/admin/users', icon: '👤' },
    { name: 'Log Audit Sistem', path: '/admin/logs', icon: '📋' }
  ];

  const handleLogoutClick = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        if (onLogout) onLogout();
        router.push('/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoArea}>
        <span className="pulse-glow" style={{ fontSize: '1.8rem' }}>🛸</span>
        <div className={styles.logoText}>
          <h3>TradeMachine</h3>
          <span className={styles.tag}>AI FUTURES</span>
        </div>
      </div>

      <nav className={styles.nav}>
        <div className={styles.sectionLabel}>Navigasi Utama</div>
        {menuItems.map(item => {
          const isActive = pathname === item.path;
          return (
            <Link key={item.path} href={item.path} className={`${styles.navLink} ${isActive ? styles.active : ''}`}>
              <span className={styles.icon}>{item.icon}</span>
              <span className={styles.label}>{item.name}</span>
            </Link>
          );
        })}

        {user?.role === 'SUPER_ADMIN' && (
          <>
            <div className={styles.sectionLabel} style={{ marginTop: '20px' }}>Super Admin Panel</div>
            {adminItems.map(item => {
              const isActive = pathname === item.path;
              return (
                <Link key={item.path} href={item.path} className={`${styles.navLink} ${isActive ? styles.active : ''} ${styles.adminLink}`}>
                  <span className={styles.icon}>{item.icon}</span>
                  <span className={styles.label}>{item.name}</span>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className={styles.footer}>
        <div className={styles.userBadge}>
          <div className={styles.avatar}>
            {user?.name?.substring(0, 2).toUpperCase() || 'U'}
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.name || 'User Name'}</span>
            <span className={styles.userRole}>{user?.role || 'MEMBER'}</span>
          </div>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogoutClick}>
          <span>🚪</span> Keluar
        </button>
      </div>
    </aside>
  );
}
