import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import CoinList from './components/CoinList';
import TradingChart from './components/TradingChart';
import OrderBook from './components/OrderBook';
import OrderPanel from './components/OrderPanel';
import BottomTabs from './components/BottomTabs';
import AcademyHelp from './components/AcademyHelp';
import Login from './components/Login';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('trade_token') || '');
  const [user, setUser] = useState(null);
  
  const [activeSymbol, setActiveSymbol] = useState('BTCUSDT');
  const [marketType, setMarketType] = useState('spot'); // 'spot' | 'futures'
  
  // Real-time account states
  const [wallets, setWallets] = useState([]);
  const [positions, setPositions] = useState([]);
  const [openOrders, setOpenOrders] = useState([]);
  
  // Dynamic tick states
  const [latestPrice, setLatestPrice] = useState(null);
  const [priceChangePercent, setPriceChangePercent] = useState('0.0');
  const [floatingPnLs, setFloatingPnLs] = useState({}); // positionId -> { markPrice, unrealizedPnL }
  
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isWsConnected, setIsWsConnected] = useState(false);
  
  const accountWsRef = useRef(null);

  // 1. Load User Profile on bootstrap
  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/auth/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setUser(data.user);
          setWallets(data.wallets);
        } else {
          // Token expired
          handleLogout();
        }
      } catch (err) {
        console.error('Failed to connect to backend api:', err);
      }
    };

    fetchProfile();
  }, [token]);

  // 2. Establish Real-time Account update stream via Backend WebSocket
  useEffect(() => {
    if (!token) return;

    const connectAccountStream = () => {
      const url = `ws://localhost:5000/ws?token=${token}`;
      console.log(`Establishing secure User Account WS stream: ${url}`);
      
      const ws = new WebSocket(url);
      accountWsRef.current = ws;

      ws.onopen = () => {
        setIsWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'ACCOUNT_UPDATE') {
            setWallets(data.wallets || []);
            setPositions(data.positions || []);
            setOpenOrders(data.openOrders || []);
          } 
          
          else if (data.type === 'POSITION_PNL_UPDATE') {
            setFloatingPnLs(prev => ({
              ...prev,
              [data.positionId]: {
                markPrice: data.markPrice,
                unrealizedPnL: data.unrealizedPnL
              }
            }));
          }
        } catch (error) {
          // Quiet
        }
      };

      ws.onclose = () => {
        setIsWsConnected(false);
        // Automatically attempt reconnection in 4 seconds
        setTimeout(() => {
          if (token) connectAccountStream();
        }, 4000);
      };

      ws.onerror = (err) => {
        console.error('Account Stream WS error:', err.message);
      };
    };

    connectAccountStream();

    return () => {
      if (accountWsRef.current) {
        accountWsRef.current.close();
      }
    };
  }, [token]);

  const handleLoginSuccess = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('trade_token');
    localStorage.removeItem('trade_user');
    setToken('');
    setUser(null);
    setWallets([]);
    setPositions([]);
    setOpenOrders([]);
    setFloatingPnLs({});
  };

  const handleSelectSymbol = (symbol, mType) => {
    setActiveSymbol(symbol.toUpperCase());
    setMarketType(mType);
    setLatestPrice(null); // Reset price index to wait for new tick
  };

  const handleRefreshAccount = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:5000/api/auth/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setWallets(data.wallets);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePriceTick = (price) => {
    setLatestPrice(prev => {
      // Calculate dynamic mock daily changes from actual ticker movements
      if (prev) {
        const change = ((price - prev) / prev) * 100;
        setPriceChangePercent(change.toFixed(2));
      }
      return price;
    });
  };

  // If unauthorized, overlay the custom authentication modal card
  if (!token || !user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container">
      
      {/* Top Banner Navigation Tickers */}
      <Header 
        activeSymbol={activeSymbol}
        marketType={marketType}
        latestPrice={latestPrice}
        priceChangePercent={priceChangePercent}
        user={user}
        onLogout={handleLogout}
        onOpenHelp={() => setIsHelpOpen(true)}
        isWsConnected={isWsConnected}
      />

      {/* Main Core Columns Workspace Grid */}
      <main className="main-layout">
        
        {/* Leftmost Col: Market Sidebar Selector */}
        <CoinList 
          activeSymbol={activeSymbol}
          marketType={marketType}
          onSelectSymbol={handleSelectSymbol}
        />

        {/* Center Top: Technical Chart */}
        <TradingChart 
          activeSymbol={activeSymbol}
          marketType={marketType}
          onPriceTick={handlePriceTick}
        />

        {/* Rightmost Top: Order Book */}
        <OrderBook 
          activeSymbol={activeSymbol}
          marketType={marketType}
          onSelectPrice={(price) => setLatestPrice(price)}
        />

        {/* Rightmost Bottom: Dynamic Order Entry Form Panel */}
        <OrderPanel 
          activeSymbol={activeSymbol}
          marketType={marketType}
          latestPrice={latestPrice}
          userWallet={wallets}
          onSubmitSuccess={handleRefreshAccount}
        />

        {/* Center Bottom: Positions, Open Orders, Balances, and Super Admin Command Panel */}
        <BottomTabs 
          user={user}
          wallets={wallets}
          positions={positions}
          openOrders={openOrders}
          onRefresh={handleRefreshAccount}
          floatingPnLs={floatingPnLs}
        />

      </main>

      {/* Interactive Academy Help Popover */}
      <AcademyHelp 
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

    </div>
  );
}
