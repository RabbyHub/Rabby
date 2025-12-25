import React from 'react';
import { TradingContainerProps } from '../../../types';
import { MarketTradingContainer } from './MarketTradingContainer';

// TODO: Implement TWAP-specific logic
// For now, use the same as Market
export const TWAPTradingContainer: React.FC<TradingContainerProps> = (
  props
) => {
  return <MarketTradingContainer {...props} />;
};
