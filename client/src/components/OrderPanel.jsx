import React, { useState, useEffect } from 'react';
import { AlertCircle, ShieldAlert } from 'lucide-react';
import { API_URL } from '../config.js';

export default function OrderPanel({ 
  activeSymbol, 
  marketType, 
  latestPrice, 
  userWallet, 
  onSubmitSuccess 
}) {
  const [side, setSide] = useState('BUY'); // 'BUY' | 'SELL'
  const [orderType, setOrderType] = useState('LIMIT'); // 'LIMIT' | 'MARKET' | 'STOP_LIMIT' | 'STOP_MARKET' | 'TRAILING_STOP'
  
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [callbackRate, setCallbackRate] = useState('1.0'); // Trailing stop callback percentage
  
  const [leverage, setLeverage] = useState(20);
  const [reduceOnly, setReduceOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const baseAsset = activeSymbol.replace('USDT', '').replace('USDC', '').replace('BNB', '').replace('BTC', '');
  const quoteAsset = activeSymbol.replace(baseAsset, '');

  // Synchronize price field if user clicks order book price or live ticks
  useEffect(() => {
    if (latestPrice && orderType !== 'MARKET' && !price) {
      setPrice(latestPrice.toString());
    }
  }, [latestPrice, orderType]);

  // Adjust order panel input states on symbol or type changes
  useEffect(() => {
    setError('');
    setSuccessMsg('');
  }, [activeSymbol, marketType, orderType]);

  // Search user wallet for specific assets balances
  const getAvailableBalance = () => {
    if (!userWallet) return 0;
    
    if (marketType === 'spot') {
      if (side === 'BUY') {
        const wallet = userWallet.find(w => w.walletType === 'spot' && w.asset === quoteAsset);
        return wallet ? parseFloat(wallet.balance) : 0.0;
      } else {
        const wallet = userWallet.find(w => w.walletType === 'spot' && w.asset === baseAsset);
        return wallet ? parseFloat(wallet.balance) : 0.0;
      }
    } else {
      // Futures settled in USDT
      const wallet = userWallet.find(w => w.walletType === 'futures' && w.asset === 'USDT');
      return wallet ? parseFloat(wallet.balance) : 0.0;
    }
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const token = localStorage.getItem('trade_token');
    if (!token) {
      setError('Session expired. Please log in again.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        symbol: activeSymbol,
        marketType,
        side,
        type: orderType,
        quantity: parseFloat(quantity),
        price: orderType === 'MARKET' ? null : parseFloat(price),
        stopPrice: (orderType === 'STOP_LIMIT' || orderType === 'STOP_MARKET') ? parseFloat(stopPrice) : null,
        callbackRate: orderType === 'TRAILING_STOP' ? parseFloat(callbackRate) : null,
        positionSide: marketType === 'futures' ? (side === 'BUY' ? 'LONG' : 'SHORT') : null,
        reduceOnly: marketType === 'futures' ? reduceOnly : false
      };

      const res = await fetch(`${API_URL}/api/trade/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit order.');
      }

      setSuccessMsg(data.message);
      setQuantity('');
      setStopPrice('');
      
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePercentageClick = (pct) => {
    const balance = getAvailableBalance();
    if (balance <= 0) return;

    if (marketType === 'spot') {
      if (side === 'BUY') {
        const orderPrice = orderType === 'MARKET' ? (latestPrice || 0) : parseFloat(price || 0);
        if (orderPrice <= 0) return;
        const totalUsdtToSpend = balance * pct;
        setQuantity((totalUsdtToSpend / orderPrice).toFixed(4));
      } else {
        setQuantity((balance * pct).toFixed(4));
      }
    } else {
      // Futures buying power based on leverage
      const orderPrice = orderType === 'MARKET' ? (latestPrice || 0) : parseFloat(price || 0);
      if (orderPrice <= 0) return;
      const marginAllocation = balance * pct;
      const positionValueToOpen = marginAllocation * leverage;
      setQuantity((positionValueToOpen / orderPrice).toFixed(4));
    }
  };

  const orderTypesList = ['LIMIT', 'MARKET', 'STOP_LIMIT', 'STOP_MARKET', 'TRAILING_STOP'];

  return (
    <section className="trading-panel" style={{ gridColumn: '3', gridRow: '2', display: 'flex', flexDirection: 'column' }}>
      
      {/* Side buy/sell action switch */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', height: '35px' }}>
        <button
          style={{
            flex: 1,
            backgroundColor: side === 'BUY' ? 'var(--green-binance)' : 'transparent',
            color: side === 'BUY' ? '#000' : 'var(--text-muted)',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            fontSize: '12px',
            transition: 'all 0.15s ease'
          }}
          onClick={() => setSide('BUY')}
        >
          BUY (Long)
        </button>
        <button
          style={{
            flex: 1,
            backgroundColor: side === 'SELL' ? 'var(--red-binance)' : 'transparent',
            color: side === 'SELL' ? '#000' : 'var(--text-muted)',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            fontSize: '12px',
            transition: 'all 0.15s ease'
          }}
          onClick={() => setSide('SELL')}
        >
          SELL (Short)
        </button>
      </div>

      {/* Order formulation body */}
      <form onSubmit={handlePlaceOrder} style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }}>
        
        {/* Order Type selectors dropdown */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginBottom: '4px' }}>
          {orderTypesList.map(type => (
            <button
              key={type}
              type="button"
              style={{
                fontSize: '9.5px',
                padding: '3px 6px',
                borderRadius: '2px',
                background: orderType === type ? 'var(--primary-gold)' : 'var(--bg-input)',
                color: orderType === type ? '#000' : 'var(--text-active)',
                border: '1px solid',
                borderColor: orderType === type ? 'var(--primary-gold)' : 'var(--border-color)',
                cursor: 'pointer',
                fontWeight: orderType === type ? '600' : '400'
              }}
              onClick={() => setOrderType(type)}
            >
              {type.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Futures specific: Leverage Slider overlay */}
        {marketType === 'futures' && (
          <div style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '10px', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldAlert size={11} style={{ color: 'var(--primary-gold)' }} />
                <span>Adjust Leverage:</span>
              </span>
              <span style={{ color: 'var(--primary-gold)', fontWeight: 700, fontSize: '12px' }}>{leverage}x</span>
            </div>
            
            <input
              type="range"
              min="1"
              max="125"
              step="1"
              value={leverage}
              onChange={(e) => setLeverage(parseInt(e.target.value))}
              className="range-slider"
            />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)' }}>
              <span>1x</span>
              <span>25x</span>
              <span>50x</span>
              <span>75x</span>
              <span>100x</span>
              <span>125x</span>
            </div>
          </div>
        )}

        {/* Inputs Cards */}
        {orderType !== 'MARKET' && (
          <div className="form-group">
            <label>Price ({quoteAsset})</label>
            <input
              type="number"
              step="any"
              className="form-input"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>
        )}

        <div className="form-group">
          <label>Quantity ({baseAsset})</label>
          <input
            type="number"
            step="any"
            className="form-input"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>

        {/* Conditional Stop Trigger field */}
        {(orderType === 'STOP_LIMIT' || orderType === 'STOP_MARKET') && (
          <div className="form-group" style={{ borderLeft: '2px solid var(--primary-gold)', paddingLeft: '8px' }}>
            <label style={{ color: 'var(--primary-gold)' }}>Stop Price Trigger ({quoteAsset})</label>
            <input
              type="number"
              step="any"
              className="form-input"
              value={stopPrice}
              onChange={(e) => setStopPrice(e.target.value)}
              placeholder="Trigger Price"
              required
            />
          </div>
        )}

        {/* Conditional Trailing Stop parameters fields */}
        {orderType === 'TRAILING_STOP' && (
          <div className="form-group" style={{ borderLeft: '2px solid var(--primary-gold)', paddingLeft: '8px' }}>
            <label style={{ color: 'var(--primary-gold)' }}>Trailing Callback Rate (%)</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="5.0"
              className="form-input"
              value={callbackRate}
              onChange={(e) => setCallbackRate(e.target.value)}
              placeholder="e.g. 1.0 for 1%"
              required
            />
            <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Tracks extreme watermark. Triggers buy/sell on {callbackRate}% reversal peak.
            </span>
          </div>
        )}

        {/* Quick Percentages sizing widgets */}
        <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
          {[0.25, 0.50, 0.75, 1.0].map((pct, idx) => (
            <button
              key={idx}
              type="button"
              className="tab-btn"
              style={{
                padding: '4px 0',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: '3px',
                fontSize: '10px'
              }}
              onClick={() => handlePercentageClick(pct)}
            >
              {pct * 100}%
            </button>
          ))}
        </div>

        {/* Futures specific: Reduce-Only checkbox */}
        {marketType === 'futures' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
            <input
              type="checkbox"
              id="reduce-only-check"
              checked={reduceOnly}
              onChange={(e) => setReduceOnly(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <label htmlFor="reduce-only-check" style={{ color: 'var(--text-active)', fontSize: '11px', cursor: 'pointer', userSelect: 'none' }}>
              Reduce-Only (Enforce Position Size Reduction)
            </label>
          </div>
        )}

        {/* Errors & Alerts Displays */}
        {error && (
          <div style={{ color: 'var(--red-binance)', fontSize: '11.5px', backgroundColor: 'var(--red-binance-light)', padding: '8px', borderRadius: '4px', display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px' }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div style={{ color: 'var(--green-binance)', fontSize: '11.5px', backgroundColor: 'var(--green-binance-light)', padding: '8px', borderRadius: '4px', display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px' }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Collateral Ledger Available details */}
        <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Available Margin:</span>
          <span style={{ fontWeight: 600, color: 'var(--text-active)' }}>
            {getAvailableBalance().toFixed(4)} {marketType === 'futures' ? 'USDT' : (side === 'BUY' ? quoteAsset : baseAsset)}
          </span>
        </div>

        {/* Place Order CTA Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            backgroundColor: side === 'BUY' ? 'var(--green-binance)' : 'var(--red-binance)',
            color: '#000',
            fontWeight: 700,
            fontSize: '13.5px',
            border: 'none',
            borderRadius: '4px',
            padding: '10px',
            cursor: 'pointer',
            marginTop: '6px',
            width: '100%',
            transition: 'opacity 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          {loading ? 'Submitting...' : `${side === 'BUY' ? 'Buy Long' : 'Sell Short'} ${baseAsset}`}
        </button>

      </form>

    </section>
  );
}
