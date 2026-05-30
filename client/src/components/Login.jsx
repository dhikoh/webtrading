import React, { useState } from 'react';
import { ShieldCheck, UserCheck, KeyRound, AlertTriangle } from 'lucide-react';
import { API_URL } from '../config.js';

export default function Login({ lang = 'id', setLang, onLoginSuccess }) {
  const [username, setUsername] = useState('archqi');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const t = {
    id: {
      username: 'Nama Pengguna',
      password: 'Kata Sandi',
      placeholderUser: 'Masukkan nama pengguna',
      placeholderPass: 'Masukkan kata sandi',
      auth: 'Mengotentikasi...',
      registerBtn: 'Daftar Anggota',
      loginBtn: 'Masuk Aman',
      backLogin: 'Kembali ke Login',
      createAccount: 'Buat Akun Baru',
      defaultSeed: 'Akun Bawaan (Default):',
      adminLabel: 'Super Admin',
      memberLabel: 'Anggota',
      errorMsg: 'Otentikasi gagal. Silakan verifikasi kredensial Anda.'
    },
    en: {
      username: 'Username',
      password: 'Password',
      placeholderUser: 'Enter username',
      placeholderPass: 'Enter password',
      auth: 'Authenticating...',
      registerBtn: 'Register Member',
      loginBtn: 'Secure Login',
      backLogin: 'Back to Login',
      createAccount: 'Create a New Account',
      defaultSeed: 'Default Seed Accounts:',
      adminLabel: 'Super Admin',
      memberLabel: 'Member',
      errorMsg: 'Authentication failed. Please verify credentials.'
    }
  }[lang];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t.errorMsg);
      }

      localStorage.setItem('trade_token', data.token);
      localStorage.setItem('trade_user', JSON.stringify(data.user));
      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-overlay">
      <div className="login-card" style={{ position: 'relative' }}>
        
        {/* Language switch on Login card */}
        <div style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '2px',
          cursor: 'pointer'
        }} onClick={() => setLang(lang === 'id' ? 'en' : 'id')}>
          <button style={{
            fontSize: '9px',
            border: 'none',
            borderRadius: '10px',
            padding: '2px 6px',
            background: lang === 'id' ? 'var(--primary-gold)' : 'transparent',
            color: lang === 'id' ? '#000' : 'var(--text-muted)',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}>
            ID
          </button>
          <button style={{
            fontSize: '9px',
            border: 'none',
            borderRadius: '10px',
            padding: '2px 6px',
            background: lang === 'en' ? 'var(--primary-gold)' : 'transparent',
            color: lang === 'en' ? '#000' : 'var(--text-muted)',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}>
            EN
          </button>
        </div>

        <div className="login-logo" style={{ marginTop: '12px' }}>
          <ShieldCheck size={26} style={{ color: 'var(--primary-gold)' }} />
          <span>BYBIT TRADE MACHINE</span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label>{t.username}</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                style={{ width: '100%', paddingLeft: '32px' }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t.placeholderUser}
                required
              />
              <UserCheck size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div className="form-group">
            <label>{t.password}</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="form-input"
                style={{ width: '100%', paddingLeft: '32px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.placeholderPass}
                required
              />
              <KeyRound size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
            </div>
          </div>

          {error && (
            <div style={{ color: 'var(--red-bybit)', fontSize: '12px', backgroundColor: 'var(--red-bybit-light)', padding: '8px', borderRadius: '4px', display: 'flex', gap: '6px', alignItems: 'center' }}>
              <AlertTriangle size={14} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '8px' }}>
            {loading ? t.auth : isRegisterMode ? t.registerBtn : t.loginBtn}
          </button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', marginTop: '4px' }}>
          <button
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setError('');
              if (!isRegisterMode) {
                setUsername('');
                setPassword('');
              } else {
                setUsername('archqi');
                setPassword('password123');
              }
            }}
            style={{ background: 'transparent', border: 'none', color: 'var(--primary-gold)', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}
          >
            {isRegisterMode ? t.backLogin : t.createAccount}
          </button>

          <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '10px', borderRadius: '6px', fontSize: '11px', color: 'var(--text-muted)', width: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: 'var(--primary-gold)', fontWeight: 600 }}>{t.defaultSeed}</span>
            <span>• {t.adminLabel}: <code>admin</code> / <code>admin</code></span>
            <span>• {t.memberLabel}: <code>archqi</code> / <code>password123</code></span>
          </div>
        </div>
      </div>
    </div>
  );
}
