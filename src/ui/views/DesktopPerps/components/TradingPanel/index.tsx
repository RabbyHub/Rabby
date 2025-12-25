import React from 'react';
import { useRabbySelector } from '@/ui/store';
import { MarginMode, OrderType } from '../../types';
import { TopModeStatus, MarginModeModal, LeverageModal } from './components';
import {
  MarketTradingContainer,
  LimitTradingContainer,
  StopMarketTradingContainer,
  StopLimitTradingContainer,
  ScaleTradingContainer,
  TWAPTradingContainer,
} from './containers';

export const TradingPanel: React.FC = () => {
  // Get market data to determine max leverage
  const [orderType, setOrderType] = React.useState<OrderType>(OrderType.MARKET);

  const handleOrderTypeChange = (type: OrderType) => {
    setOrderType(type);
  };

  // Render the appropriate trading container based on order type
  const renderTradingContainer = () => {
    switch (orderType) {
      case OrderType.MARKET:
        return <MarketTradingContainer />;
      case OrderType.LIMIT:
        return <LimitTradingContainer />;
      case OrderType.STOP_MARKET:
        return <StopMarketTradingContainer />;
      case OrderType.STOP_LIMIT:
        return <StopLimitTradingContainer />;
      case OrderType.SCALE:
        return <ScaleTradingContainer />;
      case OrderType.TWAP:
        return <TWAPTradingContainer />;
      default:
        return <MarketTradingContainer />;
    }
  };

  return (
    <>
      <div className="h-full w-full bg-white flex flex-col overflow-hidden">
        {/* Content */}
        <div className="flex-1 overflow-auto px-[16px] py-[16px] min-h-0">
          <div className="space-y-[16px]">
            {/* Top Settings: Margin Mode | Leverage | Order Type */}
            <TopModeStatus
              orderType={orderType}
              onOrderTypeChange={handleOrderTypeChange}
            />

            {/* Trading Container based on order type */}
            {renderTradingContainer()}
          </div>
        </div>
      </div>
    </>
  );
};
