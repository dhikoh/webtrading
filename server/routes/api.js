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
