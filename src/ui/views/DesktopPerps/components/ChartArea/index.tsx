import React, { useEffect } from 'react';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { FavoriteBar } from './components/FavoriteBar';
import { CoinSelector } from './components/CoinSelector';
import { ChartWrapper } from './components/ChartWrapper';

export const ChartArea: React.FC = () => {
  const dispatch = useRabbyDispatch();
  const { selectedCoin, chartInterval } = useRabbySelector(
    (state) => state.perps
  );

  const handleSelectCoin = (coin: string) => {
    dispatch.perps.updateSelectedCoin(coin);
  };

  return (
    <div className="h-full w-full bg-rb-neutral-bg-1 flex flex-col overflow-hidden">
      <FavoriteBar onSelectCoin={handleSelectCoin} />

      <CoinSelector coin={selectedCoin} onSelectCoin={handleSelectCoin} />

      <div className="flex-1 min-h-0">
        <ChartWrapper coin={selectedCoin} interval={chartInterval} />
      </div>
    </div>
  );
};
