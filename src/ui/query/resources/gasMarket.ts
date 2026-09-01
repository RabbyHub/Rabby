import { queryOptions } from '@tanstack/react-query';
import type { WalletControllerType } from '@/ui/utils/WalletContext';
import { findChain } from '@/utils/chain';
import { createQueryKey } from '../queryKey';

export const gasMarketQueryKey = (chainServerId: string) =>
  createQueryKey('gasMarket', {
    chainId: chainServerId,
  });

export const gasMarketQueryOptions = (
  wallet: WalletControllerType,
  chainServerId: string
) =>
  queryOptions({
    queryKey: gasMarketQueryKey(chainServerId),
    queryFn: async () => {
      try {
        const chain = findChain({
          serverId: chainServerId,
        });
        const marketGas = chain?.isTestnet
          ? await wallet.getCustomTestnetGasMarket({
              chainId: chain.id,
            })
          : await wallet.gasMarketV2({
              chainId: chainServerId,
            });
        const selectedGasPrice = marketGas.find((item) => item.level === 'slow')
          ?.price;

        return selectedGasPrice ? Number(selectedGasPrice / 1e9) : 0;
      } catch {
        return 0;
      }
    },
    enabled: Boolean(chainServerId),
    staleTime: 5_000,
  });
