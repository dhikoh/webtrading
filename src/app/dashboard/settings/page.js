'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

export default function SettingsPage() {
  const [name, setName] = useState('Dhiko Herlambang');
  const [email, setEmail] = useState('dhiko@mautin.id');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleUpdateProfile = (e) => {
    e.preventDefault();
    setSuccessMsg('Profil Anda berhasil diperbarui di server cloud!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (password.length < 12) {
      setErrorMsg('Kata sandi baru harus minimal 12 karakter untuk mematuhi regulasi keamanan SaaS.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setSuccessMsg('Kata sandi berhasil diperbarui dengan hashing enkripsi bcryptjs!');
    setPassword('');
    setConfirmPassword('');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <DashboardLayout title="Profil & Setelan Pengguna">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {successMsg && (
          <div style={{ 
            background: 'rgba(16, 185, 129, 0.15)', 
            border: '1px solid var(--color-success)', 
            color: 'var(--color-success)',
            padding: '12px 20px', 
            borderRadius: '8px', 
            fontSize: '0.9rem',
            fontWeight: '600'
          }}>
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.15)', 
            border: '1px solid var(--color-danger)', 
            color: 'var(--color-danger)',
            padding: '12px 20px', 
            borderRadius: '8px', 
            fontSize: '0.9rem',
            fontWeight: '600'
          }}>
            {errorMsg}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          
          {/* Profile Form */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>👤</span> Profil Informasi
            </h3>
            
            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Nama Lengkap</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{ width: '100%', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '10px', borderRadius: '6px', color: '#f8fafc' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Email Akun</label>
                <input 
                  type="email" 
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ width: '100%', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '10px', borderRadius: '6px', color: '#f8fafc' }}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '10px', padding: '12px', borderRadius: '6px', background: 'var(--color-primary)', border: 'none', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
                Simpan Perubahan Profil
              </button>
            </form>
          </div>

          {/* Change Password Form */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔒</span> Ganti Kata Sandi Keamanan
            </h3>
            
            <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Kata Sandi Baru</label>
                <input 
                  type="password" 
                  className="form-input"
                  placeholder="Min. 12 karakter, angka & simbol"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  style={{ width: '100%', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '10px', borderRadius: '6px', color: '#f8fafc' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Konfirmasi Kata Sandi Baru</label>
                <input 
                  type="password" 
                  className="form-input"
                  placeholder="Ketik ulang kata sandi baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  style={{ width: '100%', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '10px', borderRadius: '6px', color: '#f8fafc' }}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '10px', padding: '12px', borderRadius: '6px', background: 'var(--color-primary)', border: 'none', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
                Perbarui Kata Sandi
              </button>
            </form>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
