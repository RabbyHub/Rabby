import { queryOptions } from '@tanstack/react-query';
import type { WalletControllerType } from '@/ui/utils/WalletContext';
import { createQueryKey } from '../queryKey';

export const tokenPriceQueryKey = (tokenId: string) =>
  createQueryKey('tokenPrice', {}, { tokenId });

export const tokenPriceQueryOptions = (
  wallet: WalletControllerType,
  tokenId: string
) =>
  queryOptions({
    queryKey: tokenPriceQueryKey(tokenId),
    queryFn: async () => {
      const {
        change_percent = 0,
        last_price = 0,
      } = await wallet.openapi.tokenPrice(tokenId);

      return {
        currentPrice: last_price,
        percentage: change_percent,
      };
    },
    enabled: Boolean(tokenId),
    staleTime: 5_000,
  });
