import React from 'react';
import { useRabbySelector } from '@/ui/store';
import { MarginMode, OrderType } from '../../types';
import { TopModeStatus, MarginModeModal, LeverageModal } from './components';
import {
  MarketTradingContainer,
  LimitTradingContainer,
  ScaleTradingContainer,
  TWAPTradingContainer,
  TakeOrStopMarketTradingContainer,
  TakeOrStopLimitTradingContainer,
} from './containers';

export const TradingPanel: React.FC = () => {
  const [orderType, setOrderType] = React.useState<OrderType>(OrderType.MARKET);

  const handleOrderTypeChange = (type: OrderType) => {
    setOrderType(type);
  };

  const renderTradingContainer = () => {
    switch (orderType) {
      case OrderType.MARKET:
        return <MarketTradingContainer />;
      case OrderType.LIMIT:
        return <LimitTradingContainer />;
      case OrderType.TAKE_MARKET:
        return <TakeOrStopMarketTradingContainer takeOrStop="tp" />;
      case OrderType.STOP_MARKET:
        return <TakeOrStopMarketTradingContainer takeOrStop="sl" />;
      case OrderType.STOP_LIMIT:
        return <TakeOrStopLimitTradingContainer takeOrStop="sl" />;
      case OrderType.TAKE_LIMIT:
        return <TakeOrStopLimitTradingContainer takeOrStop="tp" />;
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
      <div className="h-full w-full bg-rb-neutral-bg-1 flex flex-col overflow-hidden rounded-[16px]">
        <div className="flex-1 overflow-hidden px-[16px] py-[16px] min-h-0">
          <div className="space-y-[16px]">
            <TopModeStatus
              orderType={orderType}
              onOrderTypeChange={handleOrderTypeChange}
            />

            {renderTradingContainer()}
          </div>
        </div>
      </div>
    </>
  );
};
