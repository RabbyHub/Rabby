import { useRequest } from 'ahooks';
import { useRabbyDispatch, useRabbySelector } from '../store';
import { useWallet } from '../utils';
import PQueue from 'p-queue';

const alertQueue = new PQueue({
  interval: 1000,
  intervalCap: 10,
  concurrency: 10,
});

export const useApprovalDangerCount = ({ address }: { address?: string }) => {
  const dispatch = useRabbyDispatch();
  const count = useRabbySelector((store) => {
    const approvalState = address
      ? store.account.approvalStatus[address] || []
      : [];

    return approvalState.reduce(
      (pre, now) =>
        pre + now.nft_approval_danger_cnt + now.token_approval_danger_cnt,
      0
    );
  });
  const wallet = useWallet();

  useRequest(
    async () => {
      if (!address) {
        return;
      }
      const res = await alertQueue.add(() =>
        wallet.openapi.approvalStatus(address)
      );
      return {
        res,
        address,
      };
    },
    {
      refreshDeps: [address],
      cacheKey: `cache-approval-account-${address}`,
      staleTime: 10_000,
      onSuccess(data) {
        if (data) {
          dispatch.account.setApprovalStatus({ [data.address]: data.res });
        }
      },
      ready: !!address,
    }
  );

  return count;
};
