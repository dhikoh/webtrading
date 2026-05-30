'use client';

import { useState, useRef } from 'react';

export default function ChartView({ candles = [], indicators = {}, targetLines = null }) {
  const [hoveredCandle, setHoveredCandle] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  if (!candles || candles.length === 0) {
    return (
      <div style={{
        height: '350px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px dashed var(--border-color)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--text-muted)'
      }}>
        Belum ada data grafik yang dimuat.
      </div>
    );
  }

  // Define dimensions
  const width = 800;
  const height = 350;
  const paddingRight = 60;
  const paddingBottom = 30;
  const paddingTop = 20;
  const paddingLeft = 20;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Min/Max prices for scaling
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const maxPrice = Math.max(...highs);
  const minPrice = Math.min(...lows);
  const priceRange = maxPrice - minPrice;

  // Scale functions
  const getX = (index) => {
    return paddingLeft + (index / (candles.length - 1)) * chartWidth;
  };

  const getY = (price) => {
    if (priceRange === 0) return height / 2;
    return height - paddingBottom - ((price - minPrice) / priceRange) * chartHeight;
  };

  const handleMouseMove = (e, candle, index) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setHoveredCandle({ candle, index });
    setTooltipPos({ x: x + 15, y: y - 10 });
  };

  const handleMouseLeave = () => {
    setHoveredCandle(null);
  };

  // Compile path for EMAs
  const buildEmaPath = (emaArray) => {
    if (!emaArray || emaArray.length === 0) return '';
    let path = '';
    emaArray.forEach((val, idx) => {
      if (val !== null && val !== undefined) {
        const x = getX(idx);
        const y = getY(val);
        path += (path === '' ? 'M' : 'L') + ` ${x} ${y}`;
      }
    });
    return path;
  };

  const emaFastPath = buildEmaPath(indicators.emaFast);
  const emaSlowPath = buildEmaPath(indicators.emaSlow);

  return (
    <div style={{ position: 'relative', width: '100%' }} ref={containerRef}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" style={{ background: 'transparent' }}>
        {/* Y Axis Grid Lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const price = minPrice + priceRange * ratio;
          const y = getY(price);
          return (
            <g key={i}>
              <line 
                x1={paddingLeft} 
                y1={y} 
                x2={width - paddingRight} 
                y2={y} 
                stroke="var(--border-color)" 
                strokeWidth="0.5" 
                strokeDasharray="4 4" 
              />
              <text 
                x={width - paddingRight + 8} 
                y={y + 4} 
                fill="var(--text-muted)" 
                fontSize="10" 
                fontFamily="inherit"
              >
                ${price.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Candlesticks */}
        {candles.map((candle, idx) => {
          const x = getX(idx);
          const yOpen = getY(candle.open);
          const yClose = getY(candle.close);
          const yHigh = getY(candle.high);
          const yLow = getY(candle.low);
          
          const isBullish = candle.close >= candle.open;
          const strokeColor = isBullish ? 'var(--color-success)' : 'var(--color-danger)';
          const fillColor = isBullish ? 'var(--color-success-bg)' : 'var(--color-danger)';
          
          const candleWidth = Math.max(2, (chartWidth / candles.length) * 0.7);

          return (
            <g key={idx}>
              {/* Wick Shadow Line */}
              <line 
                x1={x} 
                y1={yHigh} 
                x2={x} 
                y2={yLow} 
                stroke={strokeColor} 
                strokeWidth="1.2" 
              />
              
              {/* Real Body Block */}
              <rect
                x={x - candleWidth / 2}
                y={Math.min(yOpen, yClose)}
                width={candleWidth}
                height={Math.max(1.5, Math.abs(yOpen - yClose))}
                fill={isBullish ? 'transparent' : fillColor}
                stroke={strokeColor}
                strokeWidth="1.5"
                rx="1"
              />

              {/* Invisible interactive zone for hover */}
              <rect
                x={x - chartWidth / (candles.length * 2)}
                y={paddingTop}
                width={chartWidth / candles.length}
                height={chartHeight}
                fill="transparent"
                onMouseMove={(e) => handleMouseMove(e, candle, idx)}
                onMouseLeave={handleMouseLeave}
                style={{ cursor: 'crosshair' }}
              />
            </g>
          );
        })}

        {/* Technical Indicators: EMA lines */}
        {emaFastPath && (
          <path 
            d={emaFastPath} 
            fill="none" 
            stroke="var(--accent-primary)" 
            strokeWidth="1.8" 
            style={{ filter: 'drop-shadow(0 0 2px var(--accent-primary-glow))' }}
          />
        )}
        {emaSlowPath && (
          <path 
            d={emaSlowPath} 
            fill="none" 
            stroke="var(--accent-secondary)" 
            strokeWidth="1.8" 
            style={{ filter: 'drop-shadow(0 0 2px var(--accent-secondary-glow))' }}
          />
        )}

        {/* Swing Points Highs / Lows Indicators */}
        {indicators.srZones && indicators.srZones.map((zone, zIdx) => {
          const y = getY(zone.centerPrice);
          if (y < paddingTop || y > height - paddingBottom) return null;
          return (
            <line
              key={zIdx}
              x1={paddingLeft}
              y1={y}
              x2={width - paddingRight}
              y2={y}
              stroke={zone.type === 'SUPPORT' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(239, 68, 68, 0.15)'}
              strokeWidth={Math.min(4, zone.touches)}
            />
          );
        })}

        {/* Overlay target price markers (SL / TP / Entry) */}
        {targetLines && (
          <>
            {/* Entry Price */}
            {targetLines.entryPrice && (
              <g>
                <line 
                  x1={paddingLeft} 
                  y1={getY(targetLines.entryPrice)} 
                  x2={width - paddingRight} 
                  y2={getY(targetLines.entryPrice)} 
                  stroke="var(--accent-secondary)" 
                  strokeWidth="1.5" 
                  strokeDasharray="2 2" 
                />
                <text x={paddingLeft + 10} y={getY(targetLines.entryPrice) - 6} fill="var(--accent-secondary)" fontSize="9" fontWeight="600">
                  ENTRY: ${targetLines.entryPrice.toFixed(2)}
                </text>
              </g>
            )}

            {/* Stop Loss */}
            {targetLines.stopLoss && (
              <g>
                <line 
                  x1={paddingLeft} 
                  y1={getY(targetLines.stopLoss)} 
                  x2={width - paddingRight} 
                  y2={getY(targetLines.stopLoss)} 
                  stroke="var(--color-danger)" 
                  strokeWidth="1.5" 
                  strokeDasharray="3 3" 
                />
                <text x={paddingLeft + 10} y={getY(targetLines.stopLoss) - 6} fill="var(--color-danger)" fontSize="9" fontWeight="600">
                  STOP LOSS: ${targetLines.stopLoss.toFixed(2)}
                </text>
              </g>
            )}

            {/* Take Profits */}
            {targetLines.tp1 && (
              <g>
                <line 
                  x1={paddingLeft} 
                  y1={getY(targetLines.tp1)} 
                  x2={width - paddingRight} 
                  y2={getY(targetLines.tp1)} 
                  stroke="var(--color-success)" 
                  strokeWidth="1.5" 
                  strokeDasharray="3 3" 
                />
                <text x={paddingLeft + 10} y={getY(targetLines.tp1) - 6} fill="var(--color-success)" fontSize="9" fontWeight="600">
                  TP1: ${targetLines.tp1.toFixed(2)}
                </text>
              </g>
            )}
          </>
        )}
      </svg>

      {/* Tooltip Overlay */}
      {hoveredCandle && (
        <div style={{
          position: 'absolute',
          left: tooltipPos.x,
          top: tooltipPos.y,
          background: 'var(--bg-main)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          padding: '8px 12px',
          pointerEvents: 'none',
          fontSize: '0.75rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          zIndex: 10
        }}>
          <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
            Candle #{hoveredCandle.index}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '4px 10px', color: 'var(--text-secondary)' }}>
            <span>Buka:</span><span style={{ color: 'white' }}>${hoveredCandle.candle.open.toFixed(2)}</span>
            <span>Tinggi:</span><span style={{ color: 'var(--color-success)' }}>${hoveredCandle.candle.high.toFixed(2)}</span>
            <span>Rendah:</span><span style={{ color: 'var(--color-danger)' }}>${hoveredCandle.candle.low.toFixed(2)}</span>
            <span>Tutup:</span><span style={{ color: 'white' }}>${hoveredCandle.candle.close.toFixed(2)}</span>
            <span>Volume:</span><span style={{ color: 'var(--accent-secondary)' }}>{hoveredCandle.candle.volume.toFixed(0)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
