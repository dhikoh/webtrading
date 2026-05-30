import React, { useState } from 'react';
import { ShieldCheck, UserCheck, KeyRound, AlertTriangle } from 'lucide-react';
import { API_URL } from '../config.js';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('archqi');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

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
        throw new Error(data.error || 'Authentication failed. Please verify credentials.');
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
      <div className="login-card">
        <div className="login-logo">
          <ShieldCheck size={26} />
          <span>BINANCE SIMULATOR</span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label>Username</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                style={{ width: '100%', paddingLeft: '32px' }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
              />
              <UserCheck size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="form-input"
                style={{ width: '100%', paddingLeft: '32px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
              <KeyRound size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
            </div>
          </div>

          {error && (
            <div style={{ color: 'var(--red-binance)', fontSize: '12px', backgroundColor: 'var(--red-binance-light)', padding: '8px', borderRadius: '4px', display: 'flex', gap: '6px', alignItems: 'center' }}>
              <AlertTriangle size={14} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '8px' }}>
            {loading ? 'Authenticating...' : isRegisterMode ? 'Register Member' : 'Secure Login'}
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
            {isRegisterMode ? 'Back to Login' : 'Create a New Account'}
          </button>

          <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '10px', borderRadius: '6px', fontSize: '11px', color: 'var(--text-muted)', width: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: 'var(--primary-gold)', fontWeight: 600 }}>Default Seed Accounts:</span>
            <span>• Super Admin: <code>admin</code> / <code>admin</code></span>
            <span>• Member: <code>archqi</code> / <code>password123</code></span>
          </div>
        </div>
      </div>
    </div>
  );
}
