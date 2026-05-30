'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '@/styles/auth.module.css';

export default function LoginPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail, password })
      });

      const data = await res.json();
      if (res.ok) {
        router.push('/dashboard');
      } else {
        setError(data.error || 'Autentikasi gagal');
      }
    } catch (err) {
      console.error(err);
      setError('Terjadi kesalahan koneksi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={`${styles.authCard} glass-panel`}>
        <div className={styles.logoArea}>
          <span className="pulse-glow" style={{ fontSize: '3rem' }}>👽</span>
          <h2 className={styles.title}>Masuk TradeMachine</h2>
          <p className={styles.subtitle}>Sistem Analisis & Manajemen Risiko AI</p>
        </div>

        {error && <div className={styles.errorBox}>{error}</div>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Email / Username</label>
            <input
              type="text"
              className="form-input"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              placeholder="Masukkan email atau username"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Kata Sandi</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '12px' }}>
            {loading ? 'Menghubungkan...' : 'Masuk Dashboard'}
          </button>
        </form>

        <div className={styles.footer}>
          Belum punya akun?{' '}
          <Link href="/register" className={styles.link}>
            Daftar Sekarang
          </Link>
        </div>
      </div>
    </div>
  );
}
