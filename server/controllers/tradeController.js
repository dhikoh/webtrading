import { sequelize, Order, Position, Wallet, TradeHistory, TransactionLedger } from '../models/index.js';
import { matcher } from '../services/orderMatcher.js';
import { latestTickers } from '../services/exchangeInfo.js';

// Place a new Spot or Futures Order
export const placeOrder = async (req, res) => {
  const userId = req.user.id;
  const { symbol, marketType, side, type, price, quantity, stopPrice, callbackRate, positionSide, reduceOnly, leverage: reqLeverage } = req.body;

  if (!symbol || !marketType || !side || !type || !quantity) {
    return res.status(400).json({ error: 'Missing mandatory order parameters.' });
  }

  const numericQty = parseFloat(quantity);
  const numericPrice = price ? parseFloat(price) : null;
  const numericStop = stopPrice ? parseFloat(stopPrice) : null;
  const numericCallback = callbackRate ? parseFloat(callbackRate) : null;

  if (numericQty <= 0) {
    return res.status(400).json({ error: 'Quantity must be greater than zero.' });
  }

  const t = await sequelize.transaction();

  try {
    // 1. Resolve asset names from symbol (e.g. BTCUSDT -> base BTC, quote USDT)
    // Supports USDT, USDC, BNB, BTC quote formats
    let quoteAsset = 'USDT';
    if (symbol.endsWith('USDC')) quoteAsset = 'USDC';
    else if (symbol.endsWith('BNB')) quoteAsset = 'BNB';
    else if (symbol.endsWith('BTC') && symbol !== 'BTCUSDT') quoteAsset = 'BTC';

    const baseAsset = symbol.replace(quoteAsset, '');

    // ----------------------------------------------------
    // SPOT ORDER BALANCE VALIDATION & ESCROW
    // ----------------------------------------------------
    if (marketType === 'spot') {
      if (side === 'BUY') {
        const orderCost = type === 'MARKET' ? (numericQty * (matcher.latestPrices.spot[symbol] || (latestTickers.spot[symbol])?.lastPrice || 0)) : (numericQty * numericPrice);
        if (orderCost <= 0 && type === 'MARKET') {
          await t.rollback();
          return res.status(400).json({ error: 'Market price for asset not loaded yet. Please wait a moment.' });
        }

        const wallet = await Wallet.findOne({
          where: { userId, walletType: 'spot', asset: quoteAsset },
          transaction: t,
          lock: true
        });

        if (!wallet || wallet.balance < orderCost) {
          await t.rollback();
          return res.status(400).json({ error: `Insufficient Spot ${quoteAsset} balance. Cost: ${orderCost.toFixed(4)}` });
        }

        // Subtract cost from wallet (Escrow model)
        const before = wallet.balance;
        wallet.balance = before - orderCost;
        await wallet.save({ transaction: t });

        await TransactionLedger.create({
          userId,
          walletId: wallet.id,
          transactionType: 'SPOT_TRADE',
          asset: quoteAsset,
          amount: -orderCost,
          beforeBalance: before,
          afterBalance: wallet.balance,
          description: `Locked Spot Buy Escrow on ${symbol}. Locked: ${orderCost.toFixed(4)} ${quoteAsset}`
        }, { transaction: t });

      } else {
        // Sell order: locks the raw base asset (e.g. BTC)
        const wallet = await Wallet.findOne({
          where: { userId, walletType: 'spot', asset: baseAsset },
          transaction: t,
          lock: true
        });

        if (!wallet || wallet.balance < numericQty) {
          await t.rollback();
          return res.status(400).json({ error: `Insufficient Spot ${baseAsset} balance. Required: ${numericQty}` });
        }

        // Subtract quantity from wallet (Escrow model)
        const before = wallet.balance;
        wallet.balance = before - numericQty;
        await wallet.save({ transaction: t });

        await TransactionLedger.create({
          userId,
          walletId: wallet.id,
          transactionType: 'SPOT_TRADE',
          asset: baseAsset,
          amount: -numericQty,
          beforeBalance: before,
          afterBalance: wallet.balance,
          description: `Locked Spot Sell Escrow on ${symbol}. Locked: ${numericQty} ${baseAsset}`
        }, { transaction: t });
      }
    }

    // ----------------------------------------------------
    // FUTURES ORDER BALANCE VALIDATION & ESCROW
    // ----------------------------------------------------
    else {
      // Find futures positions and wallets
      const wallet = await Wallet.findOne({
        where: { userId, walletType: 'futures', asset: 'USDT' },
        transaction: t,
        lock: true
      });

      if (!wallet) {
        await t.rollback();
        return res.status(400).json({ error: 'USDT Futures Wallet not initialized.' });
      }

      // Check reduce-only order constraint rules
      const activePosition = await Position.findOne({
        where: { userId, symbol },
        transaction: t
      });

      if (reduceOnly) {
        if (!activePosition) {
          await t.rollback();
          return res.status(400).json({ error: `Reduce-Only order rejected: no active position exists on ${symbol}` });
        }
        // Verify direction reduces
        const correctDirection = (activePosition.side === 'LONG' && side === 'SELL') || (activePosition.side === 'SHORT' && side === 'BUY');
        if (!correctDirection) {
          await t.rollback();
          return res.status(400).json({ error: `Reduce-Only order rejected: order direction does not reduce your ${activePosition.side} position.` });
        }
      } else {
        // Non-reduceOnly order: requires initial margin collateral lock
        const leverage = activePosition ? activePosition.leverage : (reqLeverage ? Math.min(Math.max(parseInt(reqLeverage), 1), 125) : 20);
        // Fallback: Check WebSocket price first, then REST API tickers cache, then request body price
        const currentPrice = matcher.latestPrices.futures[symbol] || (latestTickers.futures[symbol])?.lastPrice || numericPrice || 0;
        
        if (currentPrice <= 0) {
          await t.rollback();
          return res.status(400).json({ error: 'Market price not loaded. Cannot evaluate initial margin.' });
        }

        // Netting-aware margin cost calculation
        let initialMarginCost = 0;
        if (activePosition) {
          // If order is opposite to position side, it is reducing/netting
          const isOppositeDirection = (activePosition.side === 'LONG' && side === 'SELL') || (activePosition.side === 'SHORT' && side === 'BUY');
          
          if (isOppositeDirection) {
            if (numericQty > activePosition.size) {
              const overshootQty = numericQty - activePosition.size;
              initialMarginCost = (overshootQty * currentPrice) / leverage;
            } else {
              initialMarginCost = 0; // Completely reduces or partially reduces position, no new margin lock required!
            }
          } else {
            // Same direction adds to position size, requires full margin
            initialMarginCost = (numericQty * currentPrice) / leverage;
          }
        } else {
          initialMarginCost = (numericQty * currentPrice) / leverage;
        }

        // Calculate available balance: MB - locked Initial Margins - active pending order costs
        const openPositions = await Position.findAll({ where: { userId }, transaction: t });
        const lockedMargin = openPositions.reduce((acc, p) => acc + p.margin, 0);

        // Find active pending margin costs
        const pendingFuturesOrders = await Order.findAll({
          where: { userId, marketType: 'futures', status: 'PENDING', reduceOnly: false },
          transaction: t
        });

        const pendingCost = pendingFuturesOrders.reduce((acc, o) => {
          const oPrice = o.price || matcher.latestPrices.futures[o.symbol] || (latestTickers.futures[o.symbol])?.lastPrice || 0;
          return acc + ((o.quantity * oPrice) / leverage);
        }, 0);

        const availableBalance = wallet.balance - lockedMargin - pendingCost;

        if (availableBalance < initialMarginCost) {
          await t.rollback();
          return res.status(400).json({ error: `Insufficient Futures balance. Free: ${availableBalance.toFixed(4)} USDT, Cost: ${initialMarginCost.toFixed(4)} USDT` });
        }
      }
    }

    // ----------------------------------------------------
    // CREATE ORDER
    // ----------------------------------------------------
    const newOrder = await Order.create({
      userId,
      symbol,
      marketType,
      side,
      type,
      status: type === 'MARKET' ? 'FILLED' : 'PENDING',
      price: numericPrice,
      quantity: numericQty,
      stopPrice: numericStop,
      callbackRate: numericCallback,
      watermarkPrice: type === 'TRAILING_STOP' ? (matcher.latestPrices[marketType][symbol] || numericPrice) : null,
      positionSide,
      reduceOnly: reduceOnly || false
    }, { transaction: t });

    // If Market order, process execution instantly inside database
    if (type === 'MARKET') {
      const currentPrice = matcher.latestPrices[marketType][symbol] || (latestTickers[marketType][symbol])?.lastPrice;
      if (!currentPrice) {
        await t.rollback();
        return res.status(400).json({ error: 'Exchange price for asset currently unavailable. Try placing a limit order.' });
      }
      await matcher.executeOrderFill(newOrder, currentPrice, t);
    }

    await t.commit();

    // Trigger matcher WS scan immediately for real-time responsiveness
    matcher.scanActiveSymbols();
    matcher.broadcastUserUpdate(userId);

    return res.status(201).json({
      message: type === 'MARKET' ? 'Order executed successfully.' : 'Order placed on books.',
      order: newOrder
    });

  } catch (error) {
    await t.rollback();
    return res.status(500).json({ error: error.message });
  }
};

// Cancel a pending order
export const cancelOrder = async (req, res) => {
  const userId = req.user.id;
  const { orderId } = req.params;

  const t = await sequelize.transaction();

  try {
    const order = await Order.findOne({
      where: { id: orderId, userId, status: 'PENDING' },
      transaction: t,
      lock: true
    });

    if (!order) {
      await t.rollback();
      return res.status(404).json({ error: 'Pending order not found or already cancelled.' });
    }

    // Refund escrows if Spot
    if (order.marketType === 'spot') {
      let quoteAsset = 'USDT';
      if (order.symbol.endsWith('USDC')) quoteAsset = 'USDC';
      else if (order.symbol.endsWith('BNB')) quoteAsset = 'BNB';
      else if (order.symbol.endsWith('BTC') && order.symbol !== 'BTCUSDT') quoteAsset = 'BTC';

      const baseAsset = order.symbol.replace(quoteAsset, '');

      if (order.side === 'BUY') {
        const orderCost = order.quantity * order.price;
        const wallet = await Wallet.findOne({
          where: { userId, walletType: 'spot', asset: quoteAsset },
          transaction: t,
          lock: true
        });

        const before = wallet.balance;
        wallet.balance = before + orderCost;
        await wallet.save({ transaction: t });

        await TransactionLedger.create({
          userId,
          walletId: wallet.id,
          transactionType: 'SPOT_TRADE',
          asset: quoteAsset,
          amount: orderCost,
          beforeBalance: before,
          afterBalance: wallet.balance,
          description: `Refunded Spot Buy Escrow upon cancellation of order ${order.id}`
        }, { transaction: t });

      } else {
        const wallet = await Wallet.findOne({
          where: { userId, walletType: 'spot', asset: baseAsset },
          transaction: t,
          lock: true
        });

        const before = wallet.balance;
        wallet.balance = before + order.quantity;
        await wallet.save({ transaction: t });

        await TransactionLedger.create({
          userId,
          walletId: wallet.id,
          transactionType: 'SPOT_TRADE',
          asset: baseAsset,
          amount: order.quantity,
          beforeBalance: before,
          afterBalance: wallet.balance,
          description: `Refunded Spot Sell Escrow upon cancellation of order ${order.id}`
        }, { transaction: t });
      }
    }

    // Cancel order status
    order.status = 'CANCELLED';
    await order.save({ transaction: t });

    await t.commit();

    // Trigger WS update
    matcher.scanActiveSymbols();
    matcher.broadcastUserUpdate(userId);

    return res.status(200).json({ message: 'Order successfully cancelled.', order });

  } catch (error) {
    await t.rollback();
    return res.status(500).json({ error: error.message });
  }
};

// Wallet inner transfers (USDT only)
export const transferFunds = async (req, res) => {
  const userId = req.user.id;
  const { direction, amount } = req.body; // direction: 'SPOT_TO_FUTURES' | 'FUTURES_TO_SPOT'

  if (!direction || !amount) {
    return res.status(400).json({ error: 'Direction and amount are required.' });
  }

  const numericAmt = parseFloat(amount);
  if (numericAmt <= 0) {
    return res.status(400).json({ error: 'Transfer amount must be greater than zero.' });
  }

  const t = await sequelize.transaction();

  try {
    const spotWallet = await Wallet.findOne({
      where: { userId, walletType: 'spot', asset: 'USDT' },
      transaction: t,
      lock: true
    });

    const futuresWallet = await Wallet.findOne({
      where: { userId, walletType: 'futures', asset: 'USDT' },
      transaction: t,
      lock: true
    });

    if (!spotWallet || !futuresWallet) {
      await t.rollback();
      return res.status(400).json({ error: 'Wallets not fully initialized.' });
    }

    if (direction === 'SPOT_TO_FUTURES') {
      if (spotWallet.balance < numericAmt) {
        await t.rollback();
        return res.status(400).json({ error: 'Insufficient Spot USDT balance.' });
      }

      // Action Spot debit
      const beforeSpot = spotWallet.balance;
      spotWallet.balance = beforeSpot - numericAmt;
      await spotWallet.save({ transaction: t });

      await TransactionLedger.create({
        userId,
        walletId: spotWallet.id,
        transactionType: 'TRANSFER',
        asset: 'USDT',
        amount: -numericAmt,
        beforeBalance: beforeSpot,
        afterBalance: spotWallet.balance,
        description: `Transferred USDT to Futures wallet.`
      }, { transaction: t });

      // Action Futures credit
      const beforeFutures = futuresWallet.balance;
      futuresWallet.balance = beforeFutures + numericAmt;
      await futuresWallet.save({ transaction: t });

      await TransactionLedger.create({
        userId,
        walletId: futuresWallet.id,
        transactionType: 'TRANSFER',
        asset: 'USDT',
        amount: numericAmt,
        beforeBalance: beforeFutures,
        afterBalance: futuresWallet.balance,
        description: `Received USDT from Spot wallet.`
      }, { transaction: t });

    } else if (direction === 'FUTURES_TO_SPOT') {
      // Risk Engine check: Evaluate available balance constraints
      const openPositions = await Position.findAll({ where: { userId }, transaction: t });
      const lockedMargin = openPositions.reduce((acc, p) => acc + p.margin, 0);

      // Pending non-reduce only orders lock margin
      const pendingOrders = await Order.findAll({
        where: { userId, marketType: 'futures', status: 'PENDING', reduceOnly: false },
        transaction: t
      });

      const pendingCost = pendingOrders.reduce((acc, o) => {
        const price = o.price || matcher.latestPrices.futures[o.symbol] || (latestTickers.futures[o.symbol])?.lastPrice || 0;
        return acc + ((o.quantity * price) / 20); // Default leverage 20
      }, 0);

      const availableBalance = futuresWallet.balance - lockedMargin - pendingCost;

      if (availableBalance < numericAmt) {
        await t.rollback();
        return res.status(400).json({
          error: `Insufficient available Futures margin. Maximum transferable: ${Math.max(0, availableBalance).toFixed(4)} USDT`
        });
      }

      // Action Futures debit
      const beforeFutures = futuresWallet.balance;
      futuresWallet.balance = beforeFutures - numericAmt;
      await futuresWallet.save({ transaction: t });

      await TransactionLedger.create({
        userId,
        walletId: futuresWallet.id,
        transactionType: 'TRANSFER',
        asset: 'USDT',
        amount: -numericAmt,
        beforeBalance: beforeFutures,
        afterBalance: futuresWallet.balance,
        description: `Transferred USDT to Spot wallet.`
      }, { transaction: t });

      // Action Spot credit
      const beforeSpot = spotWallet.balance;
      spotWallet.balance = beforeSpot + numericAmt;
      await spotWallet.save({ transaction: t });

      await TransactionLedger.create({
        userId,
        walletId: spotWallet.id,
        transactionType: 'TRANSFER',
        asset: 'USDT',
        amount: numericAmt,
        beforeBalance: beforeSpot,
        afterBalance: spotWallet.balance,
        description: `Received USDT from Futures wallet.`
      }, { transaction: t });
    }

    await t.commit();
    matcher.broadcastUserUpdate(userId);

    return res.status(200).json({ message: 'Fund transfer completed successfully.' });

  } catch (error) {
    await t.rollback();
    return res.status(500).json({ error: error.message });
  }
};

// Retrieve open orders
export const getOpenOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { userId: req.user.id, status: 'PENDING' },
      order: [['createdAt', 'DESC']]
    });
    return res.status(200).json(orders);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Retrieve active positions
export const getPositions = async (req, res) => {
  try {
    const positions = await Position.findAll({
      where: { userId: req.user.id }
    });
    return res.status(200).json(positions);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Retrieve completed trades history
export const getTradeHistory = async (req, res) => {
  try {
    const history = await TradeHistory.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 100
    });
    return res.status(200).json(history);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Close Futures Position manually at Market Price
export const closePosition = async (req, res) => {
  const userId = req.user.id;
  const { symbol } = req.body;

  if (!symbol) {
    return res.status(400).json({ error: 'Symbol is required to close position.' });
  }

  const t = await sequelize.transaction();

  try {
    const position = await Position.findOne({
      where: { userId, symbol },
      transaction: t,
      lock: true
    });

    if (!position) {
      await t.rollback();
      return res.status(404).json({ error: 'Active position not found on this symbol.' });
    }

    const currentPrice = matcher.latestPrices.futures[symbol.toUpperCase()] || matcher.latestPrices.spot[symbol.toUpperCase()] || (latestTickers.futures[symbol.toUpperCase()] || latestTickers.spot[symbol.toUpperCase()])?.lastPrice;
    if (!currentPrice) {
      await t.rollback();
      return res.status(400).json({ error: 'Current market price not loaded. Cannot close position.' });
    }

    // Process close netting fill (equivalent to placing a market order opposite side)
    const oppositeSide = position.side === 'LONG' ? 'SELL' : 'BUY';
    const closeOrder = await Order.create({
      userId,
      symbol,
      marketType: 'futures',
      side: oppositeSide,
      type: 'MARKET',
      status: 'FILLED',
      price: currentPrice,
      quantity: position.size,
      reduceOnly: true
    }, { transaction: t });

    await matcher.fillFuturesOrder(closeOrder, currentPrice, t);
    await t.commit();

    matcher.broadcastUserUpdate(userId);

    return res.status(200).json({ message: 'Position successfully closed at market price.' });

  } catch (error) {
    await t.rollback();
    return res.status(500).json({ error: error.message });
  }
};
