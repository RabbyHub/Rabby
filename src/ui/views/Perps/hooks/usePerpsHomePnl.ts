import { useRabbySelector } from '@/ui/store';
import { usePerpsClearHouseState } from './usePerpsClearingHouseState';
import { useMemo } from 'react';

export const usePerpsHomePnl = () => {
  const perpsState = useRabbySelector((state) => state.perps);
  const perpsAccount = perpsState.currentPerpsAccount;

  const { data, loading: isFetching } = usePerpsClearHouseState({
    address: perpsAccount?.address,
  });

  const pnl = useMemo(() => {
    return data?.assetPositions.reduce((acc, item) => {
      return acc + Number(item.position.unrealizedPnl);
    }, 0);
  }, [data]);

  return {
    perpsPositionInfo: data,
    isFetching,
    positionPnl: pnl,
  };
};
