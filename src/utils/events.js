import { EventEmitter } from 'events';

// Create a single global event emitter instance for the application
class TradeEventEmitter extends EventEmitter {}

const tradeEvents = new TradeEventEmitter();

// Define Event names as Constants to prevent spelling bugs
export const EVENTS = {
  SIGNAL_CREATED: 'SignalCreated',
  SIGNAL_EXPIRED: 'SignalExpired',
  TRADE_CLOSED: 'TradeClosed',
  BACKTEST_COMPLETED: 'BacktestCompleted',
  STRATEGY_UPDATED: 'StrategyUpdated'
};

export default tradeEvents;
