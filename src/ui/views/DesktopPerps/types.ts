// DesktopPerps Types

export enum MarginMode {
  ISOLATED = 'isolated',
  CROSS = 'cross',
}

export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
  STOP_MARKET = 'stop_market',
  STOP_LIMIT = 'stop_limit',
  SCALE = 'scale',
  TWAP = 'twap',
}

export enum OrderSide {
  BUY = 'buy',
  SELL = 'sell',
}

export enum TPSLInputMode {
  PRICE = 'price',
  PERCENTAGE = 'percentage',
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

export interface TPSLConfig {
  enabled: boolean;
  inputMode: TPSLInputMode;
  takeProfit: {
    price: string;
    percentage: string;
    expectedPnL: string;
  };
  stopLoss: {
    price: string;
    percentage: string;
    expectedPnL: string;
  };
}

export interface OrderSummaryData {
  liquidationPrice: string;
  liquidationDistance: string;
  orderValue: string;
  marginUsage: string;
  slippage: string;
}

// Trading container components don't need props
// They get data directly from perpsState
export interface TradingContainerProps {
  // Empty for now - containers manage their own state and data
}
