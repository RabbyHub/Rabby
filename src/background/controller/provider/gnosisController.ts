import { createSafeService } from '@/background/utils/safe';
import { poll } from '@/utils/poll';

export const gnosisController = {
  watchMessage: async ({
    address,
    chainId,
    safeMessageHash,
    pollingInterval = 10000,
  }: {
    address: string;
    chainId: number;
    safeMessageHash: string;
    pollingInterval?: number;
  }) => {
    const safe = await createSafeService({
      address,
      networkId: String(chainId),
    });
    const threshold = await safe.getThreshold();

    // todo: manual destroy
    return new Promise((resolve, reject) => {
      poll(
        async ({ unpoll }) => {
          const res = await safe.apiKit.getMessage(safeMessageHash);
          if (res.confirmations.length >= threshold) {
            resolve(res.preparedSignature);
            unpoll();
          }
        },
        {
          interval: pollingInterval,
          emitOnBegin: true,
        }
      );
    });
  },
};
