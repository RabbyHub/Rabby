import { KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import { openInternalPageInTab, useWallet } from '@/ui/utils';
import { useCallback, useMemo } from 'react';
import { useAsync } from 'react-use';
import { useWalletUnlocked } from '@/ui/hooks/useWalletUnlocked';
import { TypeKeyringGroup, useWalletTypeData } from '../ManageAddress/hooks';
import { useEnterPassphraseModal } from '@/ui/hooks/useEnterPassphraseModal';
import { sortSeedPhraseGroups } from './sort';
import {
  ensureWalletUnlocked,
  isWalletUnlockCancelled,
} from '@/ui/utils/walletUnlock';

const useGetHdKeys = (enabled: boolean) => {
  const wallet = useWallet();
  return useAsync(async () => {
    if (!enabled) {
      return [];
    }
    const allClassAccounts = await wallet.getAllClassAccounts();
    return allClassAccounts.filter(
      (item) => item.type === KEYRING_TYPE['HdKeyring']
    );
  }, [enabled, wallet]);
};

export const UseSeedPhrase = () => {
  const { accountGroup } = useWalletTypeData();
  const { isReady, isUnlocked } = useWalletUnlocked();
  const { value } = useGetHdKeys(isUnlocked);

  const invokeEnterPassphrase = useEnterPassphraseModal('publickey');
  const wallet = useWallet();

  const hasSeedPhrase = useMemo(() => {
    const groups = accountGroup?.[0];
    if (!groups) {
      return false;
    }
    return Object.values(groups).some(
      (group) => group.type === KEYRING_TYPE['HdKeyring']
    );
  }, [accountGroup]);

  const handleAddSeedPhraseAddress = useCallback(
    async (publicKey: string) => {
      if (publicKey) {
        try {
          await ensureWalletUnlocked({ wallet });
        } catch (error) {
          if (isWalletUnlockCancelled(error)) {
            return;
          }
          throw error;
        }
        await invokeEnterPassphrase(publicKey);
        const keyringId = await wallet.getMnemonicKeyRingIdFromPublicKey(
          publicKey
        );
        openInternalPageInTab(
          `import/select-address?hd=${KEYRING_CLASS.MNEMONIC}&keyringId=${keyringId}`
        );
      }
    },
    [invokeEnterPassphrase, wallet]
  );

  const seedPhraseList = useMemo(() => {
    if (isUnlocked && accountGroup && value) {
      const publicKeys = value.map((e) => e.publicKey!);
      const pbMappings = Object.values(accountGroup[0]).reduce((pre, cur) => {
        if (cur.type === KEYRING_TYPE['HdKeyring']) {
          pre[cur.publicKey || ''] = cur;
        }
        return pre;
      }, {} as Record<string, TypeKeyringGroup>);
      return sortSeedPhraseGroups(
        publicKeys
          .map((e) => pbMappings[e])
          .filter((e) => !!e)
          .map((e, index) => ({ ...e, index })) as TypeKeyringGroup[]
      );
    }
    return [];
  }, [accountGroup, isUnlocked, value]);

  return {
    hasSeedPhrase,
    isReady,
    isUnlocked,
    seedPhraseList,
    handleAddSeedPhraseAddress,
  };
};

export const useHadSeedPhrase = () => {
  const { hasSeedPhrase } = UseSeedPhrase();
  return hasSeedPhrase;
};
