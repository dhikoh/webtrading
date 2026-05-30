import React from 'react';
import { HelpCircle, LogOut, Radio, User, Coins } from 'lucide-react';

export default function Header({ 
  activeSymbol, 
  marketType, 
  latestPrice, 
  priceChangePercent,
  user, 
  onLogout, 
  onOpenHelp, 
  isWsConnected 
}) {
  
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
