import cloneDeep from 'lodash/cloneDeep';
import { createPersistStore } from 'background/utils';
import { keyringService, sessionService } from './index';
import { TotalBalanceResponse } from './openapi';
import { HARDWARE_KEYRING_TYPES } from 'consts';

export interface Account {
  type: string;
  address: string;
}

interface PreferenceStore {
  currentAccount: Account | undefined;
  popupOpen: boolean;
  hiddenAddresses: Account[];
  balanceMap: {
    [address: string]: TotalBalanceResponse;
  };
  useLedgerLive: boolean;
}

class PreferenceService {
  store!: PreferenceStore;

  init = async () => {
    this.store = await createPersistStore<PreferenceStore>({
      name: 'preference',
      template: {
        currentAccount: undefined,
        popupOpen: false,
        hiddenAddresses: [],
        balanceMap: {},
        useLedgerLive: false,
      },
    });
  };

  getHiddenAddresses = () => {
    return cloneDeep(this.store.hiddenAddresses);
  };

  hideAddress = (type: string, address: string) => {
    this.store.hiddenAddresses = [
      ...this.store.hiddenAddresses,
      {
        type,
        address,
      },
    ];
    if (
      type === this.store.currentAccount?.type &&
      address === this.store.currentAccount.address
    ) {
      this.resetCurrentAccount();
    }
  };

  /**
   * If current account be hidden or deleted
   * call this function to reset current account
   * to the first address in address list
   */
  resetCurrentAccount = async () => {
    const [account] = await keyringService.getAllVisibleAccountsArray();
    this.setCurrentAccount(account);
  };

  showAddress = (type: string, address: string) => {
    this.store.hiddenAddresses = this.store.hiddenAddresses.filter((item) => {
      return item.type !== type || item.address !== address;
    });
  };

  getCurrentAccount = (): Account | undefined => {
    return cloneDeep(this.store.currentAccount);
  };

  setCurrentAccount = (account: Account) => {
    this.store.currentAccount = account;
    sessionService.broadcastEvent('accountsChanged', [account.address]);
  };

  setPopupOpen = (isOpen) => {
    this.store.popupOpen = isOpen;
  };

  updateAddressBalance = (address, data: TotalBalanceResponse) => {
    const balanceMap = this.store.balanceMap || {};
    this.store.balanceMap = {
      ...balanceMap,
      [address]: data,
    };
  };

  getAddressBalance = (address: string): TotalBalanceResponse | null => {
    const balanceMap = this.store.balanceMap || {};
    return balanceMap[address] || null;
  };

  updateUseLedgerLive = async (value: boolean) => {
    this.store.useLedgerLive = value;
    const keyrings = keyringService.getKeyringsByType(
      HARDWARE_KEYRING_TYPES.Ledger.type
    );
    await Promise.all(
      keyrings.map(async (keyring) => {
        await keyring.updateTransportMethod(value);
        keyring.restart();
      })
    );
  };

  isUseLedgerLive = () => {
    return this.store.useLedgerLive;
  };
}

export default new PreferenceService();
