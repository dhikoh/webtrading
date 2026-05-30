import React from 'react';
import { X, HelpCircle, ShieldAlert, TrendingUp, Layers } from 'lucide-react';

export default function AcademyHelp({ isOpen, onClose, lang = 'id' }) {
  if (!isOpen) return null;

  const t = {
    id: {
      title: 'Panduan Simulator Perdagangan Akademi Bybit',
      btnUnderstood: 'Saya Mengerti',
      sec1Title: '1. Mekanisme Callback Trailing Stop',
      sec1Desc: 'Trailing stop adalah pesanan dinamis yang melacak pergerakan harga suatu aset.',
      sec1Item1Label: 'Sell Stop (Take Profit Long):',
      sec1Item1Text: ' Jika harga naik, batas harga tertinggi ikut naik. Jika harga turun dari puncak tersebut sebesar ',
      sec1Item1End: ' (misal, 1%), sistem memicu order Jual Pasar.',
      sec1Item2Label: 'Buy Stop (Take Profit Short):',
      sec1Item2Text: ' Jika harga turun, batas harga terendah ikut turun. Jika harga naik dari puncak terendah tersebut sebesar ',
      sec1Item2End: ', sistem memicu order Beli Pasar.',
      sec1Benefit: 'Ini memungkinkan Anda mengunci keuntungan maksimal selama pergerakan pasar yang kuat tanpa memotong potensi keuntungan Anda terlalu cepat!',
      sec2Title: '2. Leverage dan Margin Awal Posisi',
      sec2Desc: 'Leverage memungkinkan Anda membuka posisi yang jauh lebih besar daripada saldo akun Anda yang sebenarnya.',
      sec2Item1Label: 'Formula Margin Awal:',
      sec2Item1Text: ' Margin = (Ukuran × Harga Masuk) / Leverage.',
      sec2ExampleLabel: 'Contoh:',
      sec2ExampleText: ' Membuka posisi 1 BTC Long pada harga $60.000 dengan Leverage 20x hanya membutuhkan kolateral margin terisolasi sebesar $3.000 USDT.',
      sec2ConstraintLabel: 'Batasan Saldo Tersedia:',
      sec2ConstraintText: ' Anda tidak dapat membuka posisi baru atau mentransfer dana keluar dari Dompet Futures jika hal itu membuat margin tersedia Anda turun di bawah level terkunci yang aktif.',
      sec3Title: '3. Pemeliharaan Margin & Harga Likuidasi Terisolasi',
      sec3Desc: 'Jika pasar bergerak berlawanan dengan posisi Anda, saldo margin terisolasi Anda akan berkurang karena PnL Belum Direalisasi yang berjalan.',
      sec3Item1Label: 'Persyaratan Margin Pemeliharaan (MMR):',
      sec3Item1Text: ' Dalam simulator ini, MMR ditetapkan sebesar 0,4%.',
      sec3Item2Text: 'Jika margin posisi Anda + PnL belum direalisasi turun di bawah MMR, posisi Anda akan dilikuidasi secara paksa.',
      sec3Item3Label: 'Formula Harga Likuidasi Terisolasi:',
      sec3Insurance: 'Saat dilikuidasi, margin terisolasi yang dialokasikan akan hilang ke Dana Asuransi Sistem, mencegah defisit saldo akun.'
    },
    en: {
      title: 'Bybit Academy Trading Simulator Manual',
      btnUnderstood: 'Understood',
      sec1Title: '1. Trailing Stop Callback Mechanics',
      sec1Desc: 'A trailing stop is a dynamic order that tracks the price movement of an asset.',
      sec1Item1Label: 'Sell Stop (Long Profit-Take):',
      sec1Item1Text: ' If price goes up, the watermark price rises with it. If price drops from that peak by the ',
      sec1Item1End: ' (e.g., 1%), it triggers a Market Sell order.',
      sec1Item2Label: 'Buy Stop (Short Profit-Take):',
      sec1Item2Text: ' If price falls, the watermark falls with it. If price rises from that bottom peak by the ',
      sec1Item2End: ', it triggers a Market Buy order.',
      sec1Benefit: 'This allows you to lock in maximum profits during strong market runs without cutting your gains short!',
      sec2Title: '2. Leverage and Position Initial Margin',
      sec2Desc: 'Leverage allows you to open positions much larger than your actual account balance.',
      sec2Item1Label: 'Initial Margin Formula:',
      sec2Item1Text: ' Margin = (Size × Entry Price) / Leverage.',
      sec2ExampleLabel: 'Example:',
      sec2ExampleText: ' Opening a 1 BTC Long position at $60,000 with 20x Leverage requires only $3,000 USDT of isolated margin collateral.',
      sec2ConstraintLabel: 'Available Balance Constraints:',
      sec2ConstraintText: ' You cannot open new positions or transfer funds out of your Futures Wallet if doing so drops your available margin below active locked levels.',
      sec3Title: '3. Maintenance Margin & Isolated Liquidation Price',
      sec3Desc: 'If the market moves against your position, your isolated margin balance decreases due to floating Unrealized PnL.',
      sec3Item1Label: 'Maintenance Margin Requirement (MMR):',
      sec3Item1Text: ' In this simulator, MMR is fixed at 0.4%.',
      sec3Item2Text: 'If your position\'s margin + unrealized PnL falls below MMR, your position is forcefully liquidated.',
      sec3Item3Label: 'Isolated Liquidation Price Formula:',
      sec3Insurance: 'When liquidated, the allocated isolated margin is lost to the System Insurance Fund, preventing account balance deficits.'
    }
  }[lang];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '650px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-gold)', fontWeight: 600, fontSize: '15px' }}>
            <HelpCircle size={20} />
            <span>{t.title}</span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ fontSize: '12.5px', color: 'var(--text-active)' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary-gold)', fontWeight: 600 }}>
              <TrendingUp size={16} />
              <span>{t.sec1Title}</span>
            </div>
            <p style={{ color: 'var(--text-muted)' }}>
              {t.sec1Desc}
            </p>
            <ul style={{ paddingLeft: '20px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li><strong>{t.sec1Item1Label}</strong>{t.sec1Item1Text}<strong>Callback Rate{lang === 'id' ? ' (Rasio Callback)' : ''}</strong>{t.sec1Item1End}</li>
              <li><strong>{t.sec1Item2Label}</strong>{t.sec1Item2Text}<strong>Callback Rate</strong>{t.sec1Item2End}</li>
              <li>{t.sec1Benefit}</li>
            </ul>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--green-bybit)', fontWeight: 600 }}>
              <Layers size={16} />
              <span>{t.sec2Title}</span>
            </div>
            <p style={{ color: 'var(--text-muted)' }}>
              {t.sec2Desc}
            </p>
            <ul style={{ paddingLeft: '20px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li><strong>{t.sec2Item1Label}</strong> <code style={{ color: 'var(--text-active)' }}>{t.sec2Item1Text}</code></li>
              <li><strong>{t.sec2ExampleLabel}</strong>{t.sec2ExampleText}</li>
              <li><strong>{t.sec2ConstraintLabel}</strong> {t.sec2ConstraintText}</li>
            </ul>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--red-bybit)', fontWeight: 600 }}>
              <ShieldAlert size={16} />
              <span>{t.sec3Title}</span>
            </div>
            <p style={{ color: 'var(--text-muted)' }}>
              {t.sec3Desc}
            </p>
            <ul style={{ paddingLeft: '20px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li><strong>{t.sec3Item1Label}</strong>{t.sec3Item1Text}</li>
              <li>{t.sec3Item2Text}</li>
              <li><strong>{t.sec3Item3Label}</strong></li>
              <li style={{ listStyle: 'none', margin: '6px 0', padding: '6px', backgroundColor: 'var(--bg-main)', borderRadius: '4px', fontFamily: 'monospace' }}>
                <span style={{ color: 'var(--green-bybit)' }}>Long:</span> Liq Price = (Entry Price × Size - Margin) / [Size × (1 - 0.004)]<br />
                <span style={{ color: 'var(--red-bybit)' }}>Short:</span> Liq Price = (Entry Price × Size + Margin) / [Size × (1 + 0.004)]
              </li>
              <li>{t.sec3Insurance}</li>
            </ul>
          </div>

        </div>

        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', backgroundColor: 'var(--bg-main)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
          <button className="btn-primary" onClick={onClose} style={{ padding: '8px 16px' }}>
            {t.btnUnderstood}
          </button>
        </div>
      </div>
    </div>
  );
}
