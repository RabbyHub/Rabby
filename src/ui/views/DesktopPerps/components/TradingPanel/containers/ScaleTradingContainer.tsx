import React from 'react';
import { TradingContainerProps } from '../../../types';
import { MarketTradingContainer } from './MarketTradingContainer';

// TODO: Implement Scale-specific logic
// For now, use the same as Market
export const ScaleTradingContainer: React.FC<TradingContainerProps> = (
  props
) => {
  return <MarketTradingContainer {...props} />;
};
