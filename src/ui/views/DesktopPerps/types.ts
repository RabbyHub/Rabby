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

export type PositionSizeInputSource = 'amount' | 'notional' | 'slider';

export interface PositionSize {
  amount: string;
  notionalValue: string;
  inputSource?: PositionSizeInputSource;
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

// TP/SL setting mode for the new three-mode design
export type TPSLSettingMode = 'price' | 'pnl' | 'roi';

// Position size display unit
export type SizeDisplayUnit = 'base' | 'usdc';

export interface TPSLConfigItem {
  settingMode: TPSLSettingMode;
  value: string; // unified input value (price in Price mode, USDC amount in PNL mode, percentage in ROI mode)
  error: string;
  // Computed trigger prices for both directions (used in PNL/ROI modes)
  buyTriggerPrice: string;
  sellTriggerPrice: string;
  // Computed estimated PnL (used in Price mode)
  estimatedPnl: string;
  estimatedPnlPercent: string;
}

export interface TPSLConfig {
  enabled: boolean;
  takeProfit: TPSLConfigItem;
  stopLoss: TPSLConfigItem;
}

// Legacy TPSLConfig types kept for backward compatibility during migration
export interface LegacyTPSLConfig {
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

// Dual-column info for both buy and sell sides
export interface OrderSideInfo {
  liqPrice: string;
  cost: string;
  max: string;
}

// Trading container components don't need props
// They get data directly from perpsState
export interface TradingContainerProps {
  // Empty for now - containers manage their own state and data
}
