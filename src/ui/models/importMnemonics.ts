import { createModel } from '@rematch/core';

import { KEYRING_TYPE } from '@/constant';
import { RootModel } from '.';
import type { Account } from 'background/service/preference';
import { ContactBookItem } from '@/background/service/contactBook';

export type ISimpleAccount = Pick<Account, 'address' | 'alianName' | 'index'>;

interface IState {
  isExistedKeyring: boolean;
  stashKeyringId: number | null;

  queriedAccountsByAddress: Record<
    Exclude<Account['address'], undefined>,
    Account
  >;

  confirmingAccounts: ISimpleAccount[];
  importedAddresses: Set<Exclude<Account['address'], void>>;

  selectedAddresses: Set<Exclude<Account['address'], void>>;
  draftAddressSelection: Set<Exclude<Account['address'], void>>;
}

const makeInitValues = () => {
  return {
    isExistedKeyring: false,
    stashKeyringId: null,

    queriedAccountsByAddress: {},

    confirmingAccounts: [],
    importedAddresses: new Set(),

    selectedAddresses: new Set(),
    draftAddressSelection: new Set(),
  } as IState;
};

export const importMnemonics = createModel<RootModel>()({
  name: 'importMnemonics',

  state: makeInitValues(),

  reducers: {
    setField(state, payload: Partial<typeof state>) {
      return Object.keys(payload).reduce(
        (accu, key) => {
          accu[key] = payload[key];
          return accu;
        },
        { ...state }
      );
    },
  },

  selectors(slice) {
    return {
      accountsToImport() {
        return slice(
          (s) =>
            s.confirmingAccounts.filter(
              (account) => !s.importedAddresses.has(account.address)
            ) as Account[]
        );
      },
      countDraftSelected() {
        return slice(
          (s) =>
            [...s.draftAddressSelection].filter(
              (addr) => !s.importedAddresses.has(addr)
            ).length
        );
      },
    };
  },

  effects: (dispatch) => ({
    switchKeyring(payload: {
      isExistedKeyring: IState['isExistedKeyring'];
      stashKeyringId: IState['stashKeyringId'];
    }) {
      const initValues = makeInitValues();

      dispatch.importMnemonics.setField({
        confirmingAccounts: initValues.confirmingAccounts,
        importedAddresses: initValues.importedAddresses,

        draftAddressSelection: initValues.draftAddressSelection,

        stashKeyringId: payload.stashKeyringId ?? null,
        isExistedKeyring: payload.isExistedKeyring ?? false,
      });
    },

    async getImportedAccountsAsync(_?: void, store?) {
      const importedAccounts = await store.app.wallet.requestKeyring<
        Account['address'][]
      >(
        KEYRING_TYPE.HdKeyring,
        'getAccounts',
        store.importMnemonics.stashKeyringId ?? null
      );

      dispatch.importMnemonics.setField({
        importedAddresses: new Set(
          importedAccounts.map((address) => address.toLowerCase())
        ),
      });
    },

    async cleanUpImportedInfoAsync(_?: void, store?) {
      store.app.wallet.requestKeyring(
        KEYRING_TYPE.HdKeyring,
        'cleanUp',
        store.importMnemonics.stashKeyringId ?? null
      );
    },

    async getAccounts(
      payload: { firstFlag?: boolean; start?: number; end?: number },
      store
    ) {
      const { firstFlag = false, start, end } = payload;

      const wallet = store.app.wallet;
      const stashKeyringId = store.importMnemonics.stashKeyringId;

      const accounts: Account[] = firstFlag
        ? await wallet.requestKeyring(
            KEYRING_TYPE.HdKeyring,
            'getFirstPage',
            stashKeyringId ?? null
          )
        : end
        ? await wallet.requestKeyring(
            KEYRING_TYPE.HdKeyring,
            'getAddresses',
            stashKeyringId ?? null,
            start,
            end
          )
        : await wallet.requestKeyring(
            KEYRING_TYPE.HdKeyring,
            'getNextPage',
            stashKeyringId ?? null
          );

      dispatch.importMnemonics.memorizeQuriedAccounts({
        accounts,
      });

      return accounts;
    },

    memorizeQuriedAccounts(payload: { accounts: Account[] }, store) {
      const queriedAccountsByAddress =
        store.importMnemonics.queriedAccountsByAddress;

      payload.accounts.forEach((account) => {
        queriedAccountsByAddress[account.address] = account;
      });

      dispatch.importMnemonics.setField({
        queriedAccountsByAddress: Object.assign({}, queriedAccountsByAddress),
      });
    },

    async setImportingAccountAlianNameByIndex(
      payload: { index: Account['index']; alianName: string },
      store
    ) {
      const confirmingAccounts = store.importMnemonics.confirmingAccounts;
      const accountIndex = confirmingAccounts.findIndex(
        (item) => item.index === payload.index
      );
      const account = confirmingAccounts[accountIndex];

      if (account) {
        account.alianName = payload.alianName;
        dispatch.importMnemonics.setField({
          confirmingAccounts: [...confirmingAccounts],
        });
      }
    },

    async setSelectedAccounts(
      addresses: Exclude<Account['address'], void>[],
      store
    ) {
      const importedAddresses = store.importMnemonics.importedAddresses;
      const stashKeyringId = store.importMnemonics.stashKeyringId!;
      const isExistedKeyring = store.importMnemonics.isExistedKeyring;
      const queriedAccountsByAddress =
        store.importMnemonics.queriedAccountsByAddress;

      const selectedAddresses = new Set(addresses);
      const addressList = [...selectedAddresses].sort(
        (a, b) =>
          queriedAccountsByAddress[a].index! -
          queriedAccountsByAddress[b].index!
      );

      if (isExistedKeyring) {
        const addressesUnImporeted = addressList.filter(
          (addr) => !importedAddresses.has(addr)
        );
        await store.app.wallet.generateAliasCacheForExistedMnemonic(
          stashKeyringId,
          addressesUnImporeted
        );
      } else {
        await store.app.wallet.generateAliasCacheForFreshMnemonic(
          stashKeyringId,
          addressList.map((addr) => queriedAccountsByAddress[addr].index! - 1)
        );
      }

      const confirmingAccounts = await Promise.all(
        addressList.map(async (addr) => {
          const account = queriedAccountsByAddress[addr];
          let alianName: string;
          if (importedAddresses.has(addr)) {
            alianName = await store.app.wallet.getAlianName(addr);
          } else {
            const draftContactItem = await store.app.wallet.getCacheAlias<ContactBookItem>(
              account.address
            );
            alianName = draftContactItem.name;
          }

          return {
            address: account.address,
            index: account.index,
            alianName: alianName,
          };
        })
      );

      dispatch.importMnemonics.setField({
        confirmingAccounts,
        selectedAddresses,
      });
    },

    beforeImportMoreAddresses(_?: void, store?) {
      const selectedAddresses = store.importMnemonics.selectedAddresses;
      dispatch.importMnemonics.setField({
        draftAddressSelection: new Set([...selectedAddresses]),
      });
    },

    clearDraftAddresses() {
      dispatch.importMnemonics.setField({
        draftAddressSelection: new Set(),
      });
    },

    async confirmAllImportingAccountsAsync(_?: void, store?) {
      const stashKeyringId = store.importMnemonics.stashKeyringId;
      const confirmingAccounts = store.importMnemonics.confirmingAccounts;
      const importedAddresses = store.importMnemonics.importedAddresses;
      const accountsToImport: ISimpleAccount[] = confirmingAccounts.filter(
        (account) => !importedAddresses.has(account.address)
      );

      await store.app.wallet.requestKeyring(
        KEYRING_TYPE.HdKeyring,
        'activeAccounts',
        stashKeyringId ?? null,
        accountsToImport.map((acc) => (acc.index as number) - 1)
      );
      if (stashKeyringId) {
        await store.app.wallet.addKeyring(stashKeyringId);
      }

      await Promise.all(
        accountsToImport.map((account) => {
          return store.app.wallet.updateAlianName(
            account.address?.toLowerCase(),
            account.alianName || ''
          );
        })
      );
    },
  }),
});
