// DesktopPerps Types

export enum MarginMode {
  ISOLATED = 'isolated',
  CROSS = 'cross',
}

export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
  STOP_LIMIT = 'stop_limit',
  STOP_MARKET = 'stop_market',
  TAKE_LIMIT = 'take_limit',
  TAKE_MARKET = 'take_market',
  SCALE = 'scale',
  TWAP = 'twap',
}

export enum OrderSide {
  BUY = 'buy',
  SELL = 'sell',
}

export interface OrderSettings {
  marginMode: MarginMode;
  leverage: number;
  orderType: OrderType;
}

export interface PositionSize {
  amount: string;
  notionalValue: string;
}

export type LimitOrderType = 'Gtc' | 'Alo' | 'Ioc';

export interface Position {
  size: number;
  side: 'Long' | 'Short';
  entryPrice: number;
  leverage: number;
  marginUsed: number;
  liquidationPrice: number;
  unrealizedPnl: number;
}
export interface TPSLConfig {
  enabled: boolean;
  takeProfit: {
    price: string;
    percentage: string;
    expectedPnL: string;
    error: string;
  };
  stopLoss: {
    price: string;
    error: string;
    percentage: string;
    expectedPnL: string;
  };
}

export interface OrderSummaryData {
  liquidationPrice: string;
  liquidationDistance: string;
  orderValue: string;
  marginRequired: string;
  marginUsage: string;
  slippage?: string;
}

// Trading container components don't need props
// They get data directly from perpsState
export interface TradingContainerProps {
  // Empty for now - containers manage their own state and data
}
