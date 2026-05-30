import express from 'express';
import { register, login, getProfile } from '../controllers/authController.js';
import { placeOrder, cancelOrder, transferFunds, getOpenOrders, getPositions, getTradeHistory, closePosition } from '../controllers/tradeController.js';
import { getAllUsersData, adjustUserBalance, getAdminLogs } from '../controllers/adminController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { fetchSpotExchangeInfo, fetchFuturesExchangeInfo } from '../services/exchangeInfo.js';

const router = express.Router();

// ----------------------------------------------------
// PUBLIC EXCHANGE MARKET INFO ENDPOINTS
// ----------------------------------------------------
router.get('/market/spot-info', async (req, res) => {
  const info = await fetchSpotExchangeInfo();
  res.json(info);
});

router.get('/market/futures-info', async (req, res) => {
  const info = await fetchFuturesExchangeInfo();
  res.json(info);
});

router.get('/market/test-connectivity', async (req, res) => {
  const results = {};
  
  // Test Bybit Official V5 Time API
  try {
    const t0 = Date.now();
    const resBybit = await fetch('https://api.bytick.com/v5/market/time');
    results.bybit = {
      ok: resBybit.ok,
      status: resBybit.status,
      statusText: resBybit.statusText,
      latencyMs: Date.now() - t0
    };
  } catch (err) {
    results.bybit = { error: err.message };
  }

  res.json(results);
});

router.get('/market/klines', async (req, res) => {
  try {
    const { symbol, marketType, interval, limit } = req.query;
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }
    
    // Map intervals from Binance format to Bybit format
    const intervalMap = {
      '1m': '1',
      '5m': '5',
      '15m': '15',
      '1h': '60',
      '1d': 'D'
    };
    const bybitInterval = intervalMap[interval] || '1';
    const category = marketType === 'futures' ? 'linear' : 'spot';
    
    const url = `https://api.bytick.com/v5/market/kline?category=${category}&symbol=${symbol.toUpperCase()}&interval=${bybitInterval}&limit=${limit || 300}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch from Bybit: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (data.retCode !== 0 || !data.result || !data.result.list) {
      throw new Error(`Bybit error: ${data.retMsg}`);
    }

    // Convert Bybit list [[start, open, high, low, close, volume, turnover], ...] 
    // to expected frontend Lightweight Charts format: chronological array of [time, open, high, low, close, volume]
    const formattedKlines = data.result.list.map(k => [
      parseInt(k[0]), // start time in ms
      parseFloat(k[1]), // open
      parseFloat(k[2]), // high
      parseFloat(k[3]), // low
      parseFloat(k[4]), // close
      parseFloat(k[5]), // volume
      parseFloat(k[6]), // turnover
      parseInt(k[0]) + (parseInt(bybitInterval) * 60000 || 60000) // close time
    ]).reverse(); // Bybit returns reverse order, we need chronological

    res.json(formattedKlines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// AUTHENTICATION ROUTES
// ----------------------------------------------------
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/profile', authenticateToken, getProfile);

// ----------------------------------------------------
// TRADING & BALANCES ROUTES
// ----------------------------------------------------
router.post('/trade/order', authenticateToken, placeOrder);
router.delete('/trade/order/:orderId', authenticateToken, cancelOrder);
router.post('/trade/transfer', authenticateToken, transferFunds);
router.get('/trade/open-orders', authenticateToken, getOpenOrders);
router.get('/trade/positions', authenticateToken, getPositions);
router.get('/trade/history', authenticateToken, getTradeHistory);
router.post('/trade/close-position', authenticateToken, closePosition);

// ----------------------------------------------------
// SUPER ADMIN CONSOLE ROUTES
// ----------------------------------------------------
router.get('/admin/users', authenticateToken, requireAdmin, getAllUsersData);
router.post('/admin/adjust-balance', authenticateToken, requireAdmin, adjustUserBalance);
router.get('/admin/logs', authenticateToken, requireAdmin, getAdminLogs);

export default router;
