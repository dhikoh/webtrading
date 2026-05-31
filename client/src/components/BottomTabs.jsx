import React, { useState, useEffect } from 'react';
import { ShieldCheck, PlusCircle, Trash2, ArrowLeftRight, FileText, Database, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { API_URL } from '../config.js';

export default function BottomTabs({ 
  user, 
  wallets, 
  positions, 
  openOrders, 
  onRefresh, 
  floatingPnLs,
  lang = 'id',
  priceCache = {},
  activeSymbol = 'BTCUSDT',
  marketType = 'spot'
}) {
  const [activeTab, setActiveTab] = useState('positions'); // 'positions' | 'orders' | 'balances' | 'admin' | 'guardian'
  const [transferDir, setTransferDir] = useState('SPOT_TO_FUTURES');
  const [transferAmt, setTransferAmt] = useState('');
  const [transferErr, setTransferErr] = useState('');
  const [transferOk, setTransferOk] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  // AI Guardian states
  const [guardianData, setGuardianData] = useState(null);
  const [guardianLoading, setGuardianLoading] = useState(false);
  const [guardianTimeframe, setGuardianTimeframe] = useState('1d');

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

  // Trade History states
  const [tradeHistory, setTradeHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Translations
  const t = {
    id: {
      guardianTab: 'AI Guardian DSS',
      timeframeLabel: 'Kerangka Waktu',
      trendTitle: 'Tren',
      momentumTitle: 'Momentum',
      volumeTitle: 'Volume',
      volatilityTitle: 'Volatilitas',
      winrateTitle: 'Winrate Historis',
      confidenceLabel: 'Tingkat Keyakinan',
      safetyEngine: 'Safety Engine',
      riskRewardRatio: 'Rasio Risk Reward',
      analyzing: 'Menganalisis data pasar...',
      noData: 'Data analisis tidak tersedia.',
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
      thBalancesDetails: 'Detail Saldo',
      historyTab: 'Riwayat Trade',
      noHistory: 'Belum ada riwayat trading.',
      thTime: 'Waktu',
      thRealizedPnL: 'PnL Terealisasi',
      thTradeType: 'Tipe Pasar'
    },
    en: {
      guardianTab: 'AI Guardian DSS',
      timeframeLabel: 'Timeframe',
      trendTitle: 'Trend',
      momentumTitle: 'Momentum',
      volumeTitle: 'Volume',
      volatilityTitle: 'Volatility',
      winrateTitle: 'Historical Winrate',
      confidenceLabel: 'Confidence Level',
      safetyEngine: 'Safety Engine',
      riskRewardRatio: 'Risk Reward Ratio',
      analyzing: 'Analyzing market data...',
      noData: 'Analysis data unavailable.',
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
      thBalancesDetails: 'Balances Details',
      historyTab: 'Trade History',
      noHistory: 'No trade history yet.',
      thTime: 'Time',
      thRealizedPnL: 'Realized PnL',
      thTradeType: 'Market Type'
    }
  }[lang];

  const loadGuardianAnalysis = async () => {
    if (!activeSymbol) return;
    setGuardianLoading(true);
    const token = localStorage.getItem('trade_token');
    try {
      const res = await fetch(`${API_URL}/api/market/guardian-analysis?symbol=${activeSymbol}&marketType=${marketType}&interval=${guardianTimeframe}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGuardianData(data);
      } else {
        setGuardianData(null);
      }
    } catch (err) {
      console.error('Failed to load guardian analysis:', err);
      setGuardianData(null);
    } finally {
      setGuardianLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'guardian') {
      loadGuardianAnalysis();
    }
  }, [activeTab, activeSymbol, marketType, guardianTimeframe]);

  useEffect(() => {
    if (activeTab === 'admin' && user?.role === 'admin') {
      loadAdminData();
    }
    if (activeTab === 'history') {
      loadTradeHistory();
    }
  }, [activeTab, user]);

  // Helper to get live price for an asset from priceCache
  const getAssetPrice = (asset) => {
    const sym = `${asset}USDT`;
    if (priceCache[sym] && priceCache[sym].price) return priceCache[sym].price;
    return 0;
  };

  const loadTradeHistory = async () => {
    const token = localStorage.getItem('trade_token');
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/trade/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setTradeHistory(Array.isArray(data) ? data : (data.trades || []));
    } catch (err) {
      console.error('Failed to load trade history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

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
        <button 
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} 
          onClick={() => setActiveTab('history')}
        >
          <FileText size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
          {t.historyTab}
        </button>

        <button 
          className={`tab-btn ${activeTab === 'guardian' ? 'active' : ''}`} 
          onClick={() => setActiveTab('guardian')}
          style={{ color: 'var(--primary-gold)', borderBottomColor: activeTab === 'guardian' ? 'var(--primary-gold)' : 'transparent' }}
        >
          <ShieldCheck size={12} style={{ color: 'var(--primary-gold)', display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
          {t.guardianTab}
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

        {/* 5. TRADE HISTORY */}
        {activeTab === 'history' && (
          historyLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading...</div>
          ) : tradeHistory.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px', color: 'var(--text-muted)' }}>{t.noHistory}</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '6px', textAlign: 'left' }}>{t.thTime}</th>
                    <th style={{ padding: '6px', textAlign: 'left' }}>{t.thSymbol}</th>
                    <th style={{ padding: '6px', textAlign: 'left' }}>{t.thTradeType}</th>
                    <th style={{ padding: '6px', textAlign: 'left' }}>{t.thSide}</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>{t.thPrice}</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>{t.thQty}</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>{t.thRealizedPnL}</th>
                  </tr>
                </thead>
                <tbody>
                  {tradeHistory.map((trade, idx) => {
                    const pnl = parseFloat(trade.realizedPnL || 0);
                    const pnlColor = pnl > 0 ? 'var(--green-bybit)' : pnl < 0 ? 'var(--red-bybit)' : 'var(--text-muted)';
                    const sideColor = trade.side === 'BUY' ? 'var(--green-bybit)' : 'var(--red-bybit)';
                    return (
                      <tr key={trade.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '6px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {new Date(trade.createdAt).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '6px', fontWeight: 600, color: 'var(--text-active)' }}>{trade.symbol}</td>
                        <td style={{ padding: '6px' }}>
                          <span style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '2px', backgroundColor: trade.tradeType === 'FUTURES' ? 'rgba(168,85,247,0.15)' : 'rgba(240,185,11,0.15)', color: trade.tradeType === 'FUTURES' ? '#a855f7' : 'var(--primary-gold)', fontWeight: 700 }}>
                            {trade.tradeType}
                          </span>
                        </td>
                        <td style={{ padding: '6px', fontWeight: 600, color: sideColor }}>{trade.side}</td>
                        <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{parseFloat(trade.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace' }}>{parseFloat(trade.quantity).toFixed(4)}</td>
                        <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', color: pnlColor, fontWeight: 600 }}>
                          {pnl > 0 ? '+' : ''}{pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} USDT
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* 6. PNL & ASSET PERFORMANCE REPORTS */}
        {activeTab === 'pnl' && (() => {
          const spotBalances = wallets.filter(w => w.walletType === 'spot');
          const futuresBalances = wallets.filter(w => w.walletType === 'futures');

          const totalSpotValue = spotBalances.reduce((sum, w) => {
            const val = parseFloat(w.balance || 0);
            if (w.asset === 'USDT' || w.asset === 'USDC') return sum + val;
            return sum + (val * getAssetPrice(w.asset));
          }, 0);

          const totalFuturesValue = futuresBalances.reduce((sum, w) => {
            const val = parseFloat(w.balance || 0);
            if (w.asset === 'USDT' || w.asset === 'USDC') return sum + val;
            return sum + (val * getAssetPrice(w.asset));
          }, 0);

          const totalNAV = totalSpotValue + totalFuturesValue;

          // Calculate real PnL from trade history
          const now = Date.now();
          const ms7d = 7 * 24 * 60 * 60 * 1000;
          const ms30d = 30 * 24 * 60 * 60 * 1000;
          const ms90d = 90 * 24 * 60 * 60 * 1000;

          const computePnL = (trades, sinceDays) => {
            const cutoff = now - sinceDays;
            return trades.filter(tr => new Date(tr.createdAt).getTime() >= cutoff)
              .reduce((sum, tr) => sum + parseFloat(tr.realizedPnL || 0), 0);
          };

          const allTrades = tradeHistory || [];
          const cumPnLVal = allTrades.reduce((sum, tr) => sum + parseFloat(tr.realizedPnL || 0), 0);
          const pnl7d = computePnL(allTrades, ms7d);
          const pnl30d = computePnL(allTrades, ms30d);
          const pnl90d = computePnL(allTrades, ms90d);

          const initialCapital = totalNAV - cumPnLVal;
          const cumPct = initialCapital > 0 ? ((cumPnLVal / initialCapital) * 100).toFixed(2) : '0.00';
          const pct7d = initialCapital > 0 ? ((pnl7d / initialCapital) * 100).toFixed(2) : '0.00';
          const pct30d = initialCapital > 0 ? ((pnl30d / initialCapital) * 100).toFixed(2) : '0.00';
          const pct90d = initialCapital > 0 ? ((pnl90d / initialCapital) * 100).toFixed(2) : '0.00';

          const spotRatio = totalNAV > 0 ? (totalSpotValue / totalNAV) * 100 : 50;
          const futuresRatio = totalNAV > 0 ? (totalFuturesValue / totalNAV) * 100 : 50;

          const fmtPnL = (val) => {
            const s = val >= 0 ? '+' : '';
            return { sign: s, color: val >= 0 ? 'var(--green-bybit)' : 'var(--red-bybit)', text: `${s}${val.toLocaleString('en-US', { maximumFractionDigits: 2 })}` };
          };

          return (
            <div style={{ color: 'var(--text-active)', padding: '4px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '20px' }}>
                
                <div style={{ flex: '1 1 300px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--primary-gold)' }}>{t.allocationReport}</h4>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '4px 0 12px 0' }}>
                    {totalNAV.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>USDT (NAV)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--primary-gold)' }}>{t.spotAccount}: {totalSpotValue.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDT</span>
                    <span style={{ color: '#a855f7' }}>{t.futuresAccount}: {totalFuturesValue.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDT</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden', display: 'flex', marginBottom: '16px' }}>
                    <div style={{ width: `${spotRatio}%`, backgroundColor: 'var(--primary-gold)', height: '100%' }}></div>
                    <div style={{ width: `${futuresRatio}%`, backgroundColor: '#a855f7', height: '100%' }}></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '11px' }}>
                    <div><span style={{ color: 'var(--text-muted)' }}>Spot Ratio:</span><div style={{ fontWeight: 'bold', fontSize: '13px', marginTop: '2px' }}>{spotRatio.toFixed(1)}%</div></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Futures Ratio:</span><div style={{ fontWeight: 'bold', fontSize: '13px', marginTop: '2px' }}>{futuresRatio.toFixed(1)}%</div></div>
                  </div>
                </div>

                <div style={{ flex: '1 1 300px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: fmtPnL(cumPnLVal).color }}>{t.pnlSummary}</h4>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '4px 0 4px 0', color: fmtPnL(cumPnLVal).color }}>
                    {fmtPnL(cumPnLVal).text} <span style={{ fontSize: '12px' }}>USDT</span>
                  </div>
                  <div style={{ fontSize: '12px', color: fmtPnL(cumPnLVal).color, fontWeight: 600, marginBottom: '16px' }}>
                    {t.returnRate} {cumPnLVal >= 0 ? '+' : ''}{cumPct}%
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.5' }}>{t.pnlHelp}</div>
                </div>

              </div>

              <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--primary-gold)' }}>{t.performanceAnalysis}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                {[
                  { label: t.pnl7dLabel, val: pnl7d, pct: pct7d },
                  { label: t.pnl30dLabel, val: pnl30d, pct: pct30d },
                  { label: t.pnl90dLabel, val: pnl90d, pct: pct90d },
                  { label: t.totalCumulative, val: cumPnLVal, pct: cumPct, isGold: true }
                ].map((item, idx) => {
                  const f = fmtPnL(item.val);
                  const borderColor = item.isGold ? 'rgba(240,185,11,0.1)' : (item.val >= 0 ? 'rgba(14,203,129,0.1)' : 'rgba(234,57,67,0.1)');
                  const bgColor = item.isGold ? 'rgba(240,185,11,0.02)' : (item.val >= 0 ? 'rgba(14,203,129,0.02)' : 'rgba(234,57,67,0.02)');
                  const tc = item.isGold ? 'var(--primary-gold)' : f.color;
                  return (
                    <div key={idx} style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: '6px', padding: '12px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.label}</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '6px', color: tc }}>{f.text} USDT</div>
                      <div style={{ fontSize: '11.5px', marginTop: '4px', color: tc, fontWeight: 600 }}>{item.val >= 0 ? '+' : ''}{item.pct}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

      {activeTab === 'guardian' && (
        <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
          {/* Header & Timeframe Selector */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck color="var(--primary-gold)" size={18} />
              <span style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-active)' }}>
                AI Trading Guardian & DSS - {activeSymbol} ({marketType.toUpperCase()})
              </span>
            </div>
            
            {/* Timeframe Buttons */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {['1m', '5m', '15m', '1h', '1d'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setGuardianTimeframe(tf)}
                  style={{
                    backgroundColor: guardianTimeframe === tf ? 'var(--primary-gold)' : 'var(--bg-input)',
                    color: guardianTimeframe === tf ? '#000' : 'var(--text-muted)',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {guardianLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '180px', color: 'var(--text-muted)' }}>
              <div className="spinner" style={{ width: '24px', height: '24px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary-gold)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '12px' }}></div>
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
              <span>{t.analyzing}</span>
            </div>
          ) : !guardianData ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '180px', color: 'var(--text-muted)' }}>
              {t.noData}
            </div>
          ) : (() => {
            // Determine styles based on trading permission and status
            const isAllowed = guardianData.tradingPermission === 'YES';
            const statusColor = isAllowed 
              ? 'var(--green-bybit)' 
              : (guardianData.status === 'AVOID' ? 'var(--red-bybit)' : 'var(--primary-gold)');
            
            const warningStyles = isAllowed 
              ? { bg: 'rgba(14,203,129,0.06)', border: 'rgba(14,203,129,0.2)', bar: 'var(--green-bybit)', text: '#0ecb81' }
              : (guardianData.status === 'AVOID'
                  ? { bg: 'rgba(246,70,93,0.06)', border: 'rgba(246,70,93,0.2)', bar: 'var(--red-bybit)', text: '#f6465d' }
                  : { bg: 'rgba(255,177,26,0.06)', border: 'rgba(255,177,26,0.2)', bar: 'var(--primary-gold)', text: '#ffb11a' }
                );

            const badgeStyles = {
              'STRONG BUY': { bg: 'rgba(14,203,129,0.15)', text: '#0ecb81', border: '1px solid rgba(14,203,129,0.3)', glow: '0 0 10px rgba(14,203,129,0.2)' },
              'BUY': { bg: 'rgba(14,203,129,0.1)', text: '#0ecb81', border: '1px solid rgba(14,203,129,0.2)', glow: 'none' },
              'WAIT': { bg: 'rgba(255,177,26,0.1)', text: '#ffb11a', border: '1px solid rgba(255,177,26,0.2)', glow: 'none' },
              'SELL': { bg: 'rgba(246,70,93,0.1)', text: '#f6465d', border: '1px solid rgba(246,70,93,0.2)', glow: 'none' },
              'STRONG SELL': { bg: 'rgba(246,70,93,0.15)', text: '#f6465d', border: '1px solid rgba(246,70,93,0.3)', glow: '0 0 10px rgba(246,70,93,0.2)' },
              'AVOID': { bg: 'rgba(132,142,156,0.1)', text: '#848e9c', border: '1px solid rgba(132,142,156,0.2)', glow: 'none' }
            }[guardianData.status] || { bg: 'rgba(255,255,255,0.05)', text: '#fff', border: '1px solid rgba(255,255,255,0.1)', glow: 'none' };

            const cond = guardianData.marketConditions || {};
            const riskMgmt = guardianData.riskManagement || {};
            const histVal = guardianData.historicalValidation || {};
            const expl = guardianData.explanation || {};

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* 1. Safety Warning Banner */}
                {guardianData.safetyWarning && (
                  <div style={{ 
                    backgroundColor: warningStyles.bg, 
                    border: `1px solid ${warningStyles.border}`,
                    borderLeft: `4px solid ${warningStyles.bar}`,
                    borderRadius: '4px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}>
                    <AlertTriangle color={warningStyles.text} size={20} style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '13px', color: warningStyles.text, marginBottom: '2px' }}>
                        {guardianData.safetyWarning.header}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-active)', lineHeight: '1.5' }}>
                        {guardianData.safetyWarning.detail}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Market Condition HUD */}
                <div style={{ 
                  backgroundColor: 'rgba(255,255,255,0.01)', 
                  border: '1px solid rgba(255,255,255,0.03)', 
                  borderRadius: '6px', 
                  padding: '12px 14px' 
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', fontWeight: 'bold' }}>
                    Market Condition & Regime Overview
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                    {[
                      { label: 'Market Regime', val: cond.regime, col: cond.regime?.includes('VOLATILITY') ? 'var(--red-bybit)' : (cond.regime?.includes('BULLISH') ? 'var(--green-bybit)' : 'var(--text-active)') },
                      { label: 'Trend Direction', val: cond.trend, col: cond.trend === 'BULLISH' ? 'var(--green-bybit)' : (cond.trend === 'BEARISH' ? 'var(--red-bybit)' : 'var(--primary-gold)') },
                      { label: 'Momentum Bias', val: cond.momentum, col: cond.momentum?.includes('LONG') ? 'var(--green-bybit)' : (cond.momentum?.includes('SHORT') ? 'var(--red-bybit)' : 'var(--text-muted)') },
                      { label: 'Volume State', val: cond.volume, col: cond.volume === 'SPIKE' ? 'var(--green-bybit)' : (cond.volume === 'DECREASING' ? 'var(--red-bybit)' : 'var(--text-active)') },
                      { label: 'Volatility State', val: cond.volatility, col: cond.volatility === 'EXTREME' ? 'var(--red-bybit)' : (cond.volatility === 'LOW' ? 'var(--primary-gold)' : 'var(--green-bybit)') }
                    ].map((m, idx) => (
                      <div key={idx} style={{ backgroundColor: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.02)', borderRadius: '4px', padding: '8px 10px' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>{m.label}</div>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: m.col }}>{m.val}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Upper Metrics Grid: Permission + Recommendation + Confidence */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                  
                  {/* 3. Recommendation & Permission Card */}
                  <div style={{ 
                    flex: '1 1 300px', 
                    backgroundColor: 'rgba(255,255,255,0.015)', 
                    border: '1px solid rgba(255,255,255,0.03)', 
                    borderRadius: '8px', 
                    padding: '16px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'center',
                    gap: '12px'
                  }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Trading Permission</div>
                      <div style={{ 
                        fontSize: '16px', 
                        fontWeight: '800', 
                        color: isAllowed ? 'var(--green-bybit)' : 'var(--red-bybit)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        {isAllowed ? (
                          <>
                            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--green-bybit)' }}></span>
                            YES (ENTRY ALLOWED)
                          </>
                        ) : (
                          <>
                            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--red-bybit)' }}></span>
                            NO (PRACTICE PATIENCE)
                          </>
                        )}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Guardian Recommendation</div>
                      <div style={{
                        backgroundColor: badgeStyles.bg,
                        color: badgeStyles.text,
                        border: badgeStyles.border,
                        boxShadow: badgeStyles.glow,
                        borderRadius: '4px',
                        padding: '6px 16px',
                        fontSize: '16px',
                        fontWeight: '800',
                        letterSpacing: '0.05em',
                        textAlign: 'center',
                        display: 'inline-block'
                      }}>
                        {guardianData.status}
                      </div>
                    </div>
                  </div>

                  {/* Confidence progress ring */}
                  <div style={{ flex: '1 1 200px', backgroundColor: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ position: 'relative', width: '70px', height: '70px', flexShrink: 0 }}>
                      <svg width="70" height="70" viewBox="0 0 36 36">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="rgba(255,255,255,0.05)"
                          strokeWidth="3"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke={statusColor}
                          strokeDasharray={`${guardianData.confidence}, 100`}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dasharray 0.5s ease' }}
                        />
                      </svg>
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '14px', fontWeight: '800', color: statusColor }}>
                        {guardianData.confidence}%
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Setup Quality Score</div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '2px', color: 'var(--text-active)' }}>
                        {guardianData.confidence >= 70 ? 'High Probability' : guardianData.confidence >= 50 ? 'Moderate/Cautious' : 'Low Probability'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Score: {guardianData.confidence}/100</div>
                    </div>
                  </div>

                  {/* 6. Historical Validation (Backtest Engine) */}
                  <div style={{ flex: '1 1 250px', backgroundColor: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Historical Backtest Winrate</div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: parseFloat(histVal.winrate) >= 55 ? 'var(--green-bybit)' : 'var(--text-active)', margin: '4px 0' }}>
                      {histVal.winrate}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Based on <strong style={{ color: 'var(--text-active)' }}>{histVal.setupsCount}</strong> setups (Wins: {histVal.wins}, Losses: {histVal.losses}) in 1000 candles
                    </div>
                  </div>

                </div>

                {/* 4. Entry Zone Card */}
                <div style={{ 
                  backgroundColor: 'rgba(255,177,26,0.02)', 
                  border: '1px solid rgba(255,177,26,0.08)', 
                  borderRadius: '6px', 
                  padding: '14px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Target Entry Zone</div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary-gold)' }}>
                      {guardianData.entryZone}
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right', maxWidth: '300px' }}>
                    Execute positions strictly within this zone to preserve optimal trade metrics.
                  </div>
                </div>

                {/* 5. Risk Management Parameter Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                  {[
                    { label: 'Stop Loss Target (SL)', val: riskMgmt.stopLoss, color: 'var(--red-bybit)' },
                    { label: 'Take Profit Target (TP)', val: riskMgmt.takeProfit, color: 'var(--green-bybit)' },
                    { label: 'Risk Reward Ratio (R:R)', val: riskMgmt.riskReward, color: 'var(--text-active)' }
                  ].map((p, idx) => (
                    <div key={idx} style={{ backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)', borderRadius: '6px', padding: '10px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>{p.label}</div>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', color: p.color }}>{p.val}</div>
                    </div>
                  ))}
                </div>

                {/* 7. Explanations (7-Point Validation Checklist, Reasons, Risks & Conclusion) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* 7-Point Validation Checklist Table */}
                  <div style={{ 
                    backgroundColor: 'rgba(255,255,255,0.01)', 
                    border: '1px solid rgba(255,255,255,0.03)', 
                    borderRadius: '8px', 
                    padding: '14px' 
                  }}>
                    <h5 style={{ color: 'var(--text-active)', fontSize: '12px', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ShieldCheck color="var(--primary-gold)" size={16} /> 7-Point Technical Validation Checklist
                    </h5>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {expl.validations && expl.validations.map((check, idx) => (
                        <div key={idx} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          padding: '8px 12px',
                          backgroundColor: 'rgba(255,255,255,0.005)',
                          border: '1px solid rgba(255,255,255,0.015)',
                          borderRadius: '4px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {check.passed ? (
                              <CheckCircle color="var(--green-bybit)" size={16} />
                            ) : (
                              <XCircle color={isAllowed ? 'var(--red-bybit)' : 'var(--text-muted)'} size={16} />
                            )}
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-active)' }}>
                              {check.name}
                            </span>
                          </div>
                          <span style={{ fontSize: '11.5px', color: check.passed ? 'var(--text-active)' : 'var(--text-muted)' }}>
                            {check.detail}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Supporting reasons and risks split columns */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    
                    {/* Left Column: Reasons */}
                    <div style={{ backgroundColor: 'rgba(14,203,129,0.01)', border: '1px solid rgba(14,203,129,0.03)', borderRadius: '8px', padding: '14px' }}>
                      <h5 style={{ color: 'var(--green-bybit)', fontSize: '12px', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        ✓ Checklist Analisis & Pendukung
                      </h5>
                      <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '11.5px', color: 'var(--text-active)', lineHeight: '1.7' }}>
                        {expl.reasons && expl.reasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Right Column: Risks */}
                    <div style={{ backgroundColor: 'rgba(246,70,93,0.01)', border: '1px solid rgba(246,70,93,0.03)', borderRadius: '8px', padding: '14px' }}>
                      <h5 style={{ color: 'var(--red-bybit)', fontSize: '12px', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        ⚠️ Risiko & Ancaman Terdeteksi
                      </h5>
                      <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '11.5px', color: 'var(--text-active)', lineHeight: '1.7' }}>
                        {expl.risks && expl.risks.map((rk, i) => (
                          <li key={i}>{rk}</li>
                        ))}
                      </ul>
                    </div>

                  </div>

                  {/* Conclusion Box */}
                  <div style={{ 
                    backgroundColor: 'rgba(255,255,255,0.015)', 
                    borderLeft: `3px solid ${statusColor}`, 
                    borderRadius: '0 6px 6px 0', 
                    padding: '12px 16px', 
                    fontSize: '12px', 
                    lineHeight: '1.6', 
                    color: 'var(--text-active)' 
                  }}>
                    <div style={{ fontWeight: 'bold', color: statusColor, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Kesimpulan AI Trading Guardian
                    </div>
                    {expl.conclusion}
                  </div>

                </div>

              </div>
            );
          })()}
        </div>
      )}

      </div>

    </section>
  );
}
