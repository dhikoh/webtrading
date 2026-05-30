import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Wallet, TransactionLedger } from '../models/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey123!';

// Register a new member
export const register = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    const passwordHash = await bcryptjs.hash(password, 10);
    const user = await User.create({
      username,
      passwordHash,
      role: 'member' // Always register as standard member
    });

    // Automatically seed basic demo balances for new registrations
    const seedWallet = async (asset, spotAmt, futAmt) => {
      if (spotAmt > 0) {
        const sw = await Wallet.create({ userId: user.id, walletType: 'spot', asset, balance: spotAmt });
        await TransactionLedger.create({
          userId: user.id,
          walletId: sw.id,
          transactionType: 'DEPOSIT',
          asset,
          amount: spotAmt,
          beforeBalance: 0,
          afterBalance: spotAmt,
          description: 'New User Registration Demo Spot Grant'
        });
      }
      if (futAmt > 0) {
        const fw = await Wallet.create({ userId: user.id, walletType: 'futures', asset, balance: futAmt });
        await TransactionLedger.create({
          userId: user.id,
          walletId: fw.id,
          transactionType: 'DEPOSIT',
          asset,
          amount: futAmt,
          beforeBalance: 0,
          afterBalance: futAmt,
          description: 'New User Registration Demo Futures Grant'
        });
      }
    };

    await seedWallet('USDT', 10000.0, 10000.0); // 10k Spot & 10k Futures
    await seedWallet('BTC', 0.1, 0.0);
    await seedWallet('ETH', 1.0, 0.0);
    await seedWallet('SOL', 10.0, 0.0);

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const isMatch = await bcryptjs.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Get authenticated user details & balances
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'role']
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const wallets = await Wallet.findAll({ where: { userId } });

    return res.status(200).json({
      user,
      wallets
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
