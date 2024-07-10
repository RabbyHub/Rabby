import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useWallet } from '@/ui/utils';
import { useInfiniteScroll, useRequest } from 'ahooks';

export const useQueryDbkBridgeHistory = () => {
  const wallet = useWallet();
  const account = useCurrentAccount();
  return useInfiniteScroll(
    async () => {
      if (!account?.address) {
        return {
          list: [],
          page: {
            total: 0,
            start: 0,
            limit: 0,
          },
        };
      }
      const data = await wallet.openapi.getDbkBridgeHistoryList({
        user_addr: account.address,
      });
      return {
        list: data.data || [],
        page: data.page,
      };
    },
    {
      isNoMore(data) {
        if (!data) {
          return false;
        }
        return (data?.list.length || 0) >= (data?.page.total || 0);
      },
    }
  );
};
