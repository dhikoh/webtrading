import React, { useState, useEffect } from 'react';
import { AlertCircle, ShieldAlert } from 'lucide-react';
import { API_URL } from '../config.js';

export default function OrderPanel({ 
  activeSymbol, 
  marketType, 
  latestPrice, 
  clickPriceObj, 
  userWallet, 
  onSubmitSuccess,
  lang = 'id'
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

  let quoteAsset = 'USDT';
  let baseAsset = activeSymbol;
  if (activeSymbol.endsWith('USDT')) {
    quoteAsset = 'USDT';
    baseAsset = activeSymbol.slice(0, -4);
  } else if (activeSymbol.endsWith('USDC')) {
    quoteAsset = 'USDC';
    baseAsset = activeSymbol.slice(0, -4);
  } else if (activeSymbol.endsWith('BTC')) {
    quoteAsset = 'BTC';
    baseAsset = activeSymbol.slice(0, -3);
  } else if (activeSymbol.endsWith('BNB')) {
    quoteAsset = 'BNB';
    baseAsset = activeSymbol.slice(0, -3);
  }

  // Translations
  const t = {
    id: {
      buyLong: 'BELI (Long)',
      sellShort: 'JUAL (Short)',
      adjustLev: 'Sesuaikan Leverage:',
      priceLabel: 'Harga',
      qtyLabel: 'Kuantitas',
      stopTrigger: 'Pemicu Harga Stop',
      triggerPlaceholder: 'Harga Pemicu',
      callbackLabel: 'Rasio Callback Trailing (%)',
      reversalHelp: `Melacak titik ekstrem. Memicu beli/jual pada pembalikan arah sebesar ${callbackRate}%.`,
      reduceOnly: 'Reduce-Only (Kurangi Posisi Saja)',
      available: 'Margin Tersedia:',
      submitting: 'Mengirimkan...',
      buyBtn: 'Beli Long',
      sellBtn: 'Jual Short',
      sessionError: 'Sesi berakhir. Silakan masuk kembali.',
      submitError: 'Gagal mengirimkan order.'
    },
    en: {
      buyLong: 'BUY (Long)',
      sellShort: 'SELL (Short)',
      adjustLev: 'Adjust Leverage:',
      priceLabel: 'Price',
      qtyLabel: 'Quantity',
      stopTrigger: 'Stop Price Trigger',
      triggerPlaceholder: 'Trigger Price',
      callbackLabel: 'Trailing Callback Rate (%)',
      reversalHelp: `Tracks extreme watermark. Triggers buy/sell on ${callbackRate}% reversal peak.`,
      reduceOnly: 'Reduce-Only (Enforce Position Size Reduction)',
      available: 'Available Margin:',
      submitting: 'Submitting...',
      buyBtn: 'Buy Long',
      sellBtn: 'Sell Short',
      sessionError: 'Session expired. Please log in again.',
      submitError: 'Failed to submit order.'
    }
  }[lang];

  const isFutures = marketType === 'futures';
  
  // Terminology overrides
  const buyTabText = isFutures
    ? (lang === 'id' ? 'BELI (Long)' : 'BUY (Long)')
    : (lang === 'id' ? 'BELI' : 'BUY');

  const sellTabText = isFutures
    ? (lang === 'id' ? 'JUAL (Short)' : 'SELL (Short)')
    : (lang === 'id' ? 'JUAL' : 'SELL');

  const availableLabel = isFutures
    ? (lang === 'id' ? 'Margin Tersedia:' : 'Available Margin:')
    : (lang === 'id' ? 'Saldo Tersedia:' : 'Available Balance:');

  const submitButtonText = loading
    ? t.submitting
    : isFutures
      ? (side === 'BUY' 
          ? (lang === 'id' ? `Beli Long ${baseAsset}` : `Buy Long ${baseAsset}`)
          : (lang === 'id' ? `Jual Short ${baseAsset}` : `Sell Short ${baseAsset}`))
      : (side === 'BUY'
          ? (lang === 'id' ? `Beli ${baseAsset}` : `Buy ${baseAsset}`)
          : (lang === 'id' ? `Jual ${baseAsset}` : `Sell ${baseAsset}`));

  const costLabel = isFutures
    ? (lang === 'id' ? 'Estimasi Margin:' : 'Est. Margin Cost:')
    : (lang === 'id' ? 'Total Nilai:' : 'Total Value:');
    
  const costUnit = isFutures ? 'USDT' : quoteAsset;

  const parsedPrice = parseFloat(price) || 0;
  const parsedQty = parseFloat(quantity) || 0;
  const orderPrice = orderType === 'MARKET' ? (latestPrice || 0) : parsedPrice;
  const totalCost = orderPrice * parsedQty;
  const marginCost = isFutures ? (totalCost / leverage) : totalCost;

  // Synchronize price field if user clicks order book price or live ticks
  useEffect(() => {
    if (latestPrice && orderType !== 'MARKET' && !price) {
      setPrice(latestPrice.toString());
    }
  }, [latestPrice, orderType]);

  // Synchronize price field if user explicitly clicked a price in the order book
  useEffect(() => {
    if (clickPriceObj && clickPriceObj.price) {
      setPrice(clickPriceObj.price.toString());
    }
  }, [clickPriceObj]);

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
      setError(t.sessionError);
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
        reduceOnly: marketType === 'futures' ? reduceOnly : false,
        leverage: marketType === 'futures' ? leverage : undefined
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
        throw new Error(data.error || t.submitError);
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
      
      {/* Trading Pair Header Info */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '10px 12px', 
        backgroundColor: '#1b2026', 
        borderBottom: '1px solid var(--border-color)',
        height: '40px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-active)' }}>
            {baseAsset}/{quoteAsset}
          </span>
          <span style={{ 
            fontSize: '9px', 
            fontWeight: 600, 
            padding: '2px 6px', 
            borderRadius: '10px', 
            backgroundColor: isFutures ? 'rgba(255, 177, 26, 0.15)' : 'rgba(14, 203, 129, 0.15)', 
            color: isFutures ? 'var(--primary-gold)' : 'var(--green-bybit)',
            textTransform: 'uppercase'
          }}>
            {marketType}
          </span>
        </div>
        {latestPrice && (
          <span style={{ 
            fontSize: '12px', 
            fontWeight: 600, 
            color: 'var(--text-active)' 
          }}>
            {latestPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
          </span>
        )}
      </div>

      {/* Side buy/sell action switch */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', height: '35px' }}>
        <button
          style={{
            flex: 1,
            backgroundColor: side === 'BUY' ? 'var(--green-bybit)' : 'transparent',
            color: side === 'BUY' ? '#000' : 'var(--text-muted)',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            fontSize: '12px',
            transition: 'all 0.15s ease'
          }}
          onClick={() => setSide('BUY')}
        >
          {buyTabText}
        </button>
        <button
          style={{
            flex: 1,
            backgroundColor: side === 'SELL' ? 'var(--red-bybit)' : 'transparent',
            color: side === 'SELL' ? '#000' : 'var(--text-muted)',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            fontSize: '12px',
            transition: 'all 0.15s ease'
          }}
          onClick={() => setSide('SELL')}
        >
          {sellTabText}
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
                <span>{t.adjustLev}</span>
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
            <label>{t.priceLabel} ({quoteAsset})</label>
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
          <label>{t.qtyLabel} ({baseAsset})</label>
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
            <label style={{ color: 'var(--primary-gold)' }}>{t.stopTrigger} ({quoteAsset})</label>
            <input
              type="number"
              step="any"
              className="form-input"
              value={stopPrice}
              onChange={(e) => setStopPrice(e.target.value)}
              placeholder={t.triggerPlaceholder}
              required
            />
          </div>
        )}

        {/* Conditional Trailing Stop parameters fields */}
        {orderType === 'TRAILING_STOP' && (
          <div className="form-group" style={{ borderLeft: '2px solid var(--primary-gold)', paddingLeft: '8px' }}>
            <label style={{ color: 'var(--primary-gold)' }}>{t.callbackLabel}</label>
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
              {t.reversalHelp}
            </span>
          </div>
        )}

        {/* Quick Percentages sizing widgets */}
        <div style={{ display: 'flex', gap: '5px', marginTop: '2px' }}>
          {[0.25, 0.50, 0.75, 1.0].map((pct, idx) => (
            <button
              key={idx}
              type="button"
              style={{
                flex: 1,
                padding: '6px 0',
                backgroundColor: '#242d35',
                border: 'none',
                borderRadius: '4px',
                color: 'var(--text-active)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2f3a44';
                e.currentTarget.style.color = 'var(--primary-gold)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#242d35';
                e.currentTarget.style.color = 'var(--text-active)';
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
              {t.reduceOnly}
            </label>
          </div>
        )}

        {/* Errors & Alerts Displays */}
        {error && (
          <div style={{ color: 'var(--red-bybit)', fontSize: '11.5px', backgroundColor: 'var(--red-bybit-light)', padding: '8px', borderRadius: '4px', display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px' }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div style={{ color: 'var(--green-bybit)', fontSize: '11.5px', backgroundColor: 'var(--green-bybit-light)', padding: '8px', borderRadius: '4px', display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px' }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Estimated Cost indicator card */}
        {(quantity && orderPrice > 0) ? (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '8px 10px',
            backgroundColor: 'rgba(255, 177, 26, 0.05)',
            border: '1px dashed rgba(255, 177, 26, 0.25)',
            borderRadius: '4px',
            fontSize: '11px',
            marginTop: '4px'
          }}>
            <span style={{ color: 'var(--text-muted)' }}>{costLabel}</span>
            <span style={{ fontWeight: 600, color: 'var(--primary-gold)' }}>
              {isFutures ? marginCost.toFixed(4) : totalCost.toFixed(2)} {costUnit}
            </span>
          </div>
        ) : null}

        {/* Collateral Ledger Available details */}
        <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
          <span style={{ color: 'var(--text-muted)' }}>{availableLabel}</span>
          <span style={{ fontWeight: 600, color: 'var(--primary-gold)' }}>
            {getAvailableBalance().toFixed(4)} {isFutures ? 'USDT' : (side === 'BUY' ? quoteAsset : baseAsset)}
          </span>
        </div>

        {/* Place Order CTA Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            backgroundColor: side === 'BUY' ? 'var(--green-bybit)' : 'var(--red-bybit)',
            color: '#000',
            fontWeight: 700,
            fontSize: '13px',
            border: 'none',
            borderRadius: '4px',
            padding: '10px',
            cursor: 'pointer',
            marginTop: '6px',
            width: '100%',
            transition: 'all 0.15s ease',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.filter = 'brightness(1.15)';
            e.currentTarget.style.transform = 'scale(1.01)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = 'none';
            e.currentTarget.style.transform = 'none';
          }}
        >
          {submitButtonText}
        </button>

      </form>

    </section>
  );
}
