import React, { useState, useEffect } from 'react';
import { ShieldCheck, PlusCircle, Trash2, ArrowLeftRight, FileText, Database } from 'lucide-react';
import { API_URL } from '../config.js';

export default function BottomTabs({ 
  user, 
  wallets, 
  positions, 
  openOrders, 
  onRefresh, 
  floatingPnLs 
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
      if (!res.ok) throw new Error(data.error || 'Transfer failed.');

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
      if (!res.ok) throw new Error(data.error || 'Adjustment failed.');

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
          Positions ({positions.length})
        </button>
        <button className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
          Open Orders ({openOrders.length})
        </button>
        <button className={`tab-btn ${activeTab === 'balances' ? 'active' : ''}`} onClick={() => setActiveTab('balances')}>
          Wallets & Inner Transfer
        </button>
        
        {user?.role === 'admin' && (
          <button 
            className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`} 
            onClick={() => setActiveTab('admin')}
            style={{ color: 'var(--red-binance)', borderBottomColor: activeTab === 'admin' ? 'var(--red-binance)' : 'transparent' }}
          >
            <ShieldCheck size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
            Super Admin Panel
          </button>
        )}
      </div>

      {/* Tabs Contents Viewports */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', minHeight: '180px' }}>

        {/* 1. POSITIONS PANEL */}
        {activeTab === 'positions' && (
          positions.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px', color: 'var(--text-muted)' }}>
              No active leveraged positions. Place a Futures order to open position.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '6px' }}>Symbol</th>
                  <th style={{ padding: '6px' }}>Position</th>
                  <th style={{ padding: '6px' }}>Size</th>
                  <th style={{ padding: '6px' }}>Entry Price</th>
                  <th style={{ padding: '6px' }}>Mark Price</th>
                  <th style={{ padding: '6px' }}>Liq Price</th>
                  <th style={{ padding: '6px' }}>Margin (Isolated)</th>
                  <th style={{ padding: '6px' }}>Unrealized PnL (USDT)</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {positions.map(pos => {
                  const floating = floatingPnLs[pos.id] || { markPrice: pos.entryPrice, unrealizedPnL: 0 };
                  const upnlColor = floating.unrealizedPnL >= 0 ? 'var(--green-binance)' : 'var(--red-binance)';
                  const pnlSign = floating.unrealizedPnL >= 0 ? '+' : '';

                  return (
                    <tr key={pos.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '6px', fontWeight: 600 }}>{pos.symbol}</td>
                      <td style={{ padding: '6px' }}>
                        <span style={{ 
                          color: pos.side === 'LONG' ? 'var(--green-binance)' : 'var(--red-binance)',
                          backgroundColor: pos.side === 'LONG' ? 'var(--green-binance-light)' : 'var(--red-binance-light)',
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
                      <td style={{ padding: '6px', fontFamily: 'monospace', color: 'var(--red-binance)', fontWeight: 600 }}>
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
                            backgroundColor: 'var(--red-binance-light)', color: 'var(--red-binance)', border: '1px solid var(--red-binance)',
                            borderRadius: '3px', padding: '2px 6px', fontSize: '10px', fontWeight: 600, cursor: 'pointer'
                          }}
                        >
                          Market Close
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
              No pending active orders on books.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '6px' }}>Symbol</th>
                  <th style={{ padding: '6px' }}>Market</th>
                  <th style={{ padding: '6px' }}>Side</th>
                  <th style={{ padding: '6px' }}>Type</th>
                  <th style={{ padding: '6px' }}>Price</th>
                  <th style={{ padding: '6px' }}>Quantity</th>
                  <th style={{ padding: '6px' }}>Triggers</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {openOrders.map(order => (
                  <tr key={order.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '6px', fontWeight: 600 }}>{order.symbol}</td>
                    <td style={{ padding: '6px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{order.marketType}</td>
                    <td style={{ padding: '6px' }}>
                      <span style={{ color: order.side === 'BUY' ? 'var(--green-binance)' : 'var(--red-binance)', fontWeight: 600 }}>
                        {order.side}
                      </span>
                    </td>
                    <td style={{ padding: '6px', fontSize: '10.5px' }}>{order.type.replace('_', ' ')}</td>
                    <td style={{ padding: '6px', fontFamily: 'monospace' }}>
                      {order.price ? parseFloat(order.price).toFixed(2) : 'Market price'}
                    </td>
                    <td style={{ padding: '6px', fontFamily: 'monospace' }}>{parseFloat(order.quantity).toFixed(4)}</td>
                    <td style={{ padding: '6px', fontFamily: 'monospace', color: 'var(--primary-gold)' }}>
                      {order.stopPrice ? `Stop Price >= ${parseFloat(order.stopPrice).toFixed(2)}` : order.type === 'TRAILING_STOP' ? `Reversal ${order.callbackRate}%` : '---'}
                    </td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>
                      <button 
                        onClick={() => handleCancelOrder(order.id)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        title="Cancel Order"
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
                <span style={{ fontWeight: 600, color: 'var(--primary-gold)', display: 'block', marginBottom: '8px' }}>Spot Wallets Balance</span>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '4px' }}>Asset</th>
                      <th style={{ padding: '4px', textAlign: 'right' }}>Available balance</th>
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
                <span style={{ fontWeight: 600, color: 'var(--primary-gold)', display: 'block', marginBottom: '8px' }}>USDT perpetual Futures Wallet</span>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '4px' }}>Asset</th>
                      <th style={{ padding: '4px', textAlign: 'right' }}>Collateral Balance</th>
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
                <span>Internal USDT Transfer</span>
              </span>

              <form onSubmit={handleTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="form-group">
                  <label>Direction</label>
                  <select 
                    className="form-input"
                    value={transferDir}
                    onChange={(e) => setTransferDir(e.target.value)}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="SPOT_TO_FUTURES">Spot Account ➔ Futures Account</option>
                    <option value="FUTURES_TO_SPOT">Futures Account ➔ Spot Account</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Amount (USDT)</label>
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

                {transferErr && <div style={{ color: 'var(--red-binance)', fontSize: '10.5px', backgroundColor: 'var(--red-binance-light)', padding: '6px', borderRadius: '3px' }}>{transferErr}</div>}
                {transferOk && <div style={{ color: 'var(--green-binance)', fontSize: '10.5px', backgroundColor: 'var(--green-binance-light)', padding: '6px', borderRadius: '3px' }}>{transferOk}</div>}

                <button type="submit" disabled={transferLoading} className="btn-primary" style={{ padding: '8px', fontSize: '12px' }}>
                  {transferLoading ? 'Processing...' : 'Confirm Transfer'}
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
                <span style={{ fontWeight: 600, color: 'var(--red-binance)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Database size={13} />
                  <span>Database Users & Balance Vaults</span>
                </span>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '4px' }}>User ID</th>
                      <th style={{ padding: '4px' }}>Username</th>
                      <th style={{ padding: '4px' }}>Role</th>
                      <th style={{ padding: '4px' }}>Balances Details</th>
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
                            backgroundColor: u.role === 'admin' ? 'var(--red-binance-light)' : 'var(--green-binance-light)',
                            color: u.role === 'admin' ? 'var(--red-binance)' : 'var(--green-binance)'
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
                  <span>Administrative Security Audit Trails</span>
                </span>
                
                <div style={{ maxHeight: '180px', overflowY: 'auto', fontSize: '10.5px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {adminLogs.length === 0 ? (
                    <span style={{ color: 'var(--text-muted)' }}>No audit events logged yet.</span>
                  ) : (
                    adminLogs.map(log => (
                      <div key={log.id} style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '6px', borderRadius: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <span style={{ color: 'var(--red-binance)', fontWeight: 600 }}>{log.actionType}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{new Date(log.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p style={{ color: 'var(--text-active)' }}>{log.description}</p>
                        <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Before: <code style={{ color: 'var(--red-binance)' }}>{log.beforeValue}</code> | After: <code style={{ color: 'var(--green-binance)' }}>{log.afterValue}</code>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Right: Inject/Adjust Balances tool panel */}
            <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--red-binance)', borderRadius: '6px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', alignSelf: 'start' }}>
              <span style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--red-binance)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PlusCircle size={14} />
                <span>Adjust / Inject Balances</span>
              </span>

              <form onSubmit={handleAdminAdjust} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                
                <div className="form-group">
                  <label>Target User</label>
                  <select 
                    className="form-input"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    required
                  >
                    <option value="">Select account...</option>
                    {adminUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.username} (ID: {u.id})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Wallet Division</label>
                  <select 
                    className="form-input"
                    value={adminWalletType}
                    onChange={(e) => setAdminWalletType(e.target.value)}
                  >
                    <option value="spot">Spot Account</option>
                    <option value="futures">Futures Account</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Asset Symbol</label>
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
                  <label>Set Balance Absolute Value</label>
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

                {adminErr && <div style={{ color: 'var(--red-binance)', fontSize: '10.5px', backgroundColor: 'var(--red-binance-light)', padding: '6px', borderRadius: '3px' }}>{adminErr}</div>}
                {adminOk && <div style={{ color: 'var(--green-binance)', fontSize: '10.5px', backgroundColor: 'var(--green-binance-light)', padding: '6px', borderRadius: '3px' }}>{adminOk}</div>}

                <button 
                  type="submit" 
                  disabled={adminLoading} 
                  style={{
                    backgroundColor: 'var(--red-binance)', color: '#000', border: 'none', borderRadius: '4px',
                    padding: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  {adminLoading ? 'Injecting...' : 'Override User Balance'}
                </button>
              </form>
            </div>

          </div>
        )}

      </div>

    </section>
  );
}
