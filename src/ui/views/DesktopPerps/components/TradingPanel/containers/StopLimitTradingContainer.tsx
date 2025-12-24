import React from 'react';
import { TradingContainerProps } from '../../../types';
import { MarketTradingContainer } from './MarketTradingContainer';

// TODO: Implement Stop Limit-specific logic
// For now, use the same as Market
export const StopLimitTradingContainer: React.FC<TradingContainerProps> = (
  props
) => {
  return <MarketTradingContainer {...props} />;
};
