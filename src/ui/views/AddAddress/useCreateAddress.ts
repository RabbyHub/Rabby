import { useEnterPassphraseModal } from '@/ui/hooks/useEnterPassphraseModal';
import { useRabbyDispatch } from '@/ui/store';
import { useWallet } from '@/ui/utils';
import { useMemoizedFn } from 'ahooks';
import { useHistory } from 'react-router-dom';
import type { AddAddressNavigateHandler } from './shared';

export const CREATE_ADDRESS_SUCCESS_PATH =
  '/add-address/create-address-success';
export const CREATE_ADDRESS_SUCCESS_TYPE = 'create-address-success';
export const ADD_MORE_ADDRESSES_PATH = '/add-address/add-more-from-seed-phrase';
export const ADD_MORE_ADDRESSES_TYPE = 'add-more-from-seed-phrase';

export interface CreateAddressSuccessAddress {
  address: string;
  alias: string;
}

export interface CreateAddressSuccessState {
  addresses: CreateAddressSuccessAddress[];
  publicKey: string;
  titleKey: string;
  address?: string;
  alias?: string;
}

export interface AddMoreAddressesState {
  publicKey: string;
}

export const useCreateAddressActions = ({
  onNavigate,
}: {
  onNavigate?: AddAddressNavigateHandler;
} = {}) => {
  const history = useHistory();
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();
  const invokeEnterPassphrase = useEnterPassphraseModal('publickey');

  const openSuccessPage = useMemoizedFn(
    (state: CreateAddressSuccessState, options?: { replace?: boolean }) => {
      if (onNavigate) {
        onNavigate(CREATE_ADDRESS_SUCCESS_TYPE, state);
        return;
      }

      const method = options?.replace ? history.replace : history.push;
      method({
        pathname: CREATE_ADDRESS_SUCCESS_PATH,
        state,
      });
    }
  );

  const openAddMoreAddressesPage = useMemoizedFn(
    (state: AddMoreAddressesState) => {
      if (onNavigate) {
        onNavigate(ADD_MORE_ADDRESSES_TYPE, state);
        return;
      }

      history.push({
        pathname: ADD_MORE_ADDRESSES_PATH,
        state,
      });
    }
  );

  const createNewSeedPhrase = useMemoizedFn(
    async (options?: { replaceSuccess?: boolean }) => {
      const seedPhrase = await wallet.generateMnemonic();
      await wallet.createKeyringWithMnemonics(seedPhrase, {
        hasBackup: false,
      });

      const keyring = await wallet.getKeyringByMnemonic(seedPhrase, '');
      const publicKey = keyring?.publicKey;
      if (!publicKey) {
        throw new Error('Failed to create seed phrase keyring');
      }

      const result = await wallet.deriveNextAccountFromMnemonicByPublicKey(
        publicKey
      );
      dispatch.account.getCurrentAccountAsync();

      openSuccessPage(
        {
          addresses: [
            {
              address: result.address,
              alias: result.alias,
            },
          ],
          publicKey: result.publicKey,
          titleKey: 'page.newAddress.newSeedPhraseCreated',
        },
        { replace: options?.replaceSuccess }
      );
    }
  );

  const deriveNextAddressFromSeedPhrase = useMemoizedFn(
    async (publicKey: string, options?: { replaceSuccess?: boolean }) => {
      await invokeEnterPassphrase(publicKey);
      const result = await wallet.deriveNextAccountFromMnemonicByPublicKey(
        publicKey
      );
      dispatch.account.getCurrentAccountAsync();

      openSuccessPage(
        {
          addresses: [
            {
              address: result.address,
              alias: result.alias,
            },
          ],
          publicKey: result.publicKey,
          titleKey: 'page.newAddress.newAddressAdded',
        },
        { replace: options?.replaceSuccess }
      );
    }
  );

  return {
    createNewSeedPhrase,
    deriveNextAddressFromSeedPhrase,
    openAddMoreAddressesPage,
    openSuccessPage,
  };
};
