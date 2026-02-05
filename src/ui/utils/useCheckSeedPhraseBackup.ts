import { useRequest } from 'ahooks';
import { useWallet } from '.';

export const useCheckSeedPhraseBackup = (
  address: string,
  options?: {
    refreshOnWindowFocus?: boolean;
    manual?: boolean;
  }
) => {
  const wallet = useWallet();
  const { data = true, runAsync } = useRequest(
    () => wallet.checkSeedPhraseBackup(address),
    {
      cacheKey: `'check-seed-phrase-backup-${address}`,
      refreshDeps: [address],
      ...options,
      ready: !!address,
    }
  );

  return {
    hasBackup: data,
    runCheckBackup: runAsync,
  };
};
