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
  isInputNotionalValue?: boolean;
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
// Input mode type: 'price' means user input price, 'percentage' means user input percentage
export type TPSLInputMode = 'price' | 'percentage';

export interface TPSLConfig {
  enabled: boolean;
  takeProfit: {
    price: string;
    percentage: string;
    error: string;
    inputMode: TPSLInputMode;
  };
  stopLoss: {
    price: string;
    error: string;
    percentage: string;
    inputMode: TPSLInputMode;
  };
}

export interface OrderSummaryData {
  liquidationPrice: string;
  liquidationDistance: string;
  orderValue: string;
  marginRequired: string;
  marginUsage: string;
  tpExpectedPnL?: number;
  slExpectedPnL?: number;
  slippage?: string;
}

// Trading container components don't need props
// They get data directly from perpsState
export interface TradingContainerProps {
  // Empty for now - containers manage their own state and data
}
