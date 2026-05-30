import WebSocket from 'ws';
import { sequelize, Order, Position, Wallet, TradeHistory, TransactionLedger, User } from '../models/index.js';
import { Op } from 'sequelize';

class OrderMatcher {
  constructor() {
    this.activeStreams = new Map(); // symbol -> { spotWs, futuresWs }
    this.wsServer = null; // Reference to our client WebSocket server to broadcast updates
    this.latestPrices = { spot: {}, futures: {} }; // symbol -> price
    this.userSubscribedSymbols = new Set(); // set of active symbols watched by browsers
  }

  setWsServer(wsServer) {
    this.wsServer = wsServer;
  }

  // Broadcast real-time balance & position changes to a specific user
  async broadcastUserUpdate(userId) {
    if (!this.wsServer) return;

    try {
      const wallets = await Wallet.findAll({ where: { userId } });
      const positions = await Position.findAll({ where: { userId } });
      const openOrders = await Order.findAll({ 
        where: { userId, status: 'PENDING' } 
      });

      const message = JSON.stringify({
        type: 'ACCOUNT_UPDATE',
        wallets,
        positions,
        openOrders
      });

      this.wsServer.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client.userId === userId) {
          client.send(message);
        }
      });
    } catch (err) {
      console.error('Error broadcasting user update:', err.message);
    }
  }

  // Start the background surveillance scanner
  start() {
    console.log('Background Order Matcher Worker started.');
    
    // Scan every 3 seconds to ensure we are listening to active trading pairs
    setInterval(() => this.scanActiveSymbols(), 3000);
    
    // Periodically recalculate floating Futures PnLs and check liquidations
    setInterval(() => this.evaluateFuturesRiskAndPnL(), 1000);
  }

  registerUserSubscription(symbol) {
    if (!symbol) return;
    const lower = symbol.toLowerCase();
    if (!this.userSubscribedSymbols.has(lower)) {
      this.userSubscribedSymbols.add(lower);
      this.scanActiveSymbols(); // Trigger instant connection on demand
    }
  }

  async scanActiveSymbols() {
    try {
      // Find all symbols with pending orders or open positions
      const pendingOrders = await Order.findAll({
        where: { status: 'PENDING' },
        attributes: ['symbol', 'marketType'],
        group: ['symbol', 'marketType']
      });

      const activePositions = await Position.findAll({
        attributes: ['symbol'],
        group: ['symbol']
      });

      const symbolsToWatch = new Map(); // symbol -> { spot: bool, futures: bool }

      pendingOrders.forEach(o => {
        const symbol = o.symbol.toLowerCase();
        if (!symbolsToWatch.has(symbol)) {
          symbolsToWatch.set(symbol, { spot: false, futures: false });
        }
        const st = symbolsToWatch.get(symbol);
        if (o.marketType === 'spot') st.spot = true;
        if (o.marketType === 'futures') st.futures = true;
      });

      activePositions.forEach(p => {
        const symbol = p.symbol.toLowerCase();
        if (!symbolsToWatch.has(symbol)) {
          symbolsToWatch.set(symbol, { spot: false, futures: false });
        }
        symbolsToWatch.get(symbol).futures = true;
      });

      // Inject all user-subscribed viewports
      for (const subSymbol of this.userSubscribedSymbols) {
        const symbolLower = subSymbol.toLowerCase();
        if (!symbolsToWatch.has(symbolLower)) {
          symbolsToWatch.set(symbolLower, { spot: true, futures: true });
        } else {
          symbolsToWatch.get(symbolLower).spot = true;
          symbolsToWatch.get(symbolLower).futures = true;
        }
      }

      // Always ensure we watch BTCUSDT as a standard heartbeat
      if (!symbolsToWatch.has('btcusdt')) {
        symbolsToWatch.set('btcusdt', { spot: true, futures: true });
      }

      // Check differences and sync websocket streams
      for (const [symbol, needs] of symbolsToWatch.entries()) {
        let stream = this.activeStreams.get(symbol);
        if (!stream) {
          stream = { spotWs: null, futuresWs: null };
          this.activeStreams.set(symbol, stream);
        }

        // Spot WS
        if (needs.spot && !stream.spotWs) {
          this.connectWebSocket(symbol, 'spot');
        } else if (!needs.spot && stream.spotWs) {
          stream.spotWs.close();
          stream.spotWs = null;
        }

        // Futures WS
        if (needs.futures && !stream.futuresWs) {
          this.connectWebSocket(symbol, 'futures');
        } else if (!needs.futures && stream.futuresWs) {
          stream.futuresWs.close();
          stream.futuresWs = null;
        }
      }

      // Cleanup inactive streams
      for (const symbol of this.activeStreams.keys()) {
        if (!symbolsToWatch.has(symbol)) {
          const stream = this.activeStreams.get(symbol);
          if (stream.spotWs) stream.spotWs.close();
          if (stream.futuresWs) stream.futuresWs.close();
          this.activeStreams.delete(symbol);
        }
      }
    } catch (error) {
      console.error('Error in scanActiveSymbols:', error.message);
    }
  }

  connectWebSocket(symbol, type) {
    const stream = this.activeStreams.get(symbol);
    
    // Connect to Bybit's public websocket (which is 100% unblocked globally by cloud IPs)
    const url = type === 'spot'
      ? `wss://stream.bybit.com/v5/public/spot`
      : `wss://stream.bybit.com/v5/public/linear`;

    console.log(`Connecting matching engine WS via Bybit (${type}): ${url} for ${symbol.toUpperCase()}`);
    const ws = new WebSocket(url);

    ws.on('open', () => {
      console.log(`[Bybit WS Opened] Subscribing topics for ${symbol.toUpperCase()} (${type})`);
      const subPayload = JSON.stringify({
        op: 'subscribe',
        args: [
          `publicTrade.${symbol.toUpperCase()}`,
          `kline.1.${symbol.toUpperCase()}`,
          `orderbook.50.${symbol.toUpperCase()}`,
          `tickers.${symbol.toUpperCase()}`
        ]
      });
      ws.send(subPayload);
    });

    ws.on('message', async (data) => {
      try {
        const payload = JSON.parse(data);
        const topic = payload.topic;
        const tick = payload.data;
        if (!topic || !tick) return;

        // 1. Handle trades to trigger the internal order matching engine
        if (topic.startsWith('publicTrade.')) {
          const latestTrade = tick[0];
          if (latestTrade) {
            const price = parseFloat(latestTrade.p);
            this.latestPrices[type][symbol.toUpperCase()] = price;
            await this.matchOrdersForSymbol(symbol.toUpperCase(), price, type);

            // Relay trade to client in expected Binance @trade format
            if (this.wsServer) {
              const relayMsg = JSON.stringify({
                type: 'BINANCE_RELAY',
                stream: `${symbol.toLowerCase()}@trade`,
                marketType: type,
                data: {
                  p: latestTrade.p,
                  q: latestTrade.q,
                  t: latestTrade.T
                }
              });
              this.relayToSubscribedClients(symbol.toUpperCase(), type, relayMsg);
            }
          }
        }

        // 2. Handle klines - format to Binance stream kline format
        else if (topic.startsWith('kline.1.')) {
          const kline = tick[0];
          if (kline && this.wsServer) {
            const relayMsg = JSON.stringify({
              type: 'BINANCE_RELAY',
              stream: `${symbol.toLowerCase()}@kline_1m`,
              marketType: type,
              data: {
                k: {
                  t: kline.start,
                  o: kline.open,
                  h: kline.high,
                  l: kline.low,
                  c: kline.close,
                  v: kline.volume
                }
              }
            });
            this.relayToSubscribedClients(symbol.toUpperCase(), type, relayMsg);
          }
        }

        // 3. Handle Order Book depth - format to Binance stream depth format
        else if (topic.startsWith('orderbook.')) {
          if (this.wsServer) {
            const relayMsg = JSON.stringify({
              type: 'BINANCE_RELAY',
              stream: `${symbol.toLowerCase()}@depth20@100ms`,
              marketType: type,
              data: {
                a: tick.a || [],
                b: tick.b || []
              }
            });
            this.relayToSubscribedClients(symbol.toUpperCase(), type, relayMsg);
          }
        }

        // 4. Handle 24h Ticker statistics - format to Binance stream ticker format
        else if (topic.startsWith('tickers.')) {
          const last = parseFloat(tick.lastPrice || tick.last_price);
          const prev = parseFloat(tick.prevPrice24h || tick.prev_price_24h || tick.lastPrice);
          const changePct = prev ? ((last - prev) / prev) * 100 : 0.00;

          if (this.wsServer) {
            const relayMsg = JSON.stringify({
              type: 'BINANCE_RELAY',
              stream: `${symbol.toLowerCase()}@ticker`,
              marketType: type,
              data: {
                c: tick.lastPrice || tick.last_price,
                P: changePct.toFixed(2)
              }
            });
            this.relayToSubscribedClients(symbol.toUpperCase(), type, relayMsg);
          }
        }
      } catch (err) {
        // Suppress json parsing errors
      }
    });

    ws.on('close', () => {
      const currentStream = this.activeStreams.get(symbol);
      if (currentStream && ((type === 'spot' && currentStream.spotWs === ws) || (type === 'futures' && currentStream.futuresWs === ws))) {
        if (type === 'spot') currentStream.spotWs = null;
        if (type === 'futures') currentStream.futuresWs = null;
      }
    });

    ws.on('error', (err) => {
      console.error(`WebSocket error on ${symbol} (${type}):`, err.message);
    });

    if (type === 'spot') stream.spotWs = ws;
    if (type === 'futures') stream.futuresWs = ws;
  }

  // Broadcast helper to target users watching this specific viewport
  relayToSubscribedClients(symbol, type, message) {
    if (!this.wsServer) return;
    this.wsServer.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN &&
          client.activeSymbol === symbol &&
          client.activeMarketType === type) {
        client.send(message);
      }
    });
  }

  // High-performance matching engine execution for a specific ticker price update
  async matchOrdersForSymbol(symbol, price, type) {
    const t = await sequelize.transaction();
    try {
      // Fetch all pending orders for this symbol and market type
      const orders = await Order.findAll({
        where: {
          symbol,
          marketType: type,
          status: 'PENDING'
        },
        transaction: t,
        lock: true
      });

      for (const order of orders) {
        let isTriggered = false;

        // 1. Process standard Limit Order triggers
        if (order.type === 'LIMIT') {
          if (order.side === 'BUY' && price <= order.price) {
            isTriggered = true;
          } else if (order.side === 'SELL' && price >= order.price) {
            isTriggered = true;
          }
        }
        
        // 2. Process Stop-Limit & Stop-Market triggers
        else if (order.type === 'STOP_LIMIT' || order.type === 'STOP_MARKET') {
          // If buy stop (typically breakout, stop price is above current market)
          // If sell stop (typically stop loss, stop price is below current market)
          // For safety we detect price crossing stop price from either direction
          const prevPrice = this.latestPrices[type][symbol] || price;
          const stopPrice = order.stopPrice;

          if (prevPrice < stopPrice && price >= stopPrice) {
            isTriggered = true;
          } else if (prevPrice > stopPrice && price <= stopPrice) {
            isTriggered = true;
          }
        }

        // 3. Process Trailing Stop triggers
        else if (order.type === 'TRAILING_STOP') {
          const callback = parseFloat(order.callbackRate) / 100.0;
          let watermark = order.watermarkPrice ? parseFloat(order.watermarkPrice) : price;

          if (order.side === 'SELL') { // Long trailing stop (sell top reversal)
            if (price > watermark) {
              watermark = price;
              order.watermarkPrice = watermark;
              await order.save({ transaction: t });
            }
            const triggerPrice = watermark * (1 - callback);
            if (price <= triggerPrice) {
              isTriggered = true;
            }
          } else { // Short trailing stop (buy bottom reversal)
            if (price < watermark) {
              watermark = price;
              order.watermarkPrice = watermark;
              await order.save({ transaction: t });
            }
            const triggerPrice = watermark * (1 + callback);
            if (price >= triggerPrice) {
              isTriggered = true;
            }
          }
        }

        if (isTriggered) {
          if (order.type === 'STOP_LIMIT') {
            // Converts Stop-Limit order into a standard active active LIMIT order
            order.type = 'LIMIT';
            order.stopPrice = null;
            await order.save({ transaction: t });
            console.log(`[STOP TRIGGER] Converted Stop-Limit order ${order.id} on ${symbol} to Limit.`);
          } else {
            // Fill Market/Limit/Stop-Market/Trailing-Stop orders
            await this.executeOrderFill(order, price, t);
          }
        }
      }

      await t.commit();
    } catch (error) {
      await t.rollback();
      console.error(`Error processing match for ${symbol}:`, error.message);
    }
  }

  // Complete atomic settlement for an order filling in the database
  async executeOrderFill(order, fillPrice, transaction) {
    console.log(`[ORDER MATCH FILL] Filling order ${order.id} (${order.side} ${order.symbol} ${order.type}) at price ${fillPrice}`);

    if (order.marketType === 'spot') {
      await this.fillSpotOrder(order, fillPrice, transaction);
    } else {
      await this.fillFuturesOrder(order, fillPrice, transaction);
    }

    order.status = 'FILLED';
    order.price = fillPrice;
    await order.save({ transaction });

    // Defer broadcast after transaction commits successfully
    transaction.afterCommit(() => {
      this.broadcastUserUpdate(order.userId);
    });
  }

  async fillSpotOrder(order, price, t) {
    // Escrow Model Resolution
    const totalCost = order.quantity * price;

    if (order.side === 'BUY') {
      // User placed Buy order: USDT was already escrowed.
      // Now, we add the base asset (e.g. BTC) to the wallet
      const baseAsset = order.symbol.replace('USDT', '').replace('USDC', '').replace('BNB', '').replace('BTC', '');
      const quoteAsset = order.symbol.replace(baseAsset, '');

      let baseWallet = await Wallet.findOne({
        where: { userId: order.userId, walletType: 'spot', asset: baseAsset },
        transaction: t
      });

      if (!baseWallet) {
        baseWallet = await Wallet.create({
          userId: order.userId,
          walletType: 'spot',
          asset: baseAsset,
          balance: 0.0
        }, { transaction: t });
      }

      const beforeBal = baseWallet.balance;
      baseWallet.balance = beforeBal + order.quantity;
      await baseWallet.save({ transaction: t });

      // Record transaction ledger for receiving asset
      await TransactionLedger.create({
        userId: order.userId,
        walletId: baseWallet.id,
        transactionType: 'SPOT_TRADE',
        asset: baseAsset,
        amount: order.quantity,
        beforeBalance: beforeBal,
        afterBalance: baseWallet.balance,
        description: `Spot Buy filled on ${order.symbol}. Received ${order.quantity} ${baseAsset}`
      }, { transaction: t });

      // Log trade history
      await TradeHistory.create({
        userId: order.userId,
        symbol: order.symbol,
        side: 'BUY',
        price,
        quantity: order.quantity,
        realizedPnL: 0.0,
        tradeType: 'SPOT'
      }, { transaction: t });

    } else {
      // User placed Sell order: Base asset (e.g. BTC) was already escrowed.
      // Now, we credit quote asset USDT to their wallet
      const baseAsset = order.symbol.replace('USDT', '').replace('USDC', '').replace('BNB', '').replace('BTC', '');
      const quoteAsset = order.symbol.replace(baseAsset, '');

      let quoteWallet = await Wallet.findOne({
        where: { userId: order.userId, walletType: 'spot', asset: quoteAsset },
        transaction: t
      });

      if (!quoteWallet) {
        quoteWallet = await Wallet.create({
          userId: order.userId,
          walletType: 'spot',
          asset: quoteAsset,
          balance: 0.0
        }, { transaction: t });
      }

      const beforeBal = quoteWallet.balance;
      quoteWallet.balance = beforeBal + totalCost;
      await quoteWallet.save({ transaction: t });

      // Record ledger
      await TransactionLedger.create({
        userId: order.userId,
        walletId: quoteWallet.id,
        transactionType: 'SPOT_TRADE',
        asset: quoteAsset,
        amount: totalCost,
        beforeBalance: beforeBal,
        afterBalance: quoteWallet.balance,
        description: `Spot Sell filled on ${order.symbol}. Received ${totalCost} ${quoteAsset}`
      }, { transaction: t });

      // Log trade history
      await TradeHistory.create({
        userId: order.userId,
        symbol: order.symbol,
        side: 'SELL',
        price,
        quantity: order.quantity,
        realizedPnL: 0.0,
        tradeType: 'SPOT'
      }, { transaction: t });
    }
  }

  async fillFuturesOrder(order, price, t) {
    const leverage = order.positionSide ? await this.getUserLeverageForSymbol(order.userId, order.symbol, t) : 20;
    
    // Check if user has an existing active position on this symbol
    let position = await Position.findOne({
      where: { userId: order.userId, symbol: order.symbol },
      transaction: t
    });

    const isBuy = order.side === 'BUY';
    const fillSize = order.quantity;

    let wallet = await Wallet.findOne({
      where: { userId: order.userId, walletType: 'futures', asset: 'USDT' },
      transaction: t
    });

    if (!wallet) throw new Error('Futures wallet not found for user');

    // 1. Double-check reduceOnly logic triggers
    if (order.reduceOnly && !position) {
      // Reject filling reduce-only since no position exists
      order.status = 'REJECTED';
      await order.save({ transaction: t });
      console.log(`[REDUCE_ONLY REJECT] Cancelled active reduceOnly order ${order.id} on ${order.symbol} due to missing position.`);
      return;
    }

    if (!position) {
      // Open a brand new position
      const initialMargin = (fillSize * price) / leverage;
      
      // Margin release from order escrow (Limit order locks margin, if market order it locks wallet margin)
      // Since our controller locks margin upon limit order placement, we release order escrow or deduct from wallet
      // To simplify, our database transaction will deduct needed initial margin from futures balance
      const beforeBal = wallet.balance;
      wallet.balance = beforeBal - initialMargin;
      await wallet.save({ transaction: t });

      await TransactionLedger.create({
        userId: order.userId,
        walletId: wallet.id,
        transactionType: 'FUTURES_MARGIN_LOCK',
        asset: 'USDT',
        amount: -initialMargin,
        beforeBalance: beforeBal,
        afterBalance: wallet.balance,
        description: `Opened ${order.side} position on ${order.symbol} with ${leverage}x leverage. Margin Locked: ${initialMargin.toFixed(4)} USDT`
      }, { transaction: t });

      const side = isBuy ? 'LONG' : 'SHORT';
      const liquidationPrice = this.calculateLiquidationPrice(side, price, initialMargin, fillSize, 0.004); // MMR = 0.4%

      position = await Position.create({
        userId: order.userId,
        symbol: order.symbol,
        side,
        size: fillSize,
        entryPrice: price,
        leverage,
        marginType: 'ISOLATED', // isolated by default
        margin: initialMargin,
        liquidationPrice
      }, { transaction: t });

      // Log trade history
      await TradeHistory.create({
        userId: order.userId,
        symbol: order.symbol,
        side: order.side,
        price,
        quantity: fillSize,
        realizedPnL: 0.0,
        tradeType: 'FUTURES'
      }, { transaction: t });

    } else {
      // Accumulate or reduce/close existing position (Netting Mode)
      const sameDirection = (position.side === 'LONG' && isBuy) || (position.side === 'SHORT' && !isBuy);

      if (sameDirection) {
        // Accumulate position size (averaging entry price)
        const oldSize = position.size;
        const oldEntry = position.entryPrice;
        const newSize = oldSize + fillSize;
        const newEntry = ((oldSize * oldEntry) + (fillSize * price)) / newSize;
        const additionalMargin = (fillSize * price) / position.leverage;

        // Deduct extra margin from wallet
        const beforeBal = wallet.balance;
        wallet.balance = beforeBal - additionalMargin;
        await wallet.save({ transaction: t });

        await TransactionLedger.create({
          userId: order.userId,
          walletId: wallet.id,
          transactionType: 'FUTURES_MARGIN_LOCK',
          asset: 'USDT',
          amount: -additionalMargin,
          beforeBalance: beforeBal,
          afterBalance: wallet.balance,
          description: `Accumulated ${position.side} position on ${order.symbol}. Margin locked: ${additionalMargin.toFixed(4)} USDT`
        }, { transaction: t });

        position.size = newSize;
        position.entryPrice = newEntry;
        position.margin = position.margin + additionalMargin;
        position.liquidationPrice = this.calculateLiquidationPrice(position.side, newEntry, position.margin, newSize, 0.004);
        await position.save({ transaction: t });

        await TradeHistory.create({
          userId: order.userId,
          symbol: order.symbol,
          side: order.side,
          price,
          quantity: fillSize,
          realizedPnL: 0.0,
          tradeType: 'FUTURES'
        }, { transaction: t });

      } else {
        // Opposite direction: reduces or closes the active position
        const oldSize = position.size;
        const oldEntry = position.entryPrice;

        if (fillSize >= oldSize) {
          // Complete position closure + PnL realization
          let pnl = 0.0;
          if (position.side === 'LONG') {
            pnl = oldSize * (price - oldEntry);
          } else {
            pnl = oldSize * (oldEntry - price);
          }

          // Return isolated position margin + realized PnL back to wallet balance
          const totalReturned = position.margin + pnl;
          const beforeBal = wallet.balance;
          wallet.balance = beforeBal + totalReturned;
          await wallet.save({ transaction: t });

          // Record margin release ledger
          await TransactionLedger.create({
            userId: order.userId,
            walletId: wallet.id,
            transactionType: 'FUTURES_MARGIN_RELEASE',
            asset: 'USDT',
            amount: position.margin,
            beforeBalance: beforeBal,
            afterBalance: beforeBal + position.margin,
            description: `Released isolated position margin upon closing ${position.side} on ${order.symbol}`
          }, { transaction: t });

          // Record PnL realized ledger
          await TransactionLedger.create({
            userId: order.userId,
            walletId: wallet.id,
            transactionType: 'FUTURES_REALIZED_PNL',
            asset: 'USDT',
            amount: pnl,
            beforeBalance: beforeBal + position.margin,
            afterBalance: wallet.balance,
            description: `Realized PnL from closing ${position.side} on ${order.symbol}. PnL: ${pnl.toFixed(4)} USDT`
          }, { transaction: t });

          // Delete position from active position books
          await position.destroy({ transaction: t });

          // Log trade history
          await TradeHistory.create({
            userId: order.userId,
            symbol: order.symbol,
            side: order.side,
            price,
            quantity: oldSize,
            realizedPnL: pnl,
            tradeType: 'FUTURES'
          }, { transaction: t });

          // Cascading reduce-only cancellations for this user symbol
          await Order.update({ status: 'CANCELLED' }, {
            where: { userId: order.userId, symbol: order.symbol, reduceOnly: true, status: 'PENDING' },
            transaction: t
          });

          // Check if there is remaining size (in case order is larger than active position)
          const overshootSize = fillSize - oldSize;
          if (overshootSize > 0 && !order.reduceOnly) {
            // Open opposite position with remaining overshoot size
            const newMargin = (overshootSize * price) / leverage;
            const bB = wallet.balance;
            wallet.balance = bB - newMargin;
            await wallet.save({ transaction: t });

            await TransactionLedger.create({
              userId: order.userId,
              walletId: wallet.id,
              transactionType: 'FUTURES_MARGIN_LOCK',
              asset: 'USDT',
              amount: -newMargin,
              beforeBalance: bB,
              afterBalance: wallet.balance,
              description: `Opened reversed ${order.side === 'BUY' ? 'LONG' : 'SHORT'} position on ${order.symbol} due to position netting overflow. Size: ${overshootSize}`
            }, { transaction: t });

            const reverseSide = position.side === 'LONG' ? 'SHORT' : 'LONG';
            const liquidationPrice = this.calculateLiquidationPrice(reverseSide, price, newMargin, overshootSize, 0.004);

            await Position.create({
              userId: order.userId,
              symbol: order.symbol,
              side: reverseSide,
              size: overshootSize,
              entryPrice: price,
              leverage,
              marginType: 'ISOLATED',
              margin: newMargin,
              liquidationPrice
            }, { transaction: t });
          }

        } else {
          // Partial position reduction
          let pnl = 0.0;
          if (position.side === 'LONG') {
            pnl = fillSize * (price - oldEntry);
          } else {
            pnl = fillSize * (oldEntry - price);
          }

          // Release proportional margin locked + PnL
          const marginToRelease = (fillSize / oldSize) * position.margin;
          const totalReturned = marginToRelease + pnl;
          const beforeBal = wallet.balance;
          wallet.balance = beforeBal + totalReturned;
          await wallet.save({ transaction: t });

          // Margins released
          await TransactionLedger.create({
            userId: order.userId,
            walletId: wallet.id,
            transactionType: 'FUTURES_MARGIN_RELEASE',
            asset: 'USDT',
            amount: marginToRelease,
            beforeBalance: beforeBal,
            afterBalance: beforeBal + marginToRelease,
            description: `Released proportional isolated margin upon partial close of ${position.side} on ${order.symbol}`
          }, { transaction: t });

          // Realized PnL
          await TransactionLedger.create({
            userId: order.userId,
            walletId: wallet.id,
            transactionType: 'FUTURES_REALIZED_PNL',
            asset: 'USDT',
            amount: pnl,
            beforeBalance: beforeBal + marginToRelease,
            afterBalance: wallet.balance,
            description: `Realized PnL from partial close of ${position.side} on ${order.symbol}. PnL: ${pnl.toFixed(4)} USDT`
          }, { transaction: t });

          // Save reduced position parameters
          position.size = oldSize - fillSize;
          position.margin = position.margin - marginToRelease;
          position.liquidationPrice = this.calculateLiquidationPrice(position.side, oldEntry, position.margin, position.size, 0.004);
          await position.save({ transaction: t });

          // Log trade history
          await TradeHistory.create({
            userId: order.userId,
            symbol: order.symbol,
            side: order.side,
            price,
            quantity: fillSize,
            realizedPnL: pnl,
            tradeType: 'FUTURES'
          }, { transaction: t });
        }
      }
    }
  }

  // Formula to calculate exact isolated liquidation price
  calculateLiquidationPrice(side, entryPrice, margin, size, mmr) {
    if (side === 'LONG') {
      // Liq Price Long = (EntryPrice * Size - Margin) / (Size * (1 - MMR))
      return (entryPrice * size - margin) / (size * (1 - mmr));
    } else {
      // Liq Price Short = (EntryPrice * Size + Margin) / (Size * (1 + MMR))
      return (entryPrice * size + margin) / (size * (1 + mmr));
    }
  }

  // Retrieve user selected leverage setting for this symbol (defaults to 20)
  async getUserLeverageForSymbol(userId, symbol, transaction) {
    const position = await Position.findOne({
      where: { userId, symbol },
      attributes: ['leverage'],
      transaction
    });
    return position ? position.leverage : 20;
  }

  // High performance calculation for active floating futures positions and triggering liquidation risk
  async evaluateFuturesRiskAndPnL() {
    try {
      const activePositions = await Position.findAll();
      if (activePositions.length === 0) return;

      for (const pos of activePositions) {
        const symbol = pos.symbol.toUpperCase();
        const markPrice = this.latestPrices.futures[symbol.toLowerCase()] || this.latestPrices.spot[symbol.toLowerCase()];

        if (!markPrice) continue;

        // Isolated liquidation check
        let isLiquidated = false;
        if (pos.side === 'LONG' && markPrice <= pos.liquidationPrice) {
          isLiquidated = true;
        } else if (pos.side === 'SHORT' && markPrice >= pos.liquidationPrice) {
          isLiquidated = true;
        }

        if (isLiquidated) {
          await this.liquidateIsolatedPosition(pos, markPrice);
        } else {
          // Calculate dynamic unrealized PnL and broadcast to client websocket
          let upnl = 0.0;
          if (pos.side === 'LONG') {
            upnl = pos.size * (markPrice - pos.entryPrice);
          } else {
            upnl = pos.size * (pos.entryPrice - markPrice);
          }

          // Broadcast floating updates
          if (this.wsServer) {
            const message = JSON.stringify({
              type: 'POSITION_PNL_UPDATE',
              userId: pos.userId,
              positionId: pos.id,
              markPrice,
              unrealizedPnL: upnl
            });
            this.wsServer.clients.forEach(client => {
              if (client.readyState === WebSocket.OPEN && client.userId === pos.userId) {
                client.send(message);
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('Error evaluating futures risk:', error.message);
    }
  }

  // Atomic execution for isolated position liquidation
  async liquidateIsolatedPosition(position, markPrice) {
    console.log(`[LIQUIDATION TRIGGERED] Liquidating user ${position.userId} isolated ${position.side} position on ${position.symbol} at mark price ${markPrice}`);

    const t = await sequelize.transaction();
    try {
      const wallet = await Wallet.findOne({
        where: { userId: position.userId, walletType: 'futures', asset: 'USDT' },
        transaction: t,
        lock: true
      });

      // Liquidating position means entire margin allocated is lost to the System Insurance Fund
      const lostMargin = position.margin;

      await TransactionLedger.create({
        userId: position.userId,
        walletId: wallet.id,
        transactionType: 'LIQUIDATION_PENALTY',
        asset: 'USDT',
        amount: -lostMargin,
        beforeBalance: wallet.balance + lostMargin, // wallet.balance was already subtracted on open
        afterBalance: wallet.balance,
        description: `Forced Margin Liquidation on ${position.symbol} Isolated ${position.side}. Collateral margin of ${lostMargin.toFixed(4)} USDT forfeited to System Insurance Fund.`
      }, { transaction: t });

      // Log trade history as LIQUIDATION
      await TradeHistory.create({
        userId: position.userId,
        symbol: position.symbol,
        side: position.side === 'LONG' ? 'SELL' : 'BUY',
        price: position.liquidationPrice,
        quantity: position.size,
        realizedPnL: -lostMargin,
        tradeType: 'LIQUIDATION'
      }, { transaction: t });

      // Cascade delete the active position
      await position.destroy({ transaction: t });

      // Cascade cancel all active reduce-only limit orders
      await Order.update({ status: 'CANCELLED' }, {
        where: { userId: position.userId, symbol: position.symbol, reduceOnly: true, status: 'PENDING' },
        transaction: t
      });

      await t.commit();
      console.log(`[LIQUIDATION SUCCESS] Cleaned position database records for user ${position.userId}.`);
      
      this.broadcastUserUpdate(position.userId);
    } catch (err) {
      await t.rollback();
      console.error('Error during Isolated Liquidation transaction:', err.message);
    }
  }
}

export const matcher = new OrderMatcher();
