import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

// 1. User Model
export const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.STRING, // 'admin' | 'member'
    allowNull: false,
    defaultValue: 'member'
  }
}, {
  timestamps: true
});

// 2. Wallet Model
export const Wallet = sequelize.define('Wallet', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  walletType: {
    type: DataTypes.STRING, // 'spot' | 'futures'
    allowNull: false
  },
  asset: {
    type: DataTypes.STRING, // 'USDT', 'BTC', 'ETH', 'SOL', 'USDC'
    allowNull: false
  },
  balance: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
    defaultValue: 0.0,
    get() {
      const rawValue = this.getDataValue('balance');
      return rawValue ? parseFloat(rawValue) : 0;
    }
  }
}, {
  timestamps: true
});

// 3. Order Model
export const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  symbol: {
    type: DataTypes.STRING, // e.g. 'BTCUSDT'
    allowNull: false
  },
  marketType: {
    type: DataTypes.STRING, // 'spot' | 'futures'
    allowNull: false
  },
  side: {
    type: DataTypes.STRING, // 'BUY' | 'SELL'
    allowNull: false
  },
  type: {
    type: DataTypes.STRING, // 'LIMIT' | 'MARKET' | 'STOP_LIMIT' | 'STOP_MARKET' | 'TRAILING_STOP'
    allowNull: false
  },
  status: {
    type: DataTypes.STRING, // 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED'
    allowNull: false,
    defaultValue: 'PENDING'
  },
  price: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('price');
      return rawValue ? parseFloat(rawValue) : null;
    }
  },
  quantity: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
    get() {
      const rawValue = this.getDataValue('quantity');
      return rawValue ? parseFloat(rawValue) : 0;
    }
  },
  stopPrice: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('stopPrice');
      return rawValue ? parseFloat(rawValue) : null;
    }
  },
  callbackRate: {
    type: DataTypes.DECIMAL(5, 2), // Percentage, e.g., 1.0 for 1%
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('callbackRate');
      return rawValue ? parseFloat(rawValue) : null;
    }
  },
  watermarkPrice: {
    type: DataTypes.DECIMAL(20, 8), // High/low watermark price for trailing stops
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('watermarkPrice');
      return rawValue ? parseFloat(rawValue) : null;
    }
  },
  positionSide: {
    type: DataTypes.STRING, // 'LONG' | 'SHORT' (for Futures)
    allowNull: true
  },
  reduceOnly: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  timestamps: true
});

// 4. Position Model
export const Position = sequelize.define('Position', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  symbol: {
    type: DataTypes.STRING,
    allowNull: false
  },
  side: {
    type: DataTypes.STRING, // 'LONG' | 'SHORT'
    allowNull: false
  },
  size: {
    type: DataTypes.DECIMAL(20, 8), // Size in contracts (crypto unit e.g. BTC)
    allowNull: false,
    get() {
      const rawValue = this.getDataValue('size');
      return rawValue ? parseFloat(rawValue) : 0;
    }
  },
  entryPrice: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
    get() {
      const rawValue = this.getDataValue('entryPrice');
      return rawValue ? parseFloat(rawValue) : 0;
    }
  },
  leverage: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 20
  },
  marginType: {
    type: DataTypes.STRING, // 'CROSS' | 'ISOLATED'
    allowNull: false,
    defaultValue: 'ISOLATED'
  },
  margin: {
    type: DataTypes.DECIMAL(20, 8), // Margin allocated (USDT collateral)
    allowNull: false,
    get() {
      const rawValue = this.getDataValue('margin');
      return rawValue ? parseFloat(rawValue) : 0;
    }
  },
  liquidationPrice: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
    get() {
      const rawValue = this.getDataValue('liquidationPrice');
      return rawValue ? parseFloat(rawValue) : 0;
    }
  }
}, {
  timestamps: true
});

// 5. Trade History Model
export const TradeHistory = sequelize.define('TradeHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  symbol: {
    type: DataTypes.STRING,
    allowNull: false
  },
  side: {
    type: DataTypes.STRING, // 'BUY' | 'SELL'
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
    get() {
      const rawValue = this.getDataValue('price');
      return rawValue ? parseFloat(rawValue) : 0;
    }
  },
  quantity: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
    get() {
      const rawValue = this.getDataValue('quantity');
      return rawValue ? parseFloat(rawValue) : 0;
    }
  },
  realizedPnL: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
    defaultValue: 0.0,
    get() {
      const rawValue = this.getDataValue('realizedPnL');
      return rawValue ? parseFloat(rawValue) : 0;
    }
  },
  tradeType: {
    type: DataTypes.STRING, // 'SPOT' | 'FUTURES' | 'LIQUIDATION'
    allowNull: false
  }
}, {
  timestamps: true
});

// 6. Transaction Ledger Model (Double-Entry Bookkeeping)
export const TransactionLedger = sequelize.define('TransactionLedger', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  walletId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  transactionType: {
    type: DataTypes.STRING, // 'DEPOSIT' | 'TRANSFER' | 'SPOT_TRADE' | 'FUTURES_MARGIN_LOCK' | 'FUTURES_MARGIN_RELEASE' | 'FUTURES_REALIZED_PNL' | 'LIQUIDATION_PENALTY'
    allowNull: false
  },
  asset: {
    type: DataTypes.STRING, // USDT, BTC, ETH...
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(20, 8), // Positive for credit, negative for debit
    allowNull: false,
    get() {
      const rawValue = this.getDataValue('amount');
      return rawValue ? parseFloat(rawValue) : 0;
    }
  },
  beforeBalance: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
    get() {
      const rawValue = this.getDataValue('beforeBalance');
      return rawValue ? parseFloat(rawValue) : 0;
    }
  },
  afterBalance: {
    type: DataTypes.DECIMAL(20, 8),
    allowNull: false,
    get() {
      const rawValue = this.getDataValue('afterBalance');
      return rawValue ? parseFloat(rawValue) : 0;
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true
});

// 7. System Admin Log Model
export const SystemAdminLog = sequelize.define('SystemAdminLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  adminUserId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  targetUserId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  actionType: {
    type: DataTypes.STRING, // 'BALANCE_ADJUST', 'LIQUIDATE_POSITION', 'ROLE_CHANGE', 'PARAM_MOD'
    allowNull: false
  },
  targetEntity: {
    type: DataTypes.STRING, // e.g. 'Wallet', 'Position', 'User'
    allowNull: true
  },
  beforeValue: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  afterValue: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  timestamps: true
});

// ----------------------------------------------------
// DB Relations
// ----------------------------------------------------

User.hasMany(Wallet, { foreignKey: 'userId', onDelete: 'CASCADE' });
Wallet.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Order, { foreignKey: 'userId', onDelete: 'CASCADE' });
Order.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Position, { foreignKey: 'userId', onDelete: 'CASCADE' });
Position.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(TradeHistory, { foreignKey: 'userId', onDelete: 'CASCADE' });
TradeHistory.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(TransactionLedger, { foreignKey: 'userId', onDelete: 'CASCADE' });
TransactionLedger.belongsTo(User, { foreignKey: 'userId' });

Wallet.hasMany(TransactionLedger, { foreignKey: 'walletId', onDelete: 'CASCADE' });
TransactionLedger.belongsTo(Wallet, { foreignKey: 'walletId' });

User.hasMany(SystemAdminLog, { foreignKey: 'adminUserId', onDelete: 'CASCADE' });
SystemAdminLog.belongsTo(User, { foreignKey: 'adminUserId', as: 'admin' });

User.hasMany(SystemAdminLog, { foreignKey: 'targetUserId', onDelete: 'SET NULL' });
SystemAdminLog.belongsTo(User, { foreignKey: 'targetUserId', as: 'targetUser' });
