import React from 'react';
import { X, HelpCircle, ShieldAlert, TrendingUp, Layers } from 'lucide-react';

export default function AcademyHelp({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '650px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-gold)', fontWeight: 600, fontSize: '15px' }}>
            <HelpCircle size={20} />
            <span>Bybit Academy Trading Simulator Manual</span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ fontSize: '12.5px', color: 'var(--text-active)' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary-gold)', fontWeight: 600 }}>
              <TrendingUp size={16} />
              <span>1. Trailing Stop Callback Mechanics</span>
            </div>
            <p style={{ color: 'var(--text-muted)' }}>
              A trailing stop is a dynamic order that tracks the price movement of an asset.
            </p>
            <ul style={{ paddingLeft: '20px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li><strong>Sell Stop (Long Profit-Take):</strong> If price goes up, the watermark price rises with it. If price drops from that peak by the <strong>Callback Rate (e.g., 1%)</strong>, it triggers a Market Sell order.</li>
              <li><strong>Buy Stop (Short Profit-Take):</strong> If price falls, the watermark falls with it. If price rises from that bottom peak by the <strong>Callback Rate</strong>, it triggers a Market Buy order.</li>
              <li>This allows you to lock in maximum profits during strong market runs without cutting your gains short!</li>
            </ul>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--green-bybit)', fontWeight: 600 }}>
              <Layers size={16} />
              <span>2. Leverage and Position Initial Margin</span>
            </div>
            <p style={{ color: 'var(--text-muted)' }}>
              Leverage allows you to open positions much larger than your actual account balance.
            </p>
            <ul style={{ paddingLeft: '20px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li><strong>Initial Margin Formula:</strong> <code style={{ color: 'var(--text-active)' }}>Margin = (Size × Entry Price) / Leverage</code>.</li>
              <li>For example, opening a 1 BTC Long position at $60,000 with <strong>20x Leverage</strong> requires only <strong>$3,000 USDT</strong> of isolated margin collateral.</li>
              <li><strong>Available Balance Constraints:</strong> You cannot open new positions or transfer funds out of your Futures Wallet if doing so drops your available margin below active locked levels.</li>
            </ul>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--red-bybit)', fontWeight: 600 }}>
              <ShieldAlert size={16} />
              <span>3. Maintenance Margin & Isolated Liquidation Price</span>
            </div>
            <p style={{ color: 'var(--text-muted)' }}>
              If the market moves against your position, your isolated margin balance decreases due to floating Unrealized PnL.
            </p>
            <ul style={{ paddingLeft: '20px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li><strong>Maintenance Margin Requirement (MMR):</strong> In this simulator, MMR is fixed at <strong>0.4%</strong>.</li>
              <li>If your position's margin + unrealized PnL falls below MMR, your position is forcefully **liquidated**.</li>
              <li><strong>Isolated Liquidation Price Formula:</strong></li>
              <li style={{ listStyle: 'none', margin: '6px 0', padding: '6px', backgroundColor: 'var(--bg-main)', borderRadius: '4px', fontFamily: 'monospace' }}>
                <span style={{ color: 'var(--green-bybit)' }}>Long:</span> Liq Price = (Entry Price × Size - Margin) / [Size × (1 - 0.004)]<br />
                <span style={{ color: 'var(--red-bybit)' }}>Short:</span> Liq Price = (Entry Price × Size + Margin) / [Size × (1 + 0.004)]
              </li>
              <li>When liquidated, the allocated isolated margin is lost to the System Insurance Fund, preventing account balance deficits.</li>
            </ul>
          </div>

        </div>

        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', backgroundColor: 'var(--bg-main)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
          <button className="btn-primary" onClick={onClose} style={{ padding: '8px 16px' }}>
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}
