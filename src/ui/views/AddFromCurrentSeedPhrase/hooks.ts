import { KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import { openInternalPageInTab, useWallet } from '@/ui/utils';
import { useCallback, useMemo } from 'react';
import { useAsync } from 'react-use';
import { TypeKeyringGroup, useWalletTypeData } from '../ManageAddress/hooks';
import { useEnterPassphraseModal } from '@/ui/hooks/useEnterPassphraseModal';

const useGetHdKeys = () => {
  const wallet = useWallet();
  return useAsync(async () => {
    const allClassAccounts = await wallet.getAllClassAccounts();
    return allClassAccounts.filter(
      (item) => item.type === KEYRING_TYPE['HdKeyring']
    );
  });
};

export const UseSeedPhrase = () => {
  const { accountGroup } = useWalletTypeData();
  console.log('accountGroup', accountGroup);
  const { value } = useGetHdKeys();

  const invokeEnterPassphrase = useEnterPassphraseModal('publickey');
  const wallet = useWallet();

  const handleAddSeedPhraseAddress = useCallback(
    async (publicKey: string) => {
      if (publicKey) {
        await invokeEnterPassphrase(publicKey);
        const keyringId = await wallet.getMnemonicKeyRingIdFromPublicKey(
          publicKey
        );
        openInternalPageInTab(
          `import/select-address?hd=${KEYRING_CLASS.MNEMONIC}&keyringId=${keyringId}`
        );
      }
    },
    [invokeEnterPassphrase, wallet?.getMnemonicKeyRingIdFromPublicKey]
  );

  const { value: timeStores } = useAsync(() =>
    wallet.getHDKeyRingLastAddAddrTimeStore()
  );

  const seedPhraseList = useMemo(() => {
    if (accountGroup && value && timeStores) {
      const publicKeys = value.map((e) => e.publicKey!);
      const pbMappings = Object.values(accountGroup[0]).reduce((pre, cur) => {
        if (cur.type === KEYRING_TYPE['HdKeyring']) {
          pre[cur.publicKey || ''] = cur;
        }
        return pre;
      }, {} as Record<string, TypeKeyringGroup>);

      return publicKeys
        .map((e) => pbMappings[e])
        .filter((e) => !!e)
        .map((e, index) => ({ ...e, index: index }))
        .sort((a, b) => {
          const aTime = timeStores?.[a.publicKey!] || 0;
          const bTime = timeStores?.[b.publicKey!] || 0;

          return bTime - aTime;
        }) as TypeKeyringGroup[];
    }
    return [];
  }, [accountGroup, value, timeStores]);

  return {
    seedPhraseList,
    handleAddSeedPhraseAddress,
  };
};

export const useHadSeedPhrase = () => {
  const { value, loading } = useGetHdKeys();
  return !loading && !!value && value?.length > 0;
};
