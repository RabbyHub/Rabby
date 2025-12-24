import React from 'react';
import { TradingContainerProps } from '../../../types';
import { MarketTradingContainer } from './MarketTradingContainer';

// TODO: Implement Limit-specific logic
// For now, use the same as Market
export const LimitTradingContainer: React.FC<TradingContainerProps> = (
  props
) => {
  return <MarketTradingContainer {...props} />;
};
