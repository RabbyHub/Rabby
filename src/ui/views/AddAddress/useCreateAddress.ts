import { useEnterPassphraseModal } from '@/ui/hooks/useEnterPassphraseModal';
import { useRabbyDispatch } from '@/ui/store';
import { useWallet } from '@/ui/utils';
import { obj2query } from '@/ui/utils/url';
import { useMemoizedFn } from 'ahooks';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import type { AddAddressNavigateHandler } from './shared';

export const CREATE_ADDRESS_SUCCESS_PATH =
  '/add-address/create-address-success';
export const CREATE_ADDRESS_SUCCESS_TYPE = 'create-address-success';
export const IMPORT_ADDRESS_SUCCESS_PATH =
  '/add-address/import-address-success';
export const IMPORT_ADDRESS_SUCCESS_TYPE = 'import-address-success';
export const IMPORT_ADDRESS_SUCCESS_RETURN_TO_QUERY_KEY =
  'returnToSelectAddressSearch';
export const ADD_MORE_ADDRESSES_PATH = '/add-address/add-more-from-seed-phrase';
export const ADD_MORE_ADDRESSES_TYPE = 'add-more-from-seed-phrase';
export const ADDRESS_BACKUP_MNEMONICS_PATH =
  '/settings/address-backup/mneonics';
export const ADDRESS_BACKUP_MODAL_SEARCH = `?${obj2query({
  action: 'address-backup',
  backupType: 'mneonics',
})}`;
export const BACKUP_SEED_PHRASE_REDIRECT_PATH = '/dashboard';

export interface CreateAddressSuccessAddress {
  address: string;
  alias: string;
  importedBefore?: boolean;
}

export interface CreateAddressSuccessState {
  addresses: CreateAddressSuccessAddress[];
  publicKey: string;
  title: string;
  description?: string;
  primaryAction?: 'done' | 'open-wallet';
  address?: string;
  alias?: string;
  seedPhrase?: string;
  returnToSelectAddressSearch?: string;
}

export interface AddMoreAddressesState {
  publicKey: string;
  successState?: CreateAddressSuccessState;
}

export interface BackupSeedPhrasePageState {
  address: string;
  data: string;
  redirectTo: string;
}

export interface CreateAddressSuccessSecondaryAction {
  kind: 'backup' | 'add-more';
  labelKey: string;
}

export const getCreateAddressSuccessSecondaryAction = (
  state: Pick<
    CreateAddressSuccessState,
    'address' | 'publicKey' | 'primaryAction' | 'seedPhrase'
  >
): CreateAddressSuccessSecondaryAction | null => {
  if (!state.publicKey || state.primaryAction === 'open-wallet') {
    return null;
  }

  if (!state.address || !state.seedPhrase) {
    return {
      kind: 'add-more',
      labelKey: 'page.newAddress.addMoreAddressesFromThisSeedPhrase',
    };
  }

  return {
    kind: 'backup',
    labelKey: 'page.newUserImport.successful.backupSeedPhrase',
  };
};

export const getBackupSeedPhrasePageRoute = ({
  currentPathname,
  isInModalFlow,
  state,
}: {
  currentPathname: string;
  isInModalFlow: boolean;
  state: BackupSeedPhrasePageState;
}) => {
  if (isInModalFlow) {
    return {
      pathname: currentPathname,
      search: ADDRESS_BACKUP_MODAL_SEARCH,
      state: {
        ...state,
        redirectTo: currentPathname,
      },
    };
  }

  return {
    pathname: ADDRESS_BACKUP_MNEMONICS_PATH,
    state,
  };
};

export const useCreateAddressActions = ({
  onNavigate,
}: {
  onNavigate?: AddAddressNavigateHandler;
} = {}) => {
  const history = useHistory();
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();
  const { t } = useTranslation();
  const invokeEnterPassphrase = useEnterPassphraseModal('publickey');

  const hydrateSuccessState = useMemoizedFn(
    async (state: CreateAddressSuccessState) => {
      const nextAddresses = await Promise.all(
        (state.addresses || []).map(async (item) => {
          if (!item.address || item.alias?.trim()) {
            return item;
          }

          const alias = await wallet.getAlianName(item.address);
          return {
            ...item,
            alias: alias || '',
          };
        })
      );

      return {
        ...state,
        addresses: nextAddresses,
      };
    }
  );

  const openSuccessPage = useMemoizedFn(
    async (
      state: CreateAddressSuccessState,
      options?: { replace?: boolean }
    ) => {
      const nextState = await hydrateSuccessState(state);
      if (onNavigate) {
        onNavigate(CREATE_ADDRESS_SUCCESS_TYPE, nextState);
        return;
      }

      const method = options?.replace ? history.replace : history.push;
      method({
        pathname: CREATE_ADDRESS_SUCCESS_PATH,
        state: nextState,
      });
    }
  );

  const openImportSuccessPage = useMemoizedFn(
    async (
      state: CreateAddressSuccessState,
      options?: { replace?: boolean }
    ) => {
      const nextState = await hydrateSuccessState(state);
      if (onNavigate) {
        onNavigate(IMPORT_ADDRESS_SUCCESS_TYPE, nextState);
        return;
      }

      const method = options?.replace ? history.replace : history.push;
      method({
        pathname: IMPORT_ADDRESS_SUCCESS_PATH,
        state: nextState,
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

  const openBackupSeedPhrasePage = useMemoizedFn(
    (state: BackupSeedPhrasePageState) => {
      const nextRoute = getBackupSeedPhrasePageRoute({
        currentPathname: history.location.pathname,
        isInModalFlow: !!onNavigate,
        state,
      });

      history.push(nextRoute);

      if (onNavigate) {
        onNavigate('done');
      }
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

      await openSuccessPage(
        {
          addresses: [
            {
              address: result.address,
              alias: result.alias,
            },
          ],
          address: result.address,
          alias: result.alias,
          publicKey: result.publicKey,
          seedPhrase,
          title: t('page.newAddress.newSeedPhraseCreated'),
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

      await openSuccessPage(
        {
          addresses: [
            {
              address: result.address,
              alias: result.alias,
            },
          ],
          publicKey: result.publicKey,
          title: t('page.newAddress.newAddressCreated'),
        },
        { replace: options?.replaceSuccess }
      );
    }
  );

  return {
    createNewSeedPhrase,
    deriveNextAddressFromSeedPhrase,
    openAddMoreAddressesPage,
    openBackupSeedPhrasePage,
    openImportSuccessPage,
    openSuccessPage,
  };
};
