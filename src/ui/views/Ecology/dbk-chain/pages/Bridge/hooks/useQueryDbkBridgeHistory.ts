import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useWallet } from '@/ui/utils';
import { useInfiniteScroll, useRequest } from 'ahooks';

const PageSize = 20;

export const useQueryDbkBridgeHistory = () => {
  const wallet = useWallet();
  const account = useCurrentAccount();
  return useInfiniteScroll(
    async (prev) => {
      if (!account?.address) {
        return {
          list: [],
          page: {
            total: 0,
            start: 0,
            limit: PageSize,
          },
        };
      }
      const data = await wallet.openapi.getDbkBridgeHistoryList({
        user_addr: account.address,
        start: prev ? prev.page.start + prev.page.limit : 0,
        limit: PageSize,
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
