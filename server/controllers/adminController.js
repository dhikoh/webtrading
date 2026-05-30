import { sequelize, User, Wallet, Position, TransactionLedger, SystemAdminLog } from '../models/index.js';
import { matcher } from '../services/orderMatcher.js';

// Get list of all users along with their wallets and active positions
export const getAllUsersData = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'role', 'createdAt'],
      include: [
        { model: Wallet, attributes: ['id', 'walletType', 'asset', 'balance'] },
        { model: Position, attributes: ['id', 'symbol', 'side', 'size', 'entryPrice', 'leverage', 'margin'] }
      ]
    });
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Admin adjust a user's wallet balance
export const adjustUserBalance = async (req, res) => {
  const adminUserId = req.user.id;
  const { targetUserId, walletType, asset, amount } = req.body;

  if (!targetUserId || !walletType || !asset || amount === undefined) {
    return res.status(400).json({ error: 'targetUserId, walletType, asset and amount are required.' });
  }

  const numericAmt = parseFloat(amount);
  const t = await sequelize.transaction();

  try {
    const targetUser = await User.findByPk(targetUserId, { transaction: t });
    if (!targetUser) {
      await t.rollback();
      return res.status(404).json({ error: 'Target user not found.' });
    }

    let wallet = await Wallet.findOne({
      where: { userId: targetUserId, walletType, asset },
      transaction: t,
      lock: true
    });

    let beforeBalance = 0.0;
    if (!wallet) {
      // Create wallet if it does not exist
      wallet = await Wallet.create({
        userId: targetUserId,
        walletType,
        asset,
        balance: 0.0
      }, { transaction: t });
    } else {
      beforeBalance = wallet.balance;
    }

    // Set new absolute balance or offset? Let's do absolute injection/override for absolute control
    const afterBalance = numericAmt;
    const difference = afterBalance - beforeBalance;

    wallet.balance = afterBalance;
    await wallet.save({ transaction: t });

    // 1. Log in transaction ledger
    await TransactionLedger.create({
      userId: targetUserId,
      walletId: wallet.id,
      transactionType: 'DEPOSIT', // Logged as deposit/adjustment
      asset,
      amount: difference,
      beforeBalance,
      afterBalance,
      description: `Admin adjustment by user ID ${adminUserId}`
    }, { transaction: t });

    // 2. Log in System Admin Logs
    await SystemAdminLog.create({
      adminUserId,
      targetUserId,
      actionType: 'BALANCE_ADJUST',
      targetEntity: 'Wallet',
      beforeValue: `${beforeBalance} ${asset}`,
      afterValue: `${afterBalance} ${asset}`,
      description: `Admin updated user ${targetUser.username}'s ${walletType} wallet balance from ${beforeBalance} to ${afterBalance} ${asset}.`
    }, { transaction: t });

    await t.commit();

    // Notify user immediately via WebSockets
    matcher.broadcastUserUpdate(targetUserId);

    return res.status(200).json({
      message: `Successfully adjusted balance for user ${targetUser.username}.`,
      wallet
    });

  } catch (error) {
    await t.rollback();
    return res.status(500).json({ error: error.message });
  }
};

// Retrieve all administrative audit trails
export const getAdminLogs = async (req, res) => {
  try {
    const logs = await SystemAdminLog.findAll({
      order: [['createdAt', 'DESC']],
      limit: 100
    });
    return res.status(200).json(logs);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
