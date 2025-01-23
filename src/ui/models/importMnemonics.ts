import { createModel } from '@rematch/core';

import { KEYRING_TYPE } from '@/constant';
import { RootModel } from '.';
import type { Account } from 'background/service/preference';

export type ISimpleAccount = Required<
  Pick<Account, 'address' | 'alianName' | 'index'>
>;

interface IState {
  isExistedKeyring: boolean;
  finalMnemonics: string;
  stashKeyringId: number | null;
  passphrase: string;

  queriedAccountsByAddress: Record<
    Exclude<Account['address'], undefined>,
    Account
  >;

  confirmingAccounts: ISimpleAccount[];
  importedAddresses: Set<Exclude<Account['address'], void>>;
  importedAccounts: Set<Exclude<Pick<Account, 'address' | 'index'>, void>>;
  selectedAddresses: Set<Exclude<Account['address'], void>>;
  draftAddressSelection: Set<Exclude<Account['address'], void>>;
}

const makeInitValues = () => {
  return {
    isExistedKeyring: false,
    finalMnemonics: '',
    passphrase: '',
    stashKeyringId: null,

    queriedAccountsByAddress: {},

    confirmingAccounts: [],
    importedAddresses: new Set(),
    importedAccounts: new Set(),
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
      finalMnemonics?: IState['finalMnemonics'];
      passphrase?: IState['passphrase'];
      isExistedKeyring?: IState['isExistedKeyring'];
      stashKeyringId: IState['stashKeyringId'];
    }) {
      const initValues = makeInitValues();

      if (payload.isExistedKeyring && !payload.finalMnemonics) {
        throw new Error(
          '[imporetMnemonics::switchKeyring] finalMnemonics is required if keyring existed!'
        );
      }

      dispatch.importMnemonics.setField({
        confirmingAccounts: initValues.confirmingAccounts,
        importedAddresses: initValues.importedAddresses,

        draftAddressSelection: initValues.draftAddressSelection,
        queriedAccountsByAddress: initValues.queriedAccountsByAddress,

        finalMnemonics: payload.finalMnemonics || '',
        passphrase: payload.passphrase || '',
        stashKeyringId: payload.stashKeyringId ?? null,
        isExistedKeyring: payload.isExistedKeyring ?? false,
      });
    },

    async getImportedAccountsAsync(_: void, store) {
      const importedAccounts = !store.importMnemonics.isExistedKeyring
        ? await store.app.wallet.requestKeyring<Account['address'][]>(
            KEYRING_TYPE.HdKeyring,
            'getAccounts',
            store.importMnemonics.stashKeyringId ?? null
          )
        : await store.app.wallet.requestHDKeyringByMnemonics<
            Account['address'][]
          >(
            store.importMnemonics.finalMnemonics,
            'getAccounts',
            store.importMnemonics.passphrase
          );

      dispatch.importMnemonics.setField({
        importedAddresses: new Set(
          importedAccounts.map((address) => address.toLowerCase())
        ),
      });
    },

    async getImportedAccounts(payload = {}, store) {
      const {
        isExistedKeyring,
        stashKeyringId,
        finalMnemonics,
      } = store.importMnemonics;
      const wallet = store.app.wallet;
      let addresses: string[];

      if (!isExistedKeyring) {
        addresses = await wallet.requestKeyring(
          KEYRING_TYPE.HdKeyring,
          'getAccounts',
          stashKeyringId ?? null
        );
      } else {
        addresses = await wallet.requestHDKeyringByMnemonics(
          finalMnemonics,
          'getAccounts',
          store.importMnemonics.passphrase
        );
      }

      const accounts = await Promise.all(
        addresses.map(async (address) => {
          let index = 0;

          if (!isExistedKeyring) {
            index = (
              await wallet.requestKeyring(
                KEYRING_TYPE.HdKeyring,
                'getInfoByAddress',
                stashKeyringId ?? null,
                address
              )
            ).index;
          } else {
            index = (
              await wallet.requestHDKeyringByMnemonics(
                finalMnemonics,
                'getInfoByAddress',
                store.importMnemonics.passphrase,
                address
              )
            ).index;
          }
          return {
            address,
            index: index + 1,
          };
        })
      );

      return accounts;
    },

    async cleanUpImportedInfoAsync(_: void, store) {
      if (!store.importMnemonics.isExistedKeyring) {
        store.app.wallet.requestKeyring(
          KEYRING_TYPE.HdKeyring,
          'cleanUp',
          store.importMnemonics.stashKeyringId ?? null
        );
      } else {
        store.app.wallet.requestHDKeyringByMnemonics(
          store.importMnemonics.finalMnemonics,
          'cleanUp',
          store.importMnemonics.passphrase
        );
      }
    },

    async getAccounts(
      payload: { firstFlag?: boolean; start?: number; end?: number },
      store
    ) {
      const { firstFlag = false, start, end } = payload;

      const wallet = store.app.wallet;
      let accounts: Account[];
      if (!store.importMnemonics.isExistedKeyring) {
        const stashKeyringId = store.importMnemonics.stashKeyringId;

        accounts = firstFlag
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
      } else {
        const finalMnemonics = store.importMnemonics.finalMnemonics;
        const passphrase = store.importMnemonics.passphrase;
        accounts = firstFlag
          ? await wallet.requestHDKeyringByMnemonics(
              finalMnemonics,
              'getFirstPage',
              passphrase
            )
          : end
          ? await wallet.requestHDKeyringByMnemonics(
              finalMnemonics,
              'getAddresses',
              passphrase,
              start,
              end
            )
          : await wallet.requestHDKeyringByMnemonics(
              finalMnemonics,
              'getNextPage',
              passphrase
            );
      }

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
          store.importMnemonics.finalMnemonics,
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
          let alianName = (await store.app.wallet.getAlianName(addr))!;
          if (!alianName) {
            const draftContactItem = await store.app.wallet.getCacheAlias(
              account.address
            );
            alianName = draftContactItem!.name;
          }

          return {
            address: account.address,
            index: account.index!,
            alianName: alianName,
          };
        })
      );

      dispatch.importMnemonics.setField({
        confirmingAccounts,
        selectedAddresses,
      });
    },

    beforeImportMoreAddresses(_: void, store) {
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

    async confirmAllImportingAccountsAsync(_: void, store) {
      const stashKeyringId = store.importMnemonics.stashKeyringId;
      const confirmingAccounts = store.importMnemonics.confirmingAccounts;
      const importedAddresses = store.importMnemonics.importedAddresses;
      const accountsToImport: ISimpleAccount[] = confirmingAccounts.filter(
        (account) => !importedAddresses.has(account.address)
      );

      if (!store.importMnemonics.isExistedKeyring) {
        await store.app.wallet.requestKeyring(
          KEYRING_TYPE.HdKeyring,
          'activeAccounts',
          stashKeyringId ?? null,
          accountsToImport.map((acc) => (acc.index as number) - 1)
        );
        await store.app.wallet.addKeyring(stashKeyringId!);
      } else {
        await store.app.wallet.activeAndPersistAccountsByMnemonics(
          store.importMnemonics.finalMnemonics,
          store.importMnemonics.passphrase,
          accountsToImport
        );
      }

      if (accountsToImport?.length) {
        const { basePublicKey } = await store.app.wallet.requestKeyring(
          KEYRING_TYPE.HdKeyring,
          'getInfoByAddress',
          stashKeyringId ?? null,
          accountsToImport[0].address
        );

        await store.app.wallet.addHDKeyRingLastAddAddrTime(basePublicKey);
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
