import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import CoinList from './components/CoinList';
import TradingChart from './components/TradingChart';
import OrderBook from './components/OrderBook';
import OrderPanel from './components/OrderPanel';
import BottomTabs from './components/BottomTabs';
import AcademyHelp from './components/AcademyHelp';
import Login from './components/Login';
import { API_URL, WS_URL } from './config.js';

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
  const [clickPriceObj, setClickPriceObj] = useState(null);
  const [priceChangePercent, setPriceChangePercent] = useState('0.0');
  const [floatingPnLs, setFloatingPnLs] = useState({}); // positionId -> { markPrice, unrealizedPnL }
  const [priceCache, setPriceCache] = useState({}); // symbol -> { price, changePct }
  
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [lang, setLang] = useState(() => localStorage.getItem('trade_lang') || 'id');
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    localStorage.setItem('trade_lang', lang);
  }, [lang]);
  
  const accountWsRef = useRef(null);

  // Unified Account & Trade State Synchronizer
  const fetchAccountDetails = async () => {
    if (!token) return;
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [profileRes, ordersRes, positionsRes] = await Promise.all([
        fetch(`${API_URL}/api/auth/profile`, { headers }),
        fetch(`${API_URL}/api/trade/open-orders`, { headers }),
        fetch(`${API_URL}/api/trade/positions`, { headers })
      ]);

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setUser(profileData.user);
        setWallets(profileData.wallets);
      } else if (profileRes.status === 401 || profileRes.status === 403) {
        handleLogout();
        return;
      }
      
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOpenOrders(ordersData);
      }
      
      if (positionsRes.ok) {
        const positionsData = await positionsRes.json();
        setPositions(positionsData);
      }
    } catch (err) {
      console.error('Failed to sync account details:', err);
    }
  };

  // 1. Load User Profile and details on bootstrap
  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    fetchAccountDetails();
  }, [token]);

  // 2. Establish Real-time Account update stream via Backend WebSocket
  useEffect(() => {
    if (!token) return;

    const connectAccountStream = () => {
      const url = `${WS_URL}/ws?token=${token}`;
      console.log(`Establishing secure User Account WS stream: ${url}`);
      
      const ws = new WebSocket(url);

      accountWsRef.current = ws;
      setSocket(ws);

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

          // Extract relayed ticker updates for real-time header changes
          else if (data.type === 'BYBIT_RELAY' && data.stream.includes('@ticker')) {
            const ticker = data.data;
            if (ticker) {
              const tickerPrice = parseFloat(ticker.c);
              const tickerChange = parseFloat(ticker.P).toFixed(2);
              const streamSymbol = data.stream.split('@')[0].toUpperCase();
              
              if (streamSymbol === activeSymbol.toUpperCase()) {
                setLatestPrice(tickerPrice);
                setPriceChangePercent(tickerChange);
              }

              // Update global price cache for NAV and CoinList
              if (streamSymbol) {
                setPriceCache(prev => ({
                  ...prev,
                  [streamSymbol]: { price: tickerPrice, changePct: tickerChange }
                }));
              }
            }
          }

          // Extract relayed trades for ultra-low latency real-time price updates
          else if (data.type === 'BYBIT_RELAY' && data.stream.includes('@trade')) {
            const trade = data.data;
            if (trade && trade.p) {
              const tradePrice = parseFloat(trade.p);
              const streamSymbol = data.stream.split('@')[0].toUpperCase();

              if (streamSymbol === activeSymbol.toUpperCase()) {
                setLatestPrice(tradePrice);
              }

              // Update global price cache
              if (streamSymbol) {
                setPriceCache(prev => ({
                  ...prev,
                  [streamSymbol]: { ...prev[streamSymbol], price: tradePrice }
                }));
              }
            }
          }
        } catch (error) {
          // Quiet
        }
      };

      ws.onclose = () => {
        setIsWsConnected(false);
        setSocket(null);
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
      setSocket(null);
    };
  }, [token]);

  // Send WS subscription for selected symbol viewport
  useEffect(() => {
    if (isWsConnected && accountWsRef.current && accountWsRef.current.readyState === WebSocket.OPEN) {
      const subMsg = JSON.stringify({
        type: 'SUBSCRIBE',
        symbol: activeSymbol,
        marketType: marketType
      });
      console.log(`[WS] Sending SUBSCRIBE viewport for ${activeSymbol} (${marketType})`);
      accountWsRef.current.send(subMsg);
    }
  }, [isWsConnected, activeSymbol, marketType]);

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
    setClickPriceObj(null);
  };

  const handleRefreshAccount = async () => {
    await fetchAccountDetails();
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
    return <Login lang={lang} setLang={setLang} onLoginSuccess={handleLoginSuccess} />;
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
        wallets={wallets}
        onLogout={handleLogout}
        onOpenHelp={() => setIsHelpOpen(true)}
        isWsConnected={isWsConnected}
        lang={lang}
        setLang={setLang}
        priceCache={priceCache}
      />

      {/* Main Core Columns Workspace Grid */}
      <main className="main-layout">
        
        {/* Leftmost Col: Market Sidebar Selector */}
        <CoinList 
          activeSymbol={activeSymbol}
          marketType={marketType}
          onSelectSymbol={handleSelectSymbol}
          lang={lang}
          socket={socket}
          priceCache={priceCache}
        />

        {/* Center Top: Technical Chart */}
        <TradingChart 
          activeSymbol={activeSymbol}
          marketType={marketType}
          socket={socket}
          onPriceTick={handlePriceTick}
          lang={lang}
        />

        {/* Rightmost Top: Order Book */}
        <OrderBook 
          activeSymbol={activeSymbol}
          marketType={marketType}
          socket={socket}
          onSelectPrice={(price) => setClickPriceObj({ price, timestamp: Date.now() })}
          lang={lang}
        />

        {/* Rightmost Bottom: Dynamic Order Entry Form Panel */}
        <OrderPanel 
          activeSymbol={activeSymbol}
          marketType={marketType}
          latestPrice={latestPrice}
          clickPriceObj={clickPriceObj}
          userWallet={wallets}
          onSubmitSuccess={handleRefreshAccount}
          lang={lang}
        />

        {/* Center Bottom: Positions, Open Orders, Balances, and Super Admin Command Panel */}
        <BottomTabs 
          user={user}
          wallets={wallets}
          positions={positions}
          openOrders={openOrders}
          onRefresh={handleRefreshAccount}
          floatingPnLs={floatingPnLs}
          lang={lang}
          priceCache={priceCache}
          activeSymbol={activeSymbol}
          marketType={marketType}
        />

      </main>

      {/* Interactive Academy Help Popover */}
      <AcademyHelp 
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        lang={lang}
      />

    </div>
  );
}
