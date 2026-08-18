import { create } from 'zustand';

import { KEYRING_TYPE } from '@/constant';
import type { Account } from '@/background/service/preference';
import { wallet } from '@/ui/wallet';

export type ISimpleAccount = Required<
  Pick<Account, 'address' | 'alianName' | 'index'>
>;

export type ImportMnemonicsState = {
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
};

type SwitchKeyringPayload = {
  finalMnemonics?: ImportMnemonicsState['finalMnemonics'];
  passphrase?: ImportMnemonicsState['passphrase'];
  isExistedKeyring?: ImportMnemonicsState['isExistedKeyring'];
  stashKeyringId: ImportMnemonicsState['stashKeyringId'];
};

type ImportMnemonicsActions = {
  setField: (partials: Partial<ImportMnemonicsState>) => void;
  switchKeyring: (payload: SwitchKeyringPayload) => void;
  getImportedAccountsAsync: () => Promise<void>;
  getImportedAccounts: (
    payload?: Record<string, never>
  ) => Promise<
    Array<{
      address: string;
      index: number;
    }>
  >;
  cleanUpImportedInfoAsync: () => Promise<void>;
  getAccounts: (payload: {
    firstFlag?: boolean;
    start?: number;
    end?: number;
  }) => Promise<Account[]>;
  memorizeQuriedAccounts: (payload: { accounts: Account[] }) => void;
  setImportingAccountAlianNameByIndex: (payload: {
    index: Account['index'];
    alianName: string;
  }) => Promise<void>;
  setSelectedAccounts: (
    addresses: Exclude<Account['address'], void>[]
  ) => Promise<void>;
  beforeImportMoreAddresses: () => void;
  clearDraftAddresses: () => void;
  confirmAllImportingAccountsAsync: () => Promise<void>;
};

export type ImportMnemonicsStore = ImportMnemonicsState &
  ImportMnemonicsActions;

export const getDefaultImportMnemonicsState = (): ImportMnemonicsState => ({
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
});

export const selectAccountsToImport = (state: ImportMnemonicsState) =>
  state.confirmingAccounts.filter(
    (account) => !state.importedAddresses.has(account.address)
  ) as Account[];

export const selectCountDraftSelected = (state: ImportMnemonicsState) =>
  [...state.draftAddressSelection].filter(
    (address) => !state.importedAddresses.has(address)
  ).length;

export const useImportMnemonicsStore = create<ImportMnemonicsStore>()(
  (set, get) => ({
    ...getDefaultImportMnemonicsState(),

    setField(partials) {
      set(partials);
    },

    switchKeyring(payload) {
      const initialState = getDefaultImportMnemonicsState();

      if (payload.isExistedKeyring && !payload.finalMnemonics) {
        throw new Error(
          '[imporetMnemonics::switchKeyring] finalMnemonics is required if keyring existed!'
        );
      }

      set({
        confirmingAccounts: initialState.confirmingAccounts,
        importedAddresses: initialState.importedAddresses,
        draftAddressSelection: initialState.draftAddressSelection,
        queriedAccountsByAddress: initialState.queriedAccountsByAddress,
        finalMnemonics: payload.finalMnemonics || '',
        passphrase: payload.passphrase || '',
        stashKeyringId: payload.stashKeyringId ?? null,
        isExistedKeyring: payload.isExistedKeyring ?? false,
      });
    },

    async getImportedAccountsAsync() {
      const state = get();
      const importedAccounts = !state.isExistedKeyring
        ? await wallet.requestKeyring<Account['address'][]>(
            KEYRING_TYPE.HdKeyring,
            'getAccounts',
            state.stashKeyringId ?? null
          )
        : await wallet.requestHDKeyringByMnemonics<Account['address'][]>(
            state.finalMnemonics,
            'getAccounts',
            state.passphrase
          );

      set({
        importedAddresses: new Set(
          importedAccounts.map((address) => address.toLowerCase())
        ),
      });
    },

    async getImportedAccounts() {
      const state = get();
      let addresses: string[];

      if (!state.isExistedKeyring) {
        addresses = await wallet.requestKeyring(
          KEYRING_TYPE.HdKeyring,
          'getAccounts',
          state.stashKeyringId ?? null
        );
      } else {
        addresses = await wallet.requestHDKeyringByMnemonics(
          state.finalMnemonics,
          'getAccounts',
          state.passphrase
        );
      }

      return Promise.all(
        addresses.map(async (address) => {
          const info = !state.isExistedKeyring
            ? await wallet.requestKeyring(
                KEYRING_TYPE.HdKeyring,
                'getInfoByAddress',
                state.stashKeyringId ?? null,
                address
              )
            : await wallet.requestHDKeyringByMnemonics(
                state.finalMnemonics,
                'getInfoByAddress',
                state.passphrase,
                address
              );

          return {
            address,
            index: info.index + 1,
          };
        })
      );
    },

    async cleanUpImportedInfoAsync() {
      const state = get();
      if (!state.isExistedKeyring) {
        await wallet.requestKeyring(
          KEYRING_TYPE.HdKeyring,
          'cleanUp',
          state.stashKeyringId ?? null
        );
      } else {
        await wallet.requestHDKeyringByMnemonics(
          state.finalMnemonics,
          'cleanUp',
          state.passphrase
        );
      }
    },

    async getAccounts({ firstFlag = false, start, end }) {
      const state = get();
      let accounts: Account[];

      if (!state.isExistedKeyring) {
        accounts = firstFlag
          ? await wallet.requestKeyring(
              KEYRING_TYPE.HdKeyring,
              'getFirstPage',
              state.stashKeyringId ?? null
            )
          : end
          ? await wallet.requestKeyring(
              KEYRING_TYPE.HdKeyring,
              'getAddresses',
              state.stashKeyringId ?? null,
              start,
              end
            )
          : await wallet.requestKeyring(
              KEYRING_TYPE.HdKeyring,
              'getNextPage',
              state.stashKeyringId ?? null
            );
      } else {
        accounts = firstFlag
          ? await wallet.requestHDKeyringByMnemonics(
              state.finalMnemonics,
              'getFirstPage',
              state.passphrase
            )
          : end
          ? await wallet.requestHDKeyringByMnemonics(
              state.finalMnemonics,
              'getAddresses',
              state.passphrase,
              start,
              end
            )
          : await wallet.requestHDKeyringByMnemonics(
              state.finalMnemonics,
              'getNextPage',
              state.passphrase
            );
      }

      get().memorizeQuriedAccounts({ accounts });
      return accounts;
    },

    memorizeQuriedAccounts({ accounts }) {
      const queriedAccountsByAddress = get().queriedAccountsByAddress;
      accounts.forEach((account) => {
        queriedAccountsByAddress[account.address] = account;
      });
      set({
        queriedAccountsByAddress: { ...queriedAccountsByAddress },
      });
    },

    async setImportingAccountAlianNameByIndex({ index, alianName }) {
      const confirmingAccounts = get().confirmingAccounts;
      const accountIndex = confirmingAccounts.findIndex(
        (item) => item.index === index
      );
      const account = confirmingAccounts[accountIndex];

      if (account) {
        account.alianName = alianName;
        set({ confirmingAccounts: [...confirmingAccounts] });
      }
    },

    async setSelectedAccounts(addresses) {
      const state = get();
      const selectedAddresses = new Set(addresses);
      const addressList = [...selectedAddresses].sort(
        (a, b) =>
          state.queriedAccountsByAddress[a].index! -
          state.queriedAccountsByAddress[b].index!
      );

      if (state.isExistedKeyring) {
        const addressesUnImporeted = addressList.filter(
          (address) => !state.importedAddresses.has(address)
        );
        await wallet.generateAliasCacheForExistedMnemonic(
          state.finalMnemonics,
          addressesUnImporeted
        );
      } else {
        await wallet.generateAliasCacheForFreshMnemonic(
          state.stashKeyringId!,
          addressList.map(
            (address) => state.queriedAccountsByAddress[address].index! - 1
          )
        );
      }

      const confirmingAccounts = await Promise.all(
        addressList.map(async (address) => {
          const account = state.queriedAccountsByAddress[address];
          let alianName = (await wallet.getAlianName(address))!;
          if (!alianName) {
            const draftContactItem = await wallet.getCacheAlias(
              account.address
            );
            alianName = draftContactItem!.name;
          }

          return {
            address: account.address,
            index: account.index!,
            alianName,
          };
        })
      );

      set({ confirmingAccounts, selectedAddresses });
    },

    beforeImportMoreAddresses() {
      set({ draftAddressSelection: new Set(get().selectedAddresses) });
    },

    clearDraftAddresses() {
      set({ draftAddressSelection: new Set() });
    },

    async confirmAllImportingAccountsAsync() {
      const state = get();
      const accountsToImport = state.confirmingAccounts.filter(
        (account) => !state.importedAddresses.has(account.address)
      );

      if (!state.isExistedKeyring) {
        await wallet.requestKeyring(
          KEYRING_TYPE.HdKeyring,
          'activeAccounts',
          state.stashKeyringId ?? null,
          accountsToImport.map((account) => account.index - 1)
        );
        await wallet.addKeyring(state.stashKeyringId!);
      } else {
        await wallet.activeAndPersistAccountsByMnemonics(
          state.finalMnemonics,
          state.passphrase,
          accountsToImport
        );
      }

      if (accountsToImport.length) {
        const { basePublicKey } = await wallet.requestKeyring(
          KEYRING_TYPE.HdKeyring,
          'getInfoByAddress',
          state.stashKeyringId ?? null,
          accountsToImport[0].address
        );
        await wallet.addHDKeyRingLastAddAddrTime(basePublicKey);
      }

      await Promise.all(
        accountsToImport.map((account) =>
          wallet.updateAlianName(
            account.address.toLowerCase(),
            account.alianName || ''
          )
        )
      );
    },
  })
);
