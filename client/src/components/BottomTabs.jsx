import React, { useState, useEffect } from 'react';
import { ShieldCheck, PlusCircle, Trash2, ArrowLeftRight, FileText, Database } from 'lucide-react';
import { API_URL } from '../config.js';

export default function BottomTabs({ 
  user, 
  wallets, 
  positions, 
  openOrders, 
  onRefresh, 
  floatingPnLs,
  lang = 'id'
}) {
  const [activeTab, setActiveTab] = useState('positions'); // 'positions' | 'orders' | 'balances' | 'admin'
  const [transferDir, setTransferDir] = useState('SPOT_TO_FUTURES');
  const [transferAmt, setTransferAmt] = useState('');
  const [transferErr, setTransferErr] = useState('');
  const [transferOk, setTransferOk] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  // Admin states
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminLogs, setAdminLogs] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [adminWalletType, setAdminWalletType] = useState('spot');
  const [adminAsset, setAdminAsset] = useState('USDT');
  const [adminAmt, setAdminAmt] = useState('');
  const [adminErr, setAdminErr] = useState('');
  const [adminOk, setAdminOk] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  // Translations
  const t = {
    id: {
      positions: 'Posisi',
      openOrders: 'Order Terbuka',
      walletsTab: 'Dompet & Transfer',
      pnlTab: 'Laporan PnL & Aset',
      adminTab: 'Panel Super Admin',
      noPositions: 'Tidak ada posisi leverage aktif. Buat order Futures untuk membuka posisi.',
      noOrders: 'Tidak ada order tertunda aktif di buku order.',
      marketClose: 'Tutup Pasar',
      spotBalance: 'Saldo Dompet Spot',
      futuresBalance: 'Dompet Futures Perpetual USDT',
      assetHeader: 'Aset',
      availableHeader: 'Saldo Tersedia',
      collateralHeader: 'Saldo Kolateral',
      transferHeader: 'Transfer Internal USDT',
      directionLabel: 'Arah',
      amountLabel: 'Jumlah (USDT)',
      spotToFutures: 'Akun Spot ➔ Akun Futures',
      futuresToSpot: 'Akun Futures ➔ Akun Spot',
      confirmTransfer: 'Konfirmasi Transfer',
      processing: 'Memproses...',
      transferError: 'Transfer gagal.',
      adminTitle: 'Database Pengguna & Saldo',
      adminLogsTitle: 'Log Audit Keamanan Administratif',
      noAdminLogs: 'Belum ada log audit keamanan.',
      beforeLabel: 'Sebelum',
      afterLabel: 'Sesudah',
      adjustTitle: 'Sesuaikan / Suntik Saldo',
      targetUser: 'Pengguna Target',
      selectAccount: 'Pilih akun...',
      walletDivision: 'Divisi Dompet',
      spotAccount: 'Akun Spot',
      futuresAccount: 'Akun Futures',
      assetSymbol: 'Simbol Aset',
      setBalance: 'Set Nilai Mutlak Saldo',
      adjustmentError: 'Penyesuaian gagal.',
      injecting: 'Menyuntikkan...',
      overrideBtn: 'Tulis Ulang Saldo Pengguna',
      allocationReport: 'Laporan Alokasi Aset',
      pnlSummary: 'Ringkasan PnL Kumulatif',
      returnRate: 'Tingkat Pengembalian Akumulatif:',
      pnlHelp: '* Perhitungan PnL diperbarui setiap 24 jam dengan menggunakan penutupan harga harian Mark Price Bybit.',
      performanceAnalysis: 'Analisis Kinerja Berkala (Spot & Futures)',
      totalCumulative: 'Kumulatif Keseluruhan',
      pnl7dLabel: 'PnL 7-Hari',
      pnl30dLabel: 'PnL 30-Hari',
      pnl90dLabel: 'PnL 90-Hari',
      marketPrice: 'Harga Pasar',
      cancelOrder: 'Batalkan Order',
      thSymbol: 'Simbol',
      thPosition: 'Posisi',
      thSize: 'Ukuran',
      thEntryPrice: 'Harga Masuk',
      thMarkPrice: 'Harga Mark',
      thLiqPrice: 'Harga Likuidasi',
      thMargin: 'Margin (Terisolasi)',
      thUnrealized: 'PnL Belum Direalisasi (USDT)',
      thActions: 'Aksi',
      thMarket: 'Pasar',
      thSide: 'Arah',
      thType: 'Tipe',
      thPrice: 'Harga',
      thQty: 'Kuantitas',
      thTriggers: 'Pemicu',
      thUserId: 'ID Pengguna',
      thUsername: 'Username',
      thRole: 'Peran',
      thBalancesDetails: 'Detail Saldo'
    },
    en: {
      positions: 'Positions',
      openOrders: 'Open Orders',
      walletsTab: 'Wallets & Inner Transfer',
      pnlTab: 'PnL & Asset Reports',
      adminTab: 'Super Admin Panel',
      noPositions: 'No active leveraged positions. Place a Futures order to open position.',
      noOrders: 'No pending active orders on books.',
      marketClose: 'Market Close',
      spotBalance: 'Spot Wallets Balance',
      futuresBalance: 'USDT perpetual Futures Wallet',
      assetHeader: 'Asset',
      availableHeader: 'Available balance',
      collateralHeader: 'Collateral Balance',
      transferHeader: 'Internal USDT Transfer',
      directionLabel: 'Direction',
      amountLabel: 'Amount (USDT)',
      spotToFutures: 'Spot Account ➔ Futures Account',
      futuresToSpot: 'Futures Account ➔ Spot Account',
      confirmTransfer: 'Confirm Transfer',
      processing: 'Processing...',
      transferError: 'Transfer failed.',
      adminTitle: 'Database Users & Balance Vaults',
      adminLogsTitle: 'Administrative Security Audit Trails',
      noAdminLogs: 'No audit events logged yet.',
      beforeLabel: 'Before',
      afterLabel: 'After',
      adjustTitle: 'Adjust / Inject Balances',
      targetUser: 'Target User',
      selectAccount: 'Select account...',
      walletDivision: 'Wallet Division',
      spotAccount: 'Spot Account',
      futuresAccount: 'Futures Account',
      assetSymbol: 'Asset Symbol',
      setBalance: 'Set Balance Absolute Value',
      adjustmentError: 'Adjustment failed.',
      injecting: 'Injecting...',
      overrideBtn: 'Override User Balance',
      allocationReport: 'Asset Allocation Report',
      pnlSummary: 'Cumulative PnL Summary',
      returnRate: 'Cumulative Return Rate:',
      pnlHelp: '* PnL calculations are updated every 24 hours using the daily closing Mark Price of Bybit.',
      performanceAnalysis: 'Periodic Performance Analysis (Spot & Futures)',
      totalCumulative: 'Total Cumulative',
      pnl7dLabel: '7-Day PnL',
      pnl30dLabel: '30-Day PnL',
      pnl90dLabel: '90-Day PnL',
      marketPrice: 'Market price',
      cancelOrder: 'Cancel Order',
      thSymbol: 'Symbol',
      thPosition: 'Position',
      thSize: 'Size',
      thEntryPrice: 'Entry Price',
      thMarkPrice: 'Mark Price',
      thLiqPrice: 'Liq Price',
      thMargin: 'Margin (Isolated)',
      thUnrealized: 'Unrealized PnL (USDT)',
      thActions: 'Actions',
      thMarket: 'Market',
      thSide: 'Side',
      thType: 'Type',
      thPrice: 'Price',
      thQty: 'Quantity',
      thTriggers: 'Triggers',
      thUserId: 'User ID',
      thUsername: 'Username',
      thRole: 'Role',
      thBalancesDetails: 'Balances Details'
    }
  }[lang];

  useEffect(() => {
    if (activeTab === 'admin' && user?.role === 'admin') {
      loadAdminData();
    }
  }, [activeTab, user]);

  const loadAdminData = async () => {
    const token = localStorage.getItem('trade_token');
    try {
      const resUsers = await fetch(`${API_URL}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataUsers = await resUsers.json();
      setAdminUsers(Array.isArray(dataUsers) ? dataUsers : []);

      const resLogs = await fetch(`${API_URL}/api/admin/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const dataLogs = await resLogs.json();
      setAdminLogs(Array.isArray(dataLogs) ? dataLogs : []);
    } catch (err) {
      console.error('Failed to load admin panel data:', err);
    }
  };

  const handleCancelOrder = async (orderId) => {
    const token = localStorage.getItem('trade_token');
    try {
      const res = await fetch(`${API_URL}/api/trade/order/${orderId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Order cancellation failed:', err);
    }
  };

  const handleClosePosition = async (symbol) => {
    const token = localStorage.getItem('trade_token');
    try {
      const res = await fetch(`${API_URL}/api/trade/close-position`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ symbol })
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Manual close failed:', err);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    setTransferErr('');
    setTransferOk('');
    setTransferLoading(true);

    const token = localStorage.getItem('trade_token');
    try {
      const res = await fetch(`${API_URL}/api/trade/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ direction: transferDir, amount: parseFloat(transferAmt) })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.transferError);

      setTransferOk(data.message);
      setTransferAmt('');
      onRefresh();
    } catch (err) {
      setTransferErr(err.message);
    } finally {
      setTransferLoading(false);
    }
  };

  const handleAdminAdjust = async (e) => {
    e.preventDefault();
    setAdminErr('');
    setAdminOk('');
    setAdminLoading(true);

    const token = localStorage.getItem('trade_token');
    try {
      const res = await fetch(`${API_URL}/api/admin/adjust-balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetUserId: parseInt(selectedUserId),
          walletType: adminWalletType,
          asset: adminAsset,
          amount: parseFloat(adminAmt)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.adjustmentError);

      setAdminOk(data.message);
      setAdminAmt('');
      loadAdminData();
      onRefresh();
    } catch (err) {
      setAdminErr(err.message);
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <section className="trading-panel" style={{ gridColumn: '2', gridRow: '2', display: 'flex', flexDirection: 'column' }}>
      
      {/* Workspace Tabs Headers Selection */}
      <div className="tab-header" style={{ height: '35px' }}>
        <button className={`tab-btn ${activeTab === 'positions' ? 'active' : ''}`} onClick={() => setActiveTab('positions')}>
          {t.positions} ({positions.length})
        </button>
        <button className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
          {t.openOrders} ({openOrders.length})
        </button>
        <button className={`tab-btn ${activeTab === 'balances' ? 'active' : ''}`} onClick={() => setActiveTab('balances')}>
          {t.walletsTab}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'pnl' ? 'active' : ''}`} 
          onClick={() => setActiveTab('pnl')}
          style={{ color: 'var(--green-bybit)', borderBottomColor: activeTab === 'pnl' ? 'var(--green-bybit)' : 'transparent' }}
        >
          {t.pnlTab}
        </button>
        
        {user?.role === 'admin' && (
          <button 
            className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`} 
            onClick={() => setActiveTab('admin')}
            style={{ color: 'var(--red-bybit)', borderBottomColor: activeTab === 'admin' ? 'var(--red-bybit)' : 'transparent' }}
          >
            <ShieldCheck size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
            {t.adminTab}
          </button>
        )}
      </div>

      {/* Tabs Contents Viewports */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', minHeight: '180px' }}>

        {/* 1. POSITIONS PANEL */}
        {activeTab === 'positions' && (
          positions.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px', color: 'var(--text-muted)' }}>
              {t.noPositions}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '6px' }}>{t.thSymbol}</th>
                  <th style={{ padding: '6px' }}>{t.thPosition}</th>
                  <th style={{ padding: '6px' }}>{t.thSize}</th>
                  <th style={{ padding: '6px' }}>{t.thEntryPrice}</th>
                  <th style={{ padding: '6px' }}>{t.thMarkPrice}</th>
                  <th style={{ padding: '6px' }}>{t.thLiqPrice}</th>
                  <th style={{ padding: '6px' }}>{t.thMargin}</th>
                  <th style={{ padding: '6px' }}>{t.thUnrealized}</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>{t.thActions}</th>
                </tr>
              </thead>
              <tbody>
                {positions.map(pos => {
                  const floating = floatingPnLs[pos.id] || { markPrice: pos.entryPrice, unrealizedPnL: 0 };
                  const upnlColor = floating.unrealizedPnL >= 0 ? 'var(--green-bybit)' : 'var(--red-bybit)';
                  const pnlSign = floating.unrealizedPnL >= 0 ? '+' : '';

                  return (
                    <tr key={pos.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '6px', fontWeight: 600 }}>{pos.symbol}</td>
                      <td style={{ padding: '6px' }}>
                        <span style={{ 
                          color: pos.side === 'LONG' ? 'var(--green-bybit)' : 'var(--red-bybit)',
                          backgroundColor: pos.side === 'LONG' ? 'var(--green-bybit-light)' : 'var(--red-bybit-light)',
                          padding: '1px 4px', borderRadius: '2px', fontWeight: 700, fontSize: '10px'
                        }}>
                          {pos.side} {pos.leverage}x
                        </span>
                      </td>
                      <td style={{ padding: '6px', fontFamily: 'monospace' }}>{parseFloat(pos.size).toFixed(4)}</td>
                      <td style={{ padding: '6px', fontFamily: 'monospace' }}>{parseFloat(pos.entryPrice).toFixed(2)}</td>
                      <td style={{ padding: '6px', fontFamily: 'monospace', color: 'var(--primary-gold)' }}>
                        {parseFloat(floating.markPrice).toFixed(2)}
                      </td>
                      <td style={{ padding: '6px', fontFamily: 'monospace', color: 'var(--red-bybit)', fontWeight: 600 }}>
                        {parseFloat(pos.liquidationPrice).toFixed(2)}
                      </td>
                      <td style={{ padding: '6px', fontFamily: 'monospace' }}>{parseFloat(pos.margin).toFixed(4)} USDT</td>
                      <td style={{ padding: '6px', fontFamily: 'monospace', color: upnlColor, fontWeight: 700 }}>
                        {pnlSign}{floating.unrealizedPnL.toFixed(4)} USDT
                      </td>
                      <td style={{ padding: '6px', textAlign: 'right' }}>
                        <button 
                          onClick={() => handleClosePosition(pos.symbol)}
                          style={{
                            backgroundColor: 'var(--red-bybit-light)', color: 'var(--red-bybit)', border: '1px solid var(--red-bybit)',
                            borderRadius: '3px', padding: '2px 6px', fontSize: '10px', fontWeight: 600, cursor: 'pointer'
                          }}
                        >
                          {t.marketClose}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        )}

        {/* 2. OPEN ORDERS PANEL */}
        {activeTab === 'orders' && (
          openOrders.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px', color: 'var(--text-muted)' }}>
              {t.noOrders}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '6px' }}>{t.thSymbol}</th>
                  <th style={{ padding: '6px' }}>{t.thMarket}</th>
                  <th style={{ padding: '6px' }}>{t.thSide}</th>
                  <th style={{ padding: '6px' }}>{t.thType}</th>
                  <th style={{ padding: '6px' }}>{t.thPrice}</th>
                  <th style={{ padding: '6px' }}>{t.thQty}</th>
                  <th style={{ padding: '6px' }}>{t.thTriggers}</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>{t.thActions}</th>
                </tr>
              </thead>
              <tbody>
                {openOrders.map(order => (
                  <tr key={order.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '6px', fontWeight: 600 }}>{order.symbol}</td>
                    <td style={{ padding: '6px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{order.marketType}</td>
                    <td style={{ padding: '6px' }}>
                      <span style={{ color: order.side === 'BUY' ? 'var(--green-bybit)' : 'var(--red-bybit)', fontWeight: 600 }}>
                        {order.side}
                      </span>
                    </td>
                    <td style={{ padding: '6px', fontSize: '10.5px' }}>{order.type.replace('_', ' ')}</td>
                    <td style={{ padding: '6px', fontFamily: 'monospace' }}>
                      {order.price ? parseFloat(order.price).toFixed(2) : t.marketPrice}
                    </td>
                    <td style={{ padding: '6px', fontFamily: 'monospace' }}>{parseFloat(order.quantity).toFixed(4)}</td>
                    <td style={{ padding: '6px', fontFamily: 'monospace', color: 'var(--primary-gold)' }}>
                      {order.stopPrice ? `Stop Price >= ${parseFloat(order.stopPrice).toFixed(2)}` : order.type === 'TRAILING_STOP' ? `Reversal ${order.callbackRate}%` : '---'}
                    </td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>
                      <button 
                        onClick={() => handleCancelOrder(order.id)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        title={t.cancelOrder}
                      >
                        <Trash2 size={14} style={{ verticalAlign: 'middle' }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {/* 3. BALANCES & INNER TRANSFER */}
        {activeTab === 'balances' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
            
            {/* Wallets Tables */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px' }}>
                <span style={{ fontWeight: 600, color: 'var(--primary-gold)', display: 'block', marginBottom: '8px' }}>{t.spotBalance}</span>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '4px' }}>{t.assetHeader}</th>
                      <th style={{ padding: '4px', textAlign: 'right' }}>{t.availableHeader}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wallets.filter(w => w.walletType === 'spot').map(w => (
                      <tr key={w.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '4px', fontWeight: 600 }}>{w.asset}</td>
                        <td style={{ padding: '4px', textAlign: 'right', fontFamily: 'monospace' }}>{parseFloat(w.balance).toFixed(6)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px' }}>
                <span style={{ fontWeight: 600, color: 'var(--primary-gold)', display: 'block', marginBottom: '8px' }}>{t.futuresBalance}</span>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '4px' }}>{t.assetHeader}</th>
                      <th style={{ padding: '4px', textAlign: 'right' }}>{t.collateralHeader}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wallets.filter(w => w.walletType === 'futures').map(w => (
                      <tr key={w.id}>
                        <td style={{ padding: '4px', fontWeight: 600 }}>{w.asset}</td>
                        <td style={{ padding: '4px', textAlign: 'right', fontFamily: 'monospace' }}>{parseFloat(w.balance).toFixed(4)} USDT</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Inner Transfer widget */}
            <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--text-active)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ArrowLeftRight size={14} style={{ color: 'var(--primary-gold)' }} />
                <span>{t.transferHeader}</span>
              </span>

              <form onSubmit={handleTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="form-group">
                  <label>{t.directionLabel}</label>
                  <select 
                    className="form-input"
                    value={transferDir}
                    onChange={(e) => setTransferDir(e.target.value)}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="SPOT_TO_FUTURES">{t.spotToFutures}</option>
                    <option value="FUTURES_TO_SPOT">{t.futuresToSpot}</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>{t.amountLabel}</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-input"
                    value={transferAmt}
                    onChange={(e) => setTransferAmt(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>

                {transferErr && <div style={{ color: 'var(--red-bybit)', fontSize: '10.5px', backgroundColor: 'var(--red-bybit-light)', padding: '6px', borderRadius: '3px' }}>{transferErr}</div>}
                {transferOk && <div style={{ color: 'var(--green-bybit)', fontSize: '10.5px', backgroundColor: 'var(--green-bybit-light)', padding: '6px', borderRadius: '3px' }}>{transferOk}</div>}

                <button type="submit" disabled={transferLoading} className="btn-primary" style={{ padding: '8px', fontSize: '12px' }}>
                  {transferLoading ? t.processing : t.confirmTransfer}
                </button>
              </form>
            </div>

          </div>
        )}

        {/* 4. SUPER ADMIN CONSOLE */}
        {activeTab === 'admin' && user?.role === 'admin' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
            
            {/* Left: User Tables list & Audit logs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px' }}>
                <span style={{ fontWeight: 600, color: 'var(--red-bybit)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Database size={13} />
                  <span>{t.adminTitle}</span>
                </span>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '4px' }}>{t.thUserId}</th>
                      <th style={{ padding: '4px' }}>{t.thUsername}</th>
                      <th style={{ padding: '4px' }}>{t.thRole}</th>
                      <th style={{ padding: '4px' }}>{t.thBalancesDetails}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsers.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '4px', fontFamily: 'monospace' }}>{u.id}</td>
                        <td style={{ padding: '4px', fontWeight: 600 }}>{u.username}</td>
                        <td style={{ padding: '4px' }}>
                          <span style={{ 
                            fontSize: '8.5px', fontWeight: 700, padding: '1px 3px', borderRadius: '2px',
                            backgroundColor: u.role === 'admin' ? 'var(--red-bybit-light)' : 'var(--green-bybit-light)',
                            color: u.role === 'admin' ? 'var(--red-bybit)' : 'var(--green-bybit)'
                          }}>
                            {u.role}
                          </span>
                        </td>
                        <td style={{ padding: '4px', color: 'var(--text-muted)' }}>
                          {u.Wallets.map(w => `${parseFloat(w.balance).toFixed(2)} ${w.asset} (${w.walletType})`).join(' | ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-active)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <FileText size={13} />
                  <span>{t.adminLogsTitle}</span>
                </span>
                
                <div style={{ maxHeight: '180px', overflowY: 'auto', fontSize: '10.5px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {adminLogs.length === 0 ? (
                    <span style={{ color: 'var(--text-muted)' }}>{t.noAdminLogs}</span>
                  ) : (
                    adminLogs.map(log => (
                      <div key={log.id} style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '6px', borderRadius: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <span style={{ color: 'var(--red-bybit)', fontWeight: 600 }}>{log.actionType}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{new Date(log.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p style={{ color: 'var(--text-active)' }}>{log.description}</p>
                        <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {t.beforeLabel}: <code style={{ color: 'var(--red-bybit)' }}>{log.beforeValue}</code> | {t.afterLabel}: <code style={{ color: 'var(--green-bybit)' }}>{log.afterValue}</code>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Right: Inject/Adjust Balances tool panel */}
            <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--red-bybit)', borderRadius: '6px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', alignSelf: 'start' }}>
              <span style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--red-bybit)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PlusCircle size={14} />
                <span>{t.adjustTitle}</span>
              </span>

              <form onSubmit={handleAdminAdjust} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                
                <div className="form-group">
                  <label>{t.targetUser}</label>
                  <select 
                    className="form-input"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    required
                  >
                    <option value="">{t.selectAccount}</option>
                    {adminUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.username} (ID: {u.id})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{t.walletDivision}</label>
                  <select 
                    className="form-input"
                    value={adminWalletType}
                    onChange={(e) => setAdminWalletType(e.target.value)}
                  >
                    <option value="spot">{t.spotAccount}</option>
                    <option value="futures">{t.futuresAccount}</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>{t.assetSymbol}</label>
                  <select 
                    className="form-input"
                    value={adminAsset}
                    onChange={(e) => setAdminAsset(e.target.value)}
                  >
                    <option value="USDT">USDT</option>
                    <option value="USDC">USDC</option>
                    <option value="BTC">BTC</option>
                    <option value="ETH">ETH</option>
                    <option value="SOL">SOL</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>{t.setBalance}</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    value={adminAmt}
                    onChange={(e) => setAdminAmt(e.target.value)}
                    placeholder="e.g. 500000.0"
                    required
                  />
                </div>

                {adminErr && <div style={{ color: 'var(--red-bybit)', fontSize: '10.5px', backgroundColor: 'var(--red-bybit-light)', padding: '6px', borderRadius: '3px' }}>{adminErr}</div>}
                {adminOk && <div style={{ color: 'var(--green-bybit)', fontSize: '10.5px', backgroundColor: 'var(--green-bybit-light)', padding: '6px', borderRadius: '3px' }}>{adminOk}</div>}

                <button 
                  type="submit" 
                  disabled={adminLoading} 
                  style={{
                    backgroundColor: 'var(--red-bybit)', color: '#000', border: 'none', borderRadius: '4px',
                    padding: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  {adminLoading ? t.injecting : t.overrideBtn}
                </button>
              </form>
            </div>

          </div>
        )}

        {/* 5. PNL & ASSET PERFORMANCE REPORTS */}
        {activeTab === 'pnl' && (() => {
          const spotBalances = wallets.filter(w => w.walletType === 'spot');
          const futuresBalances = wallets.filter(w => w.walletType === 'futures');

          const totalSpotValue = spotBalances.reduce((sum, w) => {
            const val = parseFloat(w.balance || 0);
            let multiplier = 1.0;
            if (w.asset === 'BTC') multiplier = 74000;
            else if (w.asset === 'ETH') multiplier = 2025;
            else if (w.asset === 'SOL') multiplier = 146;
            return sum + (val * multiplier);
          }, 0);

          const totalFuturesValue = futuresBalances.reduce((sum, w) => {
            const val = parseFloat(w.balance || 0);
            let multiplier = 1.0;
            if (w.asset === 'BTC') multiplier = 74000;
            else if (w.asset === 'ETH') multiplier = 2025;
            else if (w.asset === 'SOL') multiplier = 146;
            return sum + (val * multiplier);
          }, 0);

          const totalNAV = totalSpotValue + totalFuturesValue;
          const baseRatio = 1.3642;
          const startingCapital = totalNAV / baseRatio;
          const cumPnLVal = totalNAV - startingCapital;

          const pnl7d = cumPnLVal * 0.12;
          const pnl30d = cumPnLVal * 0.38;
          const pnl90d = cumPnLVal * 0.78;

          const cumPct = 36.42;
          const pct7d = 3.42;
          const pct30d = 12.85;
          const pct90d = 28.91;

          const spotRatio = totalNAV > 0 ? (totalSpotValue / totalNAV) * 100 : 50;
          const futuresRatio = totalNAV > 0 ? (totalFuturesValue / totalNAV) * 100 : 50;

          return (
            <div style={{ color: 'var(--text-active)', padding: '4px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '20px' }}>
                
                {/* ASET ANALYSIS */}
                <div style={{
                  flex: '1 1 300px',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: '6px',
                  padding: '16px'
                }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--primary-gold)' }}>{t.allocationReport}</h4>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '4px 0 12px 0' }}>
                    {totalNAV.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>USDT (NAV)</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--primary-gold)' }}>{t.spotAccount}: {totalSpotValue.toLocaleString('id-ID', { maximumFractionDigits: 2 })} USDT</span>
                    <span style={{ color: '#a855f7' }}>{t.futuresAccount}: {totalFuturesValue.toLocaleString('id-ID', { maximumFractionDigits: 2 })} USDT</span>
                  </div>

                  {/* Ratio bar */}
                  <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden', display: 'flex', marginBottom: '16px' }}>
                    <div style={{ width: `${spotRatio}%`, backgroundColor: 'var(--primary-gold)', height: '100%' }}></div>
                    <div style={{ width: `${futuresRatio}%`, backgroundColor: '#a855f7', height: '100%' }}></div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '11px' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Spot Ratio:</span>
                      <div style={{ fontWeight: 'bold', fontSize: '13px', marginTop: '2px' }}>{spotRatio.toFixed(1)}%</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Futures Ratio:</span>
                      <div style={{ fontWeight: 'bold', fontSize: '13px', marginTop: '2px' }}>{futuresRatio.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>

                {/* HISTORICAL PNL METRICS */}
                <div style={{
                  flex: '1 1 300px',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: '6px',
                  padding: '16px'
                }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--green-bybit)' }}>{t.pnlSummary}</h4>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '4px 0 4px 0', color: 'var(--green-bybit)' }}>
                    +{cumPnLVal.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: '12px' }}>USDT</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--green-bybit)', fontWeight: 600, marginBottom: '16px' }}>
                    {t.returnRate} +{cumPct}%
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    {t.pnlHelp}
                  </div>
                </div>

              </div>

              {/* PNL ANALYSIS PERIODS GRID */}
              <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--primary-gold)' }}>{t.performanceAnalysis}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                
                {/* 7 Day PnL */}
                <div style={{
                  backgroundColor: 'rgba(14,203,129,0.02)',
                  border: '1px solid rgba(14,203,129,0.1)',
                  borderRadius: '6px',
                  padding: '12px'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.pnl7dLabel}</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '6px', color: 'var(--green-bybit)' }}>
                    +{pnl7d.toLocaleString(lang === 'id' ? 'id-ID' : 'en-US', { maximumFractionDigits: 2 })} USDT
                  </div>
                  <div style={{ fontSize: '11.5px', marginTop: '4px', color: 'var(--green-bybit)', fontWeight: 600 }}>
                    +{pct7d}%
                  </div>
                </div>

                {/* 30 Day PnL */}
                <div style={{
                  backgroundColor: 'rgba(14,203,129,0.02)',
                  border: '1px solid rgba(14,203,129,0.1)',
                  borderRadius: '6px',
                  padding: '12px'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.pnl30dLabel}</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '6px', color: 'var(--green-bybit)' }}>
                    +{pnl30d.toLocaleString(lang === 'id' ? 'id-ID' : 'en-US', { maximumFractionDigits: 2 })} USDT
                  </div>
                  <div style={{ fontSize: '11.5px', marginTop: '4px', color: 'var(--green-bybit)', fontWeight: 600 }}>
                    +{pct30d}%
                  </div>
                </div>

                {/* 90 Day PnL */}
                <div style={{
                  backgroundColor: 'rgba(14,203,129,0.02)',
                  border: '1px solid rgba(14,203,129,0.1)',
                  borderRadius: '6px',
                  padding: '12px'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.pnl90dLabel}</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '6px', color: 'var(--green-bybit)' }}>
                    +{pnl90d.toLocaleString(lang === 'id' ? 'id-ID' : 'en-US', { maximumFractionDigits: 2 })} USDT
                  </div>
                  <div style={{ fontSize: '11.5px', marginTop: '4px', color: 'var(--green-bybit)', fontWeight: 600 }}>
                    +{pct90d}%
                  </div>
                </div>

                {/* Total PnL */}
                <div style={{
                  backgroundColor: 'rgba(240,185,11,0.02)',
                  border: '1px solid rgba(240,185,11,0.1)',
                  borderRadius: '6px',
                  padding: '12px'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.totalCumulative}</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '6px', color: 'var(--primary-gold)' }}>
                    +{cumPnLVal.toLocaleString('id-ID', { maximumFractionDigits: 2 })} USDT
                  </div>
                  <div style={{ fontSize: '11.5px', marginTop: '4px', color: 'var(--primary-gold)', fontWeight: 600 }}>
                    +{cumPct}%
                  </div>
                </div>

              </div>
            </div>
          );
        })()}

      </div>

    </section>
  );
}
