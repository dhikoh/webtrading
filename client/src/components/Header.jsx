import React from 'react';
import { HelpCircle, LogOut, Radio, User, Coins, Wallet } from 'lucide-react';

export default function Header({ 
  activeSymbol, 
  marketType, 
  latestPrice, 
  priceChangePercent,
  user, 
  wallets = [],
  onLogout, 
  onOpenHelp, 
  isWsConnected 
}) {
  
  const totalSpotValue = wallets.filter(w => w.walletType === 'spot').reduce((acc, curr) => {
    const balance = parseFloat(curr.balance || 0);
    if (curr.asset === 'USDT' || curr.asset === 'USDC') return acc + balance;
    if (curr.asset === 'BTC') return acc + (balance * 74000);
    if (curr.asset === 'ETH') return acc + (balance * 3800);
    if (curr.asset === 'SOL') return acc + (balance * 180);
    return acc + balance;
  }, 0);

  const totalFuturesValue = wallets.filter(w => w.walletType === 'futures').reduce((acc, curr) => {
    const balance = parseFloat(curr.balance || 0);
    return acc + balance;
  }, 0);

  const totalNAV = totalSpotValue + totalFuturesValue;

  const baseAsset = activeSymbol.replace('USDT', '').replace('USDC', '').replace('BNB', '').replace('BTC', '');
  const quoteAsset = activeSymbol.replace(baseAsset, '');

  const percentNum = parseFloat(priceChangePercent || 0);
  const colorClass = percentNum >= 0 ? 'var(--green-binance)' : 'var(--red-binance)';
  const percentSign = percentNum >= 0 ? '+' : '';

  // Seed Tag Detection based on screenshot!
  const isSeedTag = activeSymbol.toUpperCase().includes('AIGENSYN') || activeSymbol.toUpperCase().includes('MEME') || activeSymbol.toUpperCase().includes('DOGE');

  return (
    <header style={{ 
      gridRow: '1', 
      backgroundColor: 'var(--bg-panel)', 
      borderBottom: '1px solid var(--border-color)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      padding: '0 16px',
      height: '50px',
      userSelect: 'none'
    }}>
      
      {/* Ticker & Pair Selector Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <Coins size={18} style={{ color: 'var(--primary-gold)' }} />
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-active)' }}>
            {baseAsset}/{quoteAsset}
          </span>
          <span style={{ 
            fontSize: '9px', 
            fontWeight: 700, 
            backgroundColor: 'var(--bg-input)', 
            padding: '2px 4px', 
            borderRadius: '2px', 
            color: 'var(--text-muted)',
            textTransform: 'uppercase'
          }}>
            {marketType}
          </span>
          
          {isSeedTag && (
            <span className="seed-tag" title="Innovative project, subject to high volatility and risk.">
              Seed Tag
            </span>
          )}
        </div>

        {/* Live Prices Grid */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginLeft: '12px', borderLeft: '1px solid var(--border-color)', paddingLeft: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ 
              fontSize: '14px', 
              fontWeight: 600, 
              color: percentNum >= 0 ? 'var(--green-binance)' : 'var(--red-binance)',
              fontFamily: 'monospace'
            }}>
              {latestPrice ? parseFloat(latestPrice).toFixed(activeSymbol.includes('USDT') || activeSymbol.includes('USDC') ? 2 : 6) : '---'}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Live Index Price</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ 
              fontSize: '11px', 
              fontWeight: 500, 
              color: colorClass,
              fontFamily: 'monospace'
            }}>
              {percentSign}{percentNum.toFixed(2)}%
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>24h Change</span>
          </div>

          <div style={{ display: 'none', flexDirection: 'column' }}>
            {/* Extended Binance details can be dynamically added */}
          </div>
        </div>
      </div>

      {/* Network & User Actions Panel */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        
        {/* Connection Pulse indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
          <Radio size={14} style={{ color: isWsConnected ? 'var(--green-binance)' : 'var(--red-binance)' }} />
          <span>Real-time Stream</span>
        </div>

        {/* Dynamic Help Center Button */}
        <button 
          onClick={onOpenHelp}
          style={{ 
            background: 'var(--bg-input)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '4px',
            padding: '6px 12px', 
            color: 'var(--text-active)', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            fontSize: '12px',
            transition: 'all 0.2s ease'
          }}
          className="header-action-btn"
        >
          <HelpCircle size={15} style={{ color: 'var(--primary-gold)' }} />
          <span>Academy Guide</span>
        </button>

        {/* NAV Balance HUD */}
        {wallets && wallets.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-color)',
            padding: '6px 14px',
            borderRadius: '4px',
            fontSize: '11px',
            color: 'var(--text-muted)'
          }} title="Total Net Asset Value (Spot + Futures perpetual collateral)">
            <Wallet size={12} style={{ color: 'var(--primary-gold)' }} />
            <span>NAV: <strong style={{ color: 'var(--primary-gold)', fontFamily: 'monospace' }}>{totalNAV.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</strong></span>
            <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
            <span>Spot: <strong style={{ color: 'var(--text-active)', fontFamily: 'monospace' }}>{totalSpotValue.toLocaleString('id-ID', { maximumFractionDigits: 2 })}</strong></span>
            <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
            <span>Futures: <strong style={{ color: 'var(--text-active)', fontFamily: 'monospace' }}>{totalFuturesValue.toLocaleString('id-ID', { maximumFractionDigits: 2 })}</strong></span>
          </div>
        )}

        {/* User Role Badge Card */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          backgroundColor: 'var(--bg-input)', 
          padding: '6px 12px', 
          borderRadius: '4px',
          border: '1px solid var(--border-color)'
        }}>
          <User size={14} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontWeight: 600, color: 'var(--text-active)' }}>
            {user ? user.username : '---'}
          </span>
          <span style={{ 
            fontSize: '9px', 
            fontWeight: 700, 
            backgroundColor: user?.role === 'admin' ? 'var(--red-binance-light)' : 'var(--green-binance-light)',
            color: user?.role === 'admin' ? 'var(--red-binance)' : 'var(--green-binance)',
            padding: '1px 4px', 
            borderRadius: '2px', 
            textTransform: 'uppercase'
          }}>
            {user?.role === 'admin' ? 'Super Admin' : 'Member'}
          </span>
        </div>

        {/* Secure Logout Trigger */}
        <button 
          onClick={onLogout}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: 'var(--text-muted)', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            transition: 'color 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--red-binance)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          title="Sign out of trade session"
        >
          <LogOut size={18} />
        </button>

      </div>
    </header>
  );
}
