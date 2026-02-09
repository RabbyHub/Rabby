import { useRabbySelector } from '@/ui/store';
import { usePerpsClearHouseState } from './usePerpsClearingHouseState';
import { useEffect, useMemo } from 'react';
import { ga4 } from '@/utils/ga4';

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

  const existPosition = useMemo(() => {
    return data?.assetPositions?.length && data.assetPositions.length > 0;
  }, [data?.assetPositions?.length]);

  useEffect(() => {
    if (existPosition) {
      ga4.fireEvent('Perps_ExistPosition', {
        event_category: 'Rabby Perps',
      });
    }
  }, [existPosition]);

  return {
    perpsPositionInfo: data,
    isFetching,
    positionPnl: pnl,
  };
};
