import React from 'react';
import { TradingContainerProps } from '../../../types';
import { MarketTradingContainer } from './MarketTradingContainer';

// TODO: Implement Stop Market-specific logic
// For now, use the same as Market
export const StopMarketTradingContainer: React.FC<TradingContainerProps> = (
  props
) => {
  return <MarketTradingContainer {...props} />;
};
