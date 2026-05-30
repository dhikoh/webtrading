import bcryptjs from 'bcryptjs';
import { User, Wallet, TransactionLedger } from '../models/index.js';

export const seedDatabase = async () => {
  try {
    // Check if users already exist
    const userCount = await User.count();
    if (userCount > 0) {
      console.log('Database already populated. Skipping database seeding.');
      return;
    }

    console.log('Seeding initial data into PostgreSQL...');

    // 1. Create password hashes
    const adminPasswordHash = await bcryptjs.hash('admin', 10);
    const memberPasswordHash = await bcryptjs.hash('password123', 10);

    // 2. Create Users
    const adminUser = await User.create({
      username: 'admin',
      passwordHash: adminPasswordHash,
      role: 'admin'
    });

    const memberUser = await User.create({
      username: 'archqi',
      passwordHash: memberPasswordHash,
      role: 'member'
    });

    console.log(`Created default accounts: \n- Super Admin (admin)\n- Member (archqi)`);

    // Helper to create wallets and ledger records
    const createWalletWithLedger = async (user, type, asset, amount, desc) => {
      const wallet = await Wallet.create({
        userId: user.id,
        walletType: type,
        asset: asset,
        balance: amount
      });

      await TransactionLedger.create({
        userId: user.id,
        walletId: wallet.id,
        transactionType: 'DEPOSIT',
        asset: asset,
        amount: amount,
        beforeBalance: 0.0,
        afterBalance: amount,
        description: desc
      });
      return wallet;
    };

    // 3. Seed Wallets for admin
    await createWalletWithLedger(adminUser, 'spot', 'USDT', 1000000.0, 'Initial Admin Spot USDT Injection');
    await createWalletWithLedger(adminUser, 'spot', 'BTC', 10.0, 'Initial Admin Spot BTC Injection');
    await createWalletWithLedger(adminUser, 'spot', 'ETH', 100.0, 'Initial Admin Spot ETH Injection');
    await createWalletWithLedger(adminUser, 'spot', 'SOL', 1000.0, 'Initial Admin Spot SOL Injection');
    await createWalletWithLedger(adminUser, 'futures', 'USDT', 1000000.0, 'Initial Admin Futures USDT Injection');

    // 4. Seed Wallets for archqi
    await createWalletWithLedger(memberUser, 'spot', 'USDT', 50000.0, 'Initial Member Spot USDT Injection');
    await createWalletWithLedger(memberUser, 'spot', 'BTC', 0.5, 'Initial Member Spot BTC Injection');
    await createWalletWithLedger(memberUser, 'spot', 'ETH', 5.0, 'Initial Member Spot ETH Injection');
    await createWalletWithLedger(memberUser, 'spot', 'SOL', 50.0, 'Initial Member Spot SOL Injection');
    await createWalletWithLedger(memberUser, 'futures', 'USDT', 50000.0, 'Initial Member Futures USDT Injection');

    console.log('Successfully completed database seeding.');
  } catch (error) {
    console.error('Error seeding database:', error.message);
  }
};
