import { historyDbService } from '../services/historyDbService';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '..';
import { useRequest } from 'ahooks';

export const useSyncDbHistory = (options: { address: string }) => {
  // return useQuery({
  //   queryKey: ['syncHistory', options.address],
  //   queryFn: async () => {
  //     const { address } = options;
  //     await historyDbService.sync({ address });
  //   },
  //   refetchOnWindowFocus: false,
  //   refetchOnReconnect: false,
  //   staleTime: 1 * 60 * 1000, // 1 minute
  //   cacheTime: 5 * 60 * 1000, // 5 minutes
  // });

  return useRequest(
    () => {
      const { address } = options;
      return historyDbService.sync({ address });
    },
    {
      refreshDeps: [options.address],
      cacheKey: `syncHistory-${options.address}`,
      staleTime: 0.5 * 60 * 1000,
      ready: !!options.address,
    }
  );
};

export const useQueryDbHistory = (options: {
  address: string;
  isFilterScam?: boolean;
}) => {
  const { address, isFilterScam } = options;

  const { loading } = useSyncDbHistory({ address });

  const data = useLiveQuery(() => {
    return db.history
      .where('owner_addr')
      .equalsIgnoreCase(address)
      .and((item) => {
        return isFilterScam ? !item.is_scam && !item.is_small_tx : true;
      })
      .reverse()
      .sortBy('time_at');
  }, [address, isFilterScam]);

  return {
    data,
    isLoading: loading || data === undefined,
  };
};
