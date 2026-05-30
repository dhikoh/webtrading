import React, { useState, useEffect, useRef } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';

export default function OrderBook({ activeSymbol, marketType, socket, onSelectPrice }) {
  const [bids, setBids] = useState([]);
  const [asks, setAsks] = useState([]);
  const [midPrice, setMidPrice] = useState(null);
  const [prevPrice, setPrevPrice] = useState(null);

  useEffect(() => {
    // 1. Clear books on symbol transition
    setBids([]);
    setAsks([]);
    setMidPrice(null);

    // 2. Attach relayed WebSocket message handler for real-time order depth
    const handleWsMessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'BINANCE_RELAY' && msg.stream.includes('@depth')) {
          const depth = msg.data;
          
          // Asks: tick.a (array of [price, qty])
          // Bids: tick.b (array of [price, qty])
          const rawAsks = depth.a || [];
          const rawBids = depth.b || [];

          // Map and cast to float
          const formattedAsks = rawAsks.slice(0, 8).map(a => [parseFloat(a[0]), parseFloat(a[1])]);
          const formattedBids = rawBids.slice(0, 8).map(b => [parseFloat(b[0]), parseFloat(b[1])]);

          // Calculate totals to draw relative depth background fills
          const maxAskQty = Math.max(...formattedAsks.map(a => a[1]), 1.0);
          const maxBidQty = Math.max(...formattedBids.map(b => b[1]), 1.0);

          setAsks(formattedAsks.map(a => ({ price: a[0], qty: a[1], depthPct: (a[1] / maxAskQty) * 100 })));
          setBids(formattedBids.map(b => ({ price: b[0], qty: b[1], depthPct: (b[1] / maxBidQty) * 100 })));

          if (formattedAsks.length > 0 && formattedBids.length > 0) {
            const calculatedMid = (formattedAsks[0][0] + formattedBids[0][0]) / 2;
            setMidPrice(prev => {
              setPrevPrice(prev);
              return calculatedMid;
            });
          }
        }
      } catch (err) {
        // quiet error
      }
    };

    if (socket) {
      console.log(`[OrderBook WS] Subscribing via active relayed stream connection.`);
      socket.addEventListener('message', handleWsMessage);
    }

    return () => {
      if (socket) {
        socket.removeEventListener('message', handleWsMessage);
      }
    };
  }, [activeSymbol, marketType, socket]);

  // Evaluate price ticks direction
  const priceColor = midPrice >= prevPrice ? 'var(--green-binance)' : 'var(--red-binance)';
  const PriceIcon = midPrice >= prevPrice ? ArrowUp : ArrowDown;

  return (
    <section className="trading-panel" style={{ gridColumn: '3', gridRow: '1', userSelect: 'none' }}>
      
      {/* Header bar */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', fontWeight: 600, fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
        <span>Order Book</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Real-time WS</span>
      </div>

      {/* Grid Header Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '6px 12px', color: 'var(--text-muted)', fontSize: '10px', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
        <span>Price ({activeSymbol.includes('USDT') || activeSymbol.includes('USDC') ? 'USDT' : 'Quote'})</span>
        <span style={{ textAlign: 'right' }}>Size</span>
        <span style={{ textAlign: 'right' }}>Total</span>
      </div>

      {/* Book Panel contents */}
      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* ASKS (Sells) - Sorted Descending so highest ask price is at very top */}
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column-reverse', overflow: 'hidden', justifyContent: 'flex-end' }}>
          {asks.map((a, idx) => (
            <div 
              key={`ask-${idx}-${a.price}`} 
              className="depth-row"
              onClick={() => onSelectPrice(a.price)}
            >
              <div className="depth-bar ask" style={{ width: `${Math.min(a.depthPct, 100)}%` }}></div>
              <span className="depth-val depth-price-ask">{a.price.toFixed(activeSymbol.includes('USDT') || activeSymbol.includes('USDC') ? 2 : 5)}</span>
              <span className="depth-val" style={{ color: 'var(--text-active)' }}>{a.qty.toFixed(4)}</span>
              <span className="depth-val" style={{ color: 'var(--text-muted)' }}>{(a.price * a.qty).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Large Spread & Mark Price Indicators */}
        <div style={{ 
          padding: '8px 12px', 
          backgroundColor: 'var(--bg-main)', 
          borderTop: '1px solid var(--border-color)', 
          borderBottom: '1px solid var(--border-color)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: '6px',
          zIndex: 1
        }}>
          {midPrice ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              fontFamily: 'monospace',
              fontSize: '15px', 
              fontWeight: 700, 
              color: priceColor,
              transition: 'color 0.2s ease'
            }}>
              <PriceIcon size={16} />
              <span>{midPrice.toFixed(activeSymbol.includes('USDT') || activeSymbol.includes('USDC') ? 2 : 5)}</span>
            </div>
          ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Establishing Feed...</span>
          )}
        </div>

        {/* BIDS (Buys) */}
        <div style={{ flex: '1', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {bids.map((b, idx) => (
            <div 
              key={`bid-${idx}-${b.price}`} 
              className="depth-row"
              onClick={() => onSelectPrice(b.price)}
            >
              <div className="depth-bar bid" style={{ width: `${Math.min(b.depthPct, 100)}%` }}></div>
              <span className="depth-val depth-price-bid">{b.price.toFixed(activeSymbol.includes('USDT') || activeSymbol.includes('USDC') ? 2 : 5)}</span>
              <span className="depth-val" style={{ color: 'var(--text-active)' }}>{b.qty.toFixed(4)}</span>
              <span className="depth-val" style={{ color: 'var(--text-muted)' }}>{(b.price * b.qty).toFixed(2)}</span>
            </div>
          ))}
        </div>

      </div>

    </section>
  );
}
