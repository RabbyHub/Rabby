import { createModel } from '@rematch/core';

import { BRAND_ALIAN_TYPE_TEXT, KEYRING_TYPE } from '@/constant';
import { RootModel } from '.';
import type { Account } from 'background/service/preference';
import { makeAlianName } from '../utils/account';

interface IState {
  mnemonicsCounter: number;
  queriedAccounts: Record<Exclude<Account['index'], undefined>, Account>;

  stashKeyringId: number | null;
  importingAccounts: Account[];
  importedAddresses: Set<Account['address']>;
  selectedAddressesIndexes: Set<Exclude<Account['index'], void>>;
  draftIndexes: Set<Exclude<Account['index'], void>>;
}

const makeInitValues = () => {
  return {
    mnemonicsCounter: -1,
    queriedAccounts: {},

    stashKeyringId: null,
    importingAccounts: [],
    importedAddresses: new Set(),
    selectedAddressesIndexes: new Set(),
    draftIndexes: new Set(),
  } as IState;
}

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
    return {};
  },

  effects: (dispatch) => ({
    switchKeyring (payload: { stashKeyringId: IState['stashKeyringId'] }) {
      const initValues = makeInitValues();

      dispatch.importMnemonics.setField({
        importingAccounts: initValues.importingAccounts,
        importedAddresses: initValues.importedAddresses,
        draftIndexes: initValues.draftIndexes,
        stashKeyringId: payload.stashKeyringId,
      })
    },

    async getMnemonicsCounterAsync(_?, store?) {
      const typedAccounts = await store.app.wallet.getAllClassAccounts();
      const len = typedAccounts.filter(
        (list) => list.keyring.type === KEYRING_TYPE.HdKeyring
      ).length;

      dispatch.importMnemonics.setField({ mnemonicsCounter: len });
    },

    async getImportedAccountsAsync(
      payload: { keyringId: number | null },
      store?
    ) {
      const importedAccounts = await store.app.wallet.requestKeyring<
        Account['address'][]
      >(KEYRING_TYPE.HdKeyring, 'getAccounts', payload.keyringId);

      dispatch.importMnemonics.setField({
        importedAddresses: new Set(
          importedAccounts.map((address) => address.toLowerCase())
        ),
      });
    },

    async cleanUpImportedInfoAsync(
      payload: { keyringId: number | null },
      store
    ) {
      store.app.wallet.requestKeyring(
        KEYRING_TYPE.HdKeyring,
        'cleanUp',
        payload.keyringId ?? null
      );
    },

    putQuriedAccountsByIndex(payload: { accounts: Account[] }, store) {
      const queriedAccounts = store.importMnemonics.queriedAccounts;

      payload.accounts.forEach((account) => {
        if (account.index) queriedAccounts[account.index] = account;
      });

      dispatch.importMnemonics.setField({
        queriedAccounts: Object.assign({}, queriedAccounts),
      });
    },

    async setImportingAccountAlianNameByIndex(
      payload: { index: Account['index']; alianName: string },
      store
    ) {
      const importingAccounts = store.importMnemonics.importingAccounts;
      const accountIndex = importingAccounts.findIndex(
        (item) => item.index === payload.index
      );
      const account = importingAccounts[accountIndex];

      if (account) {
        account.alianName = payload.alianName;
        dispatch.importMnemonics.setField({
          importingAccounts: [...importingAccounts],
        });
      }
    },

    setSelectedIndexes(
      payload: { indexes: Exclude<Account['index'], void>[] },
      store
    ) {
      const selectedAddressesIndexes = new Set(payload.indexes);

      const keyringCount = Math.max(
        store.importMnemonics.mnemonicsCounter + 1,
        1
      );

      const importedAddresses = store.importMnemonics.importedAddresses;
      const queriedAccounts = store.importMnemonics.queriedAccounts;

      const importingAccounts = [...selectedAddressesIndexes].map(
        (index, idx) => {
          const account = queriedAccounts[index];
          const alianName =
            // TODO: to see if account has original alianName
            account.alianName ||
            makeAlianName({
              brandName: `${BRAND_ALIAN_TYPE_TEXT[KEYRING_TYPE.HdKeyring]}`,
              keyringCount,
              keyringIndex: importedAddresses.size + idx,
            });

          return {
            ...account,
            alianName,
          };
        }
      );

      dispatch.importMnemonics.setField({
        importingAccounts,
        selectedAddressesIndexes,
      });
    },

    beforeImportMoreAddresses(_?, store?) {
      const selectedAddressesIndexes = store.importMnemonics.selectedAddressesIndexes;
      dispatch.importMnemonics.setField({
        draftIndexes: new Set([...selectedAddressesIndexes]),
      })
    },

    clearDraftIndexes () {
      dispatch.importMnemonics.setField({
        draftIndexes: new Set(),
      })
    },

    async confirmAllImportingAccountsAsync(_?, store?) {
      const importingAccounts = store.importMnemonics.importingAccounts;
      await Promise.all(
        importingAccounts.map((account) => {
          return store.app.wallet.updateAlianName(
            account.address?.toLowerCase(),
            account.alianName
          );
        })
      );
    },
  }),
});
