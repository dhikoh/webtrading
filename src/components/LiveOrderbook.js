'use client';

import { useState, useEffect, useRef } from 'react';

export default function LiveOrderbook({ symbol = 'BTCUSDT' }) {
  const [bids, setBids] = useState([]);
  const [asks, setAsks] = useState([]);
  const [trades, setTrades] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  const depthWsRef = useRef(null);
  const tradeWsRef = useRef(null);

  useEffect(() => {
    if (!symbol) return;

    // Reset local state when symbol changes
    setBids([]);
    setAsks([]);
    setTrades([]);
    setIsConnected(false);

    const formattedSymbol = symbol.toLowerCase();
    
    // 1. Establish Binance WebSocket Depth Stream (Top 5 levels)
    const depthUrl = `wss://stream.binance.com:9443/ws/${formattedSymbol}@depth5`;
    const tradeUrl = `wss://stream.binance.com:9443/ws/${formattedSymbol}@trade`;

    try {
      depthWsRef.current = new WebSocket(depthUrl);
      tradeWsRef.current = new WebSocket(tradeUrl);

      depthWsRef.current.onopen = () => {
        setIsConnected(true);
      };

      depthWsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.bids && data.asks) {
            // Process Bids (Buyers)
            const processedBids = data.bids.map(([price, quantity]) => ({
              price: parseFloat(price),
              quantity: parseFloat(quantity),
              total: parseFloat(price) * parseFloat(quantity)
            }));

            // Process Asks (Sellers)
            const processedAsks = data.asks.map(([price, quantity]) => ({
              price: parseFloat(price),
              quantity: parseFloat(quantity),
              total: parseFloat(price) * parseFloat(quantity)
            }));

            setBids(processedBids);
            setAsks(processedAsks);
          }
        } catch (err) {
          console.error("Failed to parse depth stream message:", err);
        }
      };

      depthWsRef.current.onerror = (err) => {
        console.error("Depth WebSocket error:", err);
        setIsConnected(false);
      };

      // 2. Establish Binance WebSocket Trade Stream
      tradeWsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.p && data.q) {
            const newTrade = {
              id: data.t || Date.now(),
              price: parseFloat(data.p),
              quantity: parseFloat(data.q),
              isBuyerMaker: data.m, // true = SELL (red), false = BUY (green)
              time: new Date(data.T || Date.now()).toLocaleTimeString()
            };

            setTrades((prev) => [newTrade, ...prev.slice(0, 4)]);
          }
        } catch (err) {
          console.error("Failed to parse trade stream message:", err);
        }
      };

    } catch (err) {
      console.error("Failed to connect to WebSockets:", err);
    }

    // Cleanup WebSockets on unmount or symbol change
    return () => {
      if (depthWsRef.current) {
        depthWsRef.current.close();
        depthWsRef.current = null;
      }
      if (tradeWsRef.current) {
        tradeWsRef.current.close();
        tradeWsRef.current = null;
      }
    };
  }, [symbol]);

  // Calculations for horizontal bar graphs
  const maxBidTotal = bids.reduce((max, bid) => Math.max(max, bid.total), 1);
  const maxAskTotal = asks.reduce((max, ask) => Math.max(max, ask.total), 1);

  const formatPrice = (price) => {
    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };

  const formatQty = (qty) => {
    if (qty >= 1000) {
      return (qty / 1000).toFixed(2) + 'K';
    }
    return qty.toFixed(4);
  };

  return (
    <div className="glass-panel" style={{
      padding: '20px',
      borderRadius: '12px',
      background: 'rgba(15, 23, 42, 0.45)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(16px)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.37)',
      marginTop: '20px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        paddingBottom: '10px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '1.1rem',
          fontWeight: 'bold',
          color: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '1.25rem' }}>⚡</span> Live Orderbook Depth & Trade Flow
        </h3>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.75rem',
          color: isConnected ? '#10b981' : '#ef4444',
          background: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          padding: '4px 10px',
          borderRadius: '20px',
          border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
          fontWeight: '600'
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: isConnected ? '#10b981' : '#ef4444',
            display: 'inline-block'
          }}></span>
          {isConnected ? 'STREAMING REAL-TIME' : 'KONEKSI TERPUTUS'}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px'
      }}>
        {/* Bids Table (Buyers) */}
        <div>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#10b981', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
            <span>BIDS (Antrean Beli)</span>
            <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 'normal' }}>Aset: {symbol}</span>
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', fontSize: '0.7rem', color: '#9ca3af', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
              <div style={{ flex: 1 }}>Harga (USDT)</div>
              <div style={{ width: '80px', textAlign: 'right' }}>Jumlah</div>
              <div style={{ width: '100px', textAlign: 'right' }}>Total (USDT)</div>
            </div>
            {bids.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>Menunggu data...</div>
            ) : (
              bids.map((bid, i) => {
                const percentage = Math.min((bid.total / maxBidTotal) * 100, 100);
                return (
                  <div key={i} style={{
                    display: 'flex',
                    fontSize: '0.78rem',
                    color: '#f8fafc',
                    padding: '4px 0',
                    position: 'relative',
                    alignItems: 'center'
                  }}>
                    {/* Visual Bar chart background */}
                    <div style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: `${percentage}%`,
                      background: 'rgba(16, 185, 129, 0.08)',
                      zIndex: 1,
                      pointerEvents: 'none',
                      borderRadius: '2px',
                      transition: 'width 0.3s ease'
                    }} />
                    <div style={{ flex: 1, color: '#10b981', fontWeight: 'bold', zIndex: 2 }}>{formatPrice(bid.price)}</div>
                    <div style={{ width: '80px', textAlign: 'right', zIndex: 2 }}>{formatQty(bid.quantity)}</div>
                    <div style={{ width: '100px', textAlign: 'right', color: '#9ca3af', zIndex: 2 }}>{formatPrice(bid.total)}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Asks Table (Sellers) */}
        <div>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#ef4444', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
            <span>ASKS (Antrean Jual)</span>
            <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 'normal' }}>Spread Terketat</span>
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', fontSize: '0.7rem', color: '#9ca3af', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
              <div style={{ flex: 1 }}>Harga (USDT)</div>
              <div style={{ width: '80px', textAlign: 'right' }}>Jumlah</div>
              <div style={{ width: '100px', textAlign: 'right' }}>Total (USDT)</div>
            </div>
            {asks.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>Menunggu data...</div>
            ) : (
              asks.map((ask, i) => {
                const percentage = Math.min((ask.total / maxAskTotal) * 100, 100);
                return (
                  <div key={i} style={{
                    display: 'flex',
                    fontSize: '0.78rem',
                    color: '#f8fafc',
                    padding: '4px 0',
                    position: 'relative',
                    alignItems: 'center'
                  }}>
                    {/* Visual Bar chart background */}
                    <div style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: `${percentage}%`,
                      background: 'rgba(239, 68, 68, 0.08)',
                      zIndex: 1,
                      pointerEvents: 'none',
                      borderRadius: '2px',
                      transition: 'width 0.3s ease'
                    }} />
                    <div style={{ flex: 1, color: '#ef4444', fontWeight: 'bold', zIndex: 2 }}>{formatPrice(ask.price)}</div>
                    <div style={{ width: '80px', textAlign: 'right', zIndex: 2 }}>{formatQty(ask.quantity)}</div>
                    <div style={{ width: '100px', textAlign: 'right', color: '#9ca3af', zIndex: 2 }}>{formatPrice(ask.total)}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Live Trades Stream */}
        <div>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#3b82f6', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
            <span>RECENT TRADES (Aliran Transaksi)</span>
            <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 'normal' }}>Bursa Live</span>
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', fontSize: '0.7rem', color: '#9ca3af', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
              <div style={{ flex: 1 }}>Waktu</div>
              <div style={{ width: '100px', textAlign: 'right' }}>Harga (USDT)</div>
              <div style={{ width: '80px', textAlign: 'right' }}>Jumlah</div>
            </div>
            {trades.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>Menunggu transaksi baru...</div>
            ) : (
              trades.map((trade) => (
                <div key={trade.id} className="fade-in" style={{
                  display: 'flex',
                  fontSize: '0.78rem',
                  color: '#f8fafc',
                  padding: '4px 0',
                  alignItems: 'center',
                  animation: 'pulseGlow 1s ease'
                }}>
                  <div style={{ flex: 1, color: '#64748b' }}>{trade.time}</div>
                  <div style={{
                    width: '100px',
                    textAlign: 'right',
                    color: trade.isBuyerMaker ? '#ef4444' : '#10b981',
                    fontWeight: '600'
                  }}>
                    {formatPrice(trade.price)}
                  </div>
                  <div style={{ width: '80px', textAlign: 'right', color: '#f8fafc' }}>
                    {formatQty(trade.quantity)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
