import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import url from 'url';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

import { connectDB, sequelize } from './config/db.js';
import { seedDatabase } from './services/seed.js';
import { matcher } from './services/orderMatcher.js';
import apiRouter from './routes/api.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey123!';

const app = express();

app.use(cors());
app.use(express.json());

// Main API Routing Gateway
app.use('/api', apiRouter);

// Health Check Root
app.get('/', (req, res) => {
  res.json({ message: 'Cryptocurrency Exchange Simulator server is online.' });
});

// Setup HTTP Server & WebSocket Server
const httpServer = createServer(app);
const wss = new WebSocketServer({ noServer: true });

// Sync WebSocket Server with Order Matcher
matcher.setWsServer(wss);

// Authenticate WebSocket Connections securely using JWT query params
httpServer.on('upgrade', (request, socket, head) => {
  const pathname = url.parse(request.url).pathname;

  if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws, req) => {
  const parameters = url.parse(req.url, true).query;
  const token = parameters.token;

  if (!token) {
    ws.close(4001, 'Unauthorized. JWT Token missing.');
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    ws.userId = decoded.id;
    ws.username = decoded.username;
    ws.role = decoded.role;

    console.log(`[WS CONNECTED] User connected: ${ws.username} (ID: ${ws.userId})`);

    // Instantly send initial portfolio balances and positions on connection
    matcher.broadcastUserUpdate(ws.userId);

  } catch (err) {
    ws.close(4002, 'Unauthorized. Invalid or expired token.');
    return;
  }

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message);
      if (parsed.type === 'SUBSCRIBE') {
        const symbol = parsed.symbol?.toUpperCase();
        const marketType = parsed.marketType || 'spot';
        
        if (!ws.subscribedSymbols) {
          ws.subscribedSymbols = new Set();
        }

        const majorSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'XRPUSDT'];
        
        if (symbol && !majorSymbols.includes(symbol)) {
          for (const sub of ws.subscribedSymbols) {
            const [, subSym] = sub.split(':');
            if (!majorSymbols.includes(subSym)) {
              ws.subscribedSymbols.delete(sub);
            }
          }
        }

        if (symbol) {
          ws.subscribedSymbols.add(`${marketType}:${symbol}`);
          console.log(`[WS SUBSCRIBE] User ${ws.username} subscribed to ${symbol} (${marketType})`);
          matcher.registerUserSubscription(symbol);
        }
      }
    } catch (err) {
      // quiet
    }
  });

  ws.on('close', () => {
    console.log(`[WS CLOSED] User disconnected: ${ws.username}`);
  });
});

// Start Database, Seed default balances, and spin up Server listeners
const startServer = async () => {
  try {
    // 1. Establish database connection
    await connectDB();

    // 2. Synchronize database schemas
    // In production change to alter: true or standard migrations
    const forceSync = process.env.NODE_ENV !== 'production';
    await sequelize.sync({ force: false }); // preserve data, seed acts only if empty
    console.log('PostgreSQL database schemas synchronized.');

    // 3. Seed default accounts (admin / archqi) and balance vaults
    await seedDatabase();

    // 4. Fire up background real-time surveillance Order Matcher
    matcher.start();

    // 5. Spin up HTTP & WS servers
    httpServer.listen(PORT, () => {
      console.log(`Exchange simulator listening on HTTP/WS port ${PORT}`);
    });

  } catch (error) {
    console.error('Fatal initialization error:', error.message);
    process.exit(1);
  }
};

startServer();
