import { useRabbySelector } from '@/ui/store';
import { usePerpsClearHouseState } from './usePerpsClearingHouseState';

export const usePerpsHomePnl = () => {
  const perpsState = useRabbySelector((state) => state.perps);
  const perpsAccount = perpsState.currentPerpsAccount;

  const { data, loading: isFetching } = usePerpsClearHouseState({
    address: perpsAccount?.address,
  });

  return {
    perpsPositionInfo: data,
    isFetching,
  };
};
