import React, { useState, useEffect } from 'react';
import { Search, Star, Flame, Award, AlertCircle, ArrowUpDown } from 'lucide-react';
import { API_URL } from '../config.js';

const COIN_NAMES = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  SOL: 'Solana',
  USDT: 'Tether',
  USDC: 'USD Coin',
  BNB: 'BNB Coin',
  MEME: 'Memecoin',
  DOGE: 'Dogecoin',
  AIGENSYN: 'AIGen Synthetic'
};

export default function CoinList({ activeSymbol, marketType, onSelectSymbol, lang = 'id', socket, priceCache = {} }) {
  const [symbols, setSymbols] = useState([]);
  const [search, setSearch] = useState('');
  const [activeMarketTab, setActiveMarketTab] = useState(marketType); // 'spot' | 'futures'
  const [activeQuoteTab, setActiveQuoteTab] = useState('USDT'); // 'Favorites' | 'USDT' | 'USDC' | 'BTC' | 'ETH'
  const [subFilter, setSubFilter] = useState('All'); // 'All' | 'Main' | 'Seed Tag'
  const [favorites, setFavorites] = useState(() => {
    try {
      const stored = localStorage.getItem('trade_favorites');
      return stored ? JSON.parse(stored) : ['BTCUSDT', 'ETHUSDT'];
    } catch (e) {
      return ['BTCUSDT', 'ETHUSDT'];
    }
  });
  
  const [sortField, setSortField] = useState('symbol'); // 'symbol' | 'price' | 'change'
  const [sortAsc, setSortAsc] = useState(true);
  const [loading, setLoading] = useState(false);

  // Sync favorites to localStorage
  useEffect(() => {
    localStorage.setItem('trade_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    let isMounted = true;

    const loadSymbols = async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      try {
        const endpoint = activeMarketTab === 'spot' ? '/api/market/spot-info' : '/api/market/futures-info';
        const res = await fetch(`${API_URL}${endpoint}`);
        const data = await res.json();
        
        if (!isMounted) return;

        // Enrich symbol data with exchange metadata
        const enriched = (Array.isArray(data) ? data : []).map(s => {
          return {
            ...s,
            fullName: COIN_NAMES[s.baseAsset] || `${s.baseAsset} Token`,
            lastPrice: s.lastPrice || 0,
            vol24h: s.vol24h || '---',
            change24h: s.change24h || 0,
            isSeed: s.baseAsset.includes('AIGEN') || s.baseAsset === 'MEME'
          };
        });

        setSymbols(enriched);
      } catch (err) {
        console.error('Failed to load active symbols:', err);
      } finally {
        if (!isSilent) setLoading(false);
      }
    };

    loadSymbols(false);

    // Set up silent polling interval every 8 seconds
    const intervalId = setInterval(() => {
      loadSymbols(true);
    }, 8000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [activeMarketTab]);

  // Update symbol prices from priceCache whenever it changes
  useEffect(() => {
    if (Object.keys(priceCache).length === 0) return;
    setSymbols(prev => prev.map(s => {
      const cached = priceCache[s.symbol];
      if (cached) {
        return {
          ...s,
          lastPrice: cached.price || s.lastPrice,
          change24h: cached.changePct ? parseFloat(cached.changePct) : s.change24h
        };
      }
      return s;
    }));
  }, [priceCache]);

  // Subscribe to ticker for visible symbols via WS
  useEffect(() => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    // Subscribe to a few important symbols so their prices populate
    const importantSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'XRPUSDT'];
    importantSymbols.forEach(sym => {
      socket.send(JSON.stringify({
        type: 'SUBSCRIBE',
        symbol: sym,
        marketType: activeMarketTab
      }));
    });
  }, [socket, activeMarketTab]);

  // Synchronize dynamic updates from top-level state
  useEffect(() => {
    setActiveMarketTab(marketType);
  }, [marketType]);

  const toggleFavorite = (symbol, e) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(symbol) ? prev.filter(f => f !== symbol) : [...prev, symbol]
    );
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // 1. Filter Symbols
  const filteredSymbols = symbols.filter(s => {
    // Quote filter
    const matchQuote = activeQuoteTab === 'Favorites'
      ? favorites.includes(s.symbol)
      : s.quoteAsset === activeQuoteTab;

    // Sub filter (Main vs. Seed Tag)
    let matchSub = true;
    if (subFilter === 'Main') {
      matchSub = !s.isSeed;
    } else if (subFilter === 'Seed Tag') {
      matchSub = s.isSeed;
    }

    // Search query filter
    const matchSearch = 
      s.symbol.toUpperCase().includes(search.toUpperCase()) ||
      s.baseAsset.toUpperCase().includes(search.toUpperCase()) ||
      s.fullName.toUpperCase().includes(search.toUpperCase());

    return matchQuote && matchSub && matchSearch;
  });

  // 2. Sort Symbols
  const sortedSymbols = [...filteredSymbols].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === 'price') {
      valA = a.lastPrice;
      valB = b.lastPrice;
    } else if (sortField === 'change') {
      valA = a.change24h;
      valB = b.change24h;
    }

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  // Translations
  const t = {
    id: {
      spot: 'Pasar Spot',
      futures: 'Futures Perp',
      favorites: 'Favorit',
      all: 'Semua',
      main: 'Utama',
      seed: 'Tag Seed',
      search: 'Cari koin atau alamat kontrak...',
      pairVol: 'Pasangan / Vol',
      priceUsd: 'Harga / USD',
      change: 'Perubahan %',
      loading: 'Memuat daftar pasar...',
      empty: 'Pasangan tidak ditemukan.',
      activeLabel: 'Registri Aktif',
      pairsLabel: 'pasang',
      favsLabel: 'Favorit'
    },
    en: {
      spot: 'Spot Market',
      futures: 'Futures Perp',
      favorites: 'Favorites',
      all: 'All',
      main: 'Main',
      seed: 'Seed Tag',
      search: 'Enter token or contract address...',
      pairVol: 'Pair / Vol',
      priceUsd: 'Price / USD',
      change: 'Change %',
      loading: 'Loading market registry...',
      empty: 'No pairs found.',
      activeLabel: 'Active Registry',
      pairsLabel: 'pairs',
      favsLabel: 'Favs'
    }
  }[lang];

  return (
    <aside className="trading-panel" style={{ 
      gridColumn: '1', 
      gridRow: '1 / span 2', 
      userSelect: 'none',
      borderRight: '1px solid var(--border-color)',
      backgroundColor: '#161a1e',
      display: 'flex',
      flexDirection: 'column'
    }}>
      
      {/* Top Selector: Spot vs. Futures */}
      <div className="tab-header" style={{ height: '40px', backgroundColor: '#0b0e11' }}>
        <button 
          className={`tab-btn ${activeMarketTab === 'spot' ? 'active' : ''}`}
          onClick={() => {
            setActiveMarketTab('spot');
            onSelectSymbol('BTCUSDT', 'spot');
          }}
          style={{ fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
        >
          <Flame size={12} />
          {t.spot}
        </button>
        <button 
          className={`tab-btn ${activeMarketTab === 'futures' ? 'active' : ''}`}
          onClick={() => {
            setActiveMarketTab('futures');
            onSelectSymbol('BTCUSDT', 'futures');
          }}
          style={{ fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
        >
          <Award size={12} />
          {t.futures}
        </button>
      </div>

      {/* Quote Currency Selection Tabs */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid var(--border-color)', 
        backgroundColor: '#1e2329',
        padding: '2px 0'
      }}>
        {['Favorites', 'USDT', 'USDC', 'BTC', 'ETH'].map(q => {
          const isFav = q === 'Favorites';
          const isSelected = activeQuoteTab === q;

          return (
            <button
              key={q}
              style={{
                flex: 1,
                padding: '8px 0',
                background: 'transparent',
                border: 'none',
                color: isSelected ? 'var(--primary-gold)' : 'var(--text-muted)',
                fontSize: '10.5px',
                fontWeight: isSelected ? '700' : '500',
                cursor: 'pointer',
                textAlign: 'center',
                borderBottom: isSelected ? '2px solid var(--primary-gold)' : '2px solid transparent',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px'
              }}
              onClick={() => {
                setActiveQuoteTab(q);
                setSearch('');
              }}
            >
              {isFav ? <Star size={11} fill={isSelected ? 'var(--primary-gold)' : 'transparent'} /> : q}
              {!isFav && q}
              {isFav && <span style={{ fontSize: '10px' }}>{t.favorites}</span>}
            </button>
          );
        })}
      </div>

      {/* Sub-Filters: All, Main, Innovation / Seed Tag */}
      <div style={{ 
        display: 'flex', 
        gap: '6px', 
        padding: '8px 12px 4px 12px',
        backgroundColor: '#161a1e'
      }}>
        {[
          { key: 'All', label: t.all },
          { key: 'Main', label: t.main },
          { key: 'Seed Tag', label: t.seed }
        ].map(filter => {
          const isSelected = subFilter === filter.key;
          return (
            <button
              key={filter.key}
              onClick={() => setSubFilter(filter.key)}
              style={{
                fontSize: '10px',
                padding: '3px 8px',
                borderRadius: '12px',
                border: 'none',
                background: isSelected ? 'rgba(240, 185, 11, 0.12)' : 'rgba(255,255,255,0.03)',
                color: isSelected ? 'var(--primary-gold)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontWeight: isSelected ? '600' : '400',
                transition: 'all 0.15s'
              }}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Interactive Search Bar Input */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', position: 'relative' }}>
        <input
          type="text"
          placeholder={t.search}
          className="form-input"
          style={{ 
            width: '100%', 
            height: '28px', 
            paddingLeft: '28px', 
            fontSize: '11px', 
            borderRadius: '4px',
            background: '#1e2329'
          }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Search size={12} style={{ position: 'absolute', left: '20px', top: '16px', color: 'var(--text-muted)' }} />
      </div>

      {/* Columns Sorter Headers */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1.1fr 1.15fr 0.75fr', 
        padding: '6px 12px',
        fontSize: '10px',
        color: 'var(--text-muted)',
        borderBottom: '1px solid rgba(255,255,255,0.02)',
        fontWeight: '600'
      }}>
        <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }} onClick={() => handleSort('symbol')}>
          <span>{t.pairVol}</span>
          <ArrowUpDown size={8} />
        </div>
        <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', justifyContent: 'flex-end' }} onClick={() => handleSort('price')}>
          <span>{t.priceUsd}</span>
          <ArrowUpDown size={8} />
        </div>
        <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', justifyContent: 'flex-end' }} onClick={() => handleSort('change')}>
          <span>{t.change}</span>
          <ArrowUpDown size={8} />
        </div>
      </div>

      {/* Symbols Table list container */}
      <div style={{ flex: '1', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '11px' }}>
            {t.loading}
          </div>
        ) : sortedSymbols.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '11px' }}>
            {t.empty}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {sortedSymbols.map(s => {
              const isActive = s.symbol === activeSymbol && activeMarketTab === marketType;
              const hasFav = favorites.includes(s.symbol);
              const changePct = parseFloat(s.change24h || 0);
              const changeColor = changePct >= 0 ? 'var(--green-bybit)' : 'var(--red-bybit)';
              const isUp = changePct >= 0;

              return (
                <div 
                  key={s.symbol}
                  onClick={() => onSelectSymbol(s.symbol, activeMarketTab)}
                  style={{ 
                    display: 'grid',
                    gridTemplateColumns: '1.1fr 1.15fr 0.75fr',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    backgroundColor: isActive ? 'rgba(240, 185, 11, 0.04)' : 'transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.01)',
                    transition: 'all 0.15s ease',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {/* Left Col: Star + Symbol Ticker + Vol / Tag */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                    <button 
                      onClick={(e) => toggleFavorite(s.symbol, e)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: hasFav ? 'var(--primary-gold)' : 'var(--text-muted)',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Star size={11} fill={hasFav ? 'var(--primary-gold)' : 'transparent'} />
                    </button>

                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <span style={{ 
                          fontWeight: 700, 
                          color: isActive ? 'var(--primary-gold)' : 'var(--text-active)',
                          fontSize: '11.5px'
                        }}>
                          {s.baseAsset}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>
                          /{s.quoteAsset}
                        </span>
                        {s.isSeed && (
                          <span style={{ 
                            backgroundColor: 'rgba(240, 185, 11, 0.15)', 
                            color: 'var(--primary-gold)', 
                            fontSize: '7px', 
                            padding: '0 3px', 
                            borderRadius: '2px', 
                            fontWeight: 'bold',
                            border: '1px solid rgba(240, 185, 11, 0.3)'
                          }}>
                            SEED
                          </span>
                        )}
                      </div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '9.5px', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        {s.fullName}
                      </span>
                    </div>
                  </div>

                  {/* Center Col: Price + USD valuation */}
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: '600', 
                      fontFamily: 'monospace',
                      color: isActive ? 'var(--primary-gold)' : 'var(--text-active)'
                    }}>
                      {parseFloat(s.lastPrice).toLocaleString('en-US', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: Math.min(20, Math.max(2, Number.isInteger(s.pricePrecision) ? s.pricePrecision : 4)) 
                      })}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '9.5px', fontFamily: 'monospace' }}>
                      ${parseFloat(s.lastPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Right Col: Change Pill % + Volume */}
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <span style={{ 
                      color: changeColor,
                      fontWeight: 'bold',
                      fontSize: '10px',
                      background: isUp ? 'var(--green-bybit-light)' : 'var(--red-bybit-light)',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontFamily: 'monospace',
                      minWidth: '52px',
                      textAlign: 'center'
                    }}>
                      {isUp ? '+' : ''}{changePct.toFixed(2)}%
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '9px', fontFamily: 'monospace' }}>
                      {s.vol24h}
                    </span>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sidebar footer with Registry Stats */}
      <div style={{ 
        padding: '10px 12px', 
        borderTop: '1px solid var(--border-color)', 
        backgroundColor: '#0b0e11', 
        fontSize: '10.5px', 
        color: 'var(--text-muted)', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Flame size={11} style={{ color: 'var(--primary-gold)' }} />
          <span>{t.activeLabel}: {symbols.length} {t.pairsLabel}</span>
        </div>
        {favorites.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Star size={10} fill="var(--primary-gold)" style={{ color: 'var(--primary-gold)' }} />
            <span>{favorites.length} {t.favsLabel}</span>
          </div>
        )}
      </div>

    </aside>
  );
}
