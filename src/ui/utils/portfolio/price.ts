import { WalletControllerType } from '../WalletContext';
import { pQueue, chunk } from './utils';

// 历史 token 价格
export const getTokenHistoryPrice = async (
  chain: string,
  ids: string[],
  time_at: number,
  wallet: WalletControllerType,
  isTestnet = false
) => {
  const idChunks = chunk(ids, 100);

  const res = await Promise.all(
    idChunks.map((c) =>
      pQueue.add(() => {
        if (isTestnet) {
          return wallet.testnetOpenapi
            .getTokenHistoryDict({
              chainId: chain,
              ids: c.join(','),
              timeAt: time_at,
            })
            .catch(() => null);
        }
        return wallet.openapi
          .getTokenHistoryDict({
            chainId: chain,
            ids: c.join(','),
            timeAt: time_at,
          })
          .catch(() => null);
      })
    )
  );

  return res.reduce(
    (m, n) => (n ? { ...m, ...n } : m),
    {} as Record<string, number>
  );
};
