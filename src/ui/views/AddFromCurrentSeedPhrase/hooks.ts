import { KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import { openInternalPageInTab, useWallet } from '@/ui/utils';
import { useCallback, useMemo } from 'react';
import { useAsync } from 'react-use';
import { TypeKeyringGroup, useWalletTypeData } from '../ManageAddress/hooks';
import { useEnterPassphraseModal } from '@/ui/hooks/useEnterPassphraseModal';
import { addAddressFromSeedPhrase } from '@/ui/utils/addAddressFromSeedPhrase';

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
      console.log('get HANDLEADDSEEDPHRASEADDRESS::: public key', publicKey);
      if (publicKey) {
        console.log(
          'handleaddseedphraseaddress::: public key exist',
          publicKey
        );
        await invokeEnterPassphrase(publicKey);
        const keyringId = await wallet.getMnemonicKeyRingIdFromPublicKey(
          publicKey
        );
        console.log('get HANDLEADDSEEDPHRASEADDRESS::: keyring', keyringId);
        openInternalPageInTab(
          `import/select-address?hd=${KEYRING_CLASS.MNEMONIC}&keyringId=${keyringId}`
        );
      }
      console.log(
        'handleaddseedphraseaddress::: public key not exist',
        publicKey
      );
    },
    [invokeEnterPassphrase, wallet?.getMnemonicKeyRingIdFromPublicKey]
  );

  const addSeedPhraseAddressDirect = useCallback(
    async (publicKey: string) => {
      if (!publicKey) {
        throw new Error('Public key is required');
      }

      await invokeEnterPassphrase(publicKey);
      return addAddressFromSeedPhrase(wallet, publicKey);
    },
    [invokeEnterPassphrase, wallet]
  );

  const seedPhraseList = useMemo(() => {
    if (accountGroup && value) {
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
        .map((e, index) => ({ ...e, index: index })) as TypeKeyringGroup[];
    }
    return [];
  }, [accountGroup, value]);

  return {
    seedPhraseList,
    handleAddSeedPhraseAddress,
    addSeedPhraseAddressDirect,
  };
};

export const useHadSeedPhrase = () => {
  const { value, loading } = useGetHdKeys();
  return !loading && !!value && value?.length > 0;
};
