'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import styles from '@/styles/layout.module.css';

export default function DashboardLayout({ children, title }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/auth/profile');
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          router.push('/login');
        }
      } catch (err) {
        console.error(err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [router]);

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <span className="pulse-glow" style={{ fontSize: '3rem' }}>👽</span>
        <p style={{ marginTop: '16px', fontWeight: '500', color: 'var(--text-secondary)' }}>
          Memuat Sistem Analisis...
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Sidebar user={user} onLogout={() => setUser(null)} />
      <div className={styles.mainWrapper}>
        <Header title={title} user={user} />
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}
