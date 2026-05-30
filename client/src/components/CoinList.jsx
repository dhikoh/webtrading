import React, { useState, useEffect } from 'react';
import { Search, Flame, TrendingUp } from 'lucide-react';
import { API_URL } from '../config.js';

export default function CoinList({ activeSymbol, marketType, onSelectSymbol }) {
  const [symbols, setSymbols] = useState([]);
  const [search, setSearch] = useState('');
  const [activeMarketTab, setActiveMarketTab] = useState(marketType); // 'spot' | 'futures'
  const [activeQuoteTab, setActiveQuoteTab] = useState('USDT'); // 'USDT' | 'USDC' | 'BNB' | 'BTC'
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSymbols = async () => {
      setLoading(true);
      try {
        const endpoint = activeMarketTab === 'spot' ? '/api/market/spot-info' : '/api/market/futures-info';
        const res = await fetch(`${API_URL}${endpoint}`);
        const data = await res.json();
        setSymbols(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load active symbols:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSymbols();
  }, [activeMarketTab]);

  // Synchronize top-level tabs changes from outer clicks if needed
  useEffect(() => {
    setActiveMarketTab(marketType);
  }, [marketType]);

  // Handle auto-quote adjustments when switching between Spot and Futures
  useEffect(() => {
    if (activeMarketTab === 'futures') {
      setActiveQuoteTab('USDT'); // Futures perp is typically settled in USDT in our system
    }
  }, [activeMarketTab]);

  const filteredSymbols = symbols.filter(s => {
    // 1. Filter based on Search query
    const matchSearch = s.symbol.toUpperCase().includes(search.toUpperCase());
    
    // 2. Filter based on active Quote tab
    const matchQuote = activeMarketTab === 'futures' 
      ? s.quoteAsset === 'USDT' // USD-Margined perpetuals
      : s.quoteAsset === activeQuoteTab; // Spot USDT/USDC/BNB/BTC divisions

    return matchSearch && matchQuote;
  });

  return (
    <aside className="trading-panel" style={{ gridColumn: '1', gridRow: '1 / span 2', userSelect: 'none' }}>
      
      {/* Top level: Spot vs. Futures */}
      <div className="tab-header">
        <button 
          className={`tab-btn ${activeMarketTab === 'spot' ? 'active' : ''}`}
          onClick={() => {
            setActiveMarketTab('spot');
            onSelectSymbol('BTCUSDT', 'spot'); // default spot symbol
          }}
        >
          Spot Markets
        </button>
        <button 
          className={`tab-btn ${activeMarketTab === 'futures' ? 'active' : ''}`}
          onClick={() => {
            setActiveMarketTab('futures');
            onSelectSymbol('BTCUSDT', 'futures'); // default futures symbol
          }}
        >
          USDT-M Futures
        </button>
      </div>

      {/* Spot Quote Sub-Tabs selector */}
      {activeMarketTab === 'spot' && (
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.1)' }}>
          {['USDT', 'USDC', 'BNB', 'BTC'].map(q => (
            <button
              key={q}
              style={{
                flex: 1,
                padding: '6px 0',
                background: 'transparent',
                border: 'none',
                color: activeQuoteTab === q ? 'var(--primary-gold)' : 'var(--text-muted)',
                fontSize: '10.5px',
                fontWeight: activeQuoteTab === q ? '600' : '400',
                cursor: 'pointer',
                textAlign: 'center',
                borderBottom: activeQuoteTab === q ? '1px solid var(--primary-gold)' : 'none'
              }}
              onClick={() => setActiveQuoteTab(q)}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Compact Search Component */}
      <div style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', position: 'relative' }}>
        <input
          type="text"
          placeholder="Search coin (e.g. AIGEN)..."
          className="form-input"
          style={{ width: '100%', height: '28px', paddingLeft: '28px', fontSize: '11px', borderRadius: '4px' }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Search size={12} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-muted)' }} />
      </div>

      {/* Symbols Table list container */}
      <div style={{ flex: '1', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px', color: 'var(--text-muted)' }}>
            Loading market registry...
          </div>
        ) : filteredSymbols.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '11px' }}>
            No pairs found.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '10px' }}>
                <th style={{ padding: '8px', fontWeight: 500 }}>Asset Pair</th>
                <th style={{ padding: '8px', fontWeight: 500, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSymbols.map(s => {
                const isActive = s.symbol === activeSymbol && activeMarketTab === marketType;
                
                return (
                  <tr 
                    key={s.symbol}
                    onClick={() => onSelectSymbol(s.symbol, activeMarketTab)}
                    style={{ 
                      borderBottom: '1px solid rgba(255,255,255,0.01)', 
                      cursor: 'pointer',
                      backgroundColor: isActive ? 'rgba(240, 185, 11, 0.05)' : 'transparent',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td style={{ padding: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ 
                        fontWeight: 600, 
                        color: isActive ? 'var(--primary-gold)' : 'var(--text-active)',
                        fontSize: '12px'
                      }}>
                        {s.baseAsset}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                        /{s.quoteAsset}
                      </span>
                      {/* Seed warning icons matching screenshot */}
                      {s.baseAsset.includes('AIGEN') && (
                        <span style={{ backgroundColor: 'var(--primary-gold)', color: '#000', fontSize: '7.5px', padding: '0px 2px', borderRadius: '1px', fontWeight: 800 }}>
                          SEED
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', fontSize: '11px' }}>
                      <span style={{ 
                        color: isActive ? 'var(--primary-gold)' : 'var(--text-muted)',
                        border: '1px solid',
                        borderColor: isActive ? 'var(--primary-gold)' : 'var(--border-color)',
                        borderRadius: '3px',
                        padding: '2px 6px',
                        fontSize: '10px'
                      }}>
                        Trade
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Sidebar footer showing dynamic indices data */}
      <div style={{ padding: '8px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', fontSize: '10px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Flame size={10} style={{ color: 'var(--primary-gold)' }} />
          <span>Active Registry: {symbols.length} pairs</span>
        </div>
      </div>

    </aside>
  );
}
