import { useRequest } from 'ahooks';
import { KEYRING_CLASS } from '@/constant';
import { useWallet } from '.';

export const useCheckSeedPhraseBackup = (
  account: {
    address: string;
    type: string;
  },
  options?: {
    refreshOnWindowFocus?: boolean;
    manual?: boolean;
  }
) => {
  const wallet = useWallet();
  const { address, type } = account;
  const { data = true, runAsync } = useRequest(
    () => {
      if (type !== KEYRING_CLASS.MNEMONIC) {
        return Promise.resolve(true);
      }

      return wallet.checkSeedPhraseBackup(address);
    },
    {
      cacheKey: `check-seed-phrase-backup-${type}-${address}`,
      refreshDeps: [address, type],
      ...options,
      ready: !!address,
      onError() {
        // do nothing
      },
    }
  );

  return {
    hasBackup: data,
    runCheckBackup: runAsync,
  };
};
