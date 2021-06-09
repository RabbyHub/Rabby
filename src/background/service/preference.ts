import cloneDeep from 'lodash/cloneDeep';
import { createPersistStore } from 'background/utils';
import { keyringService, sessionService } from './index';
import { TotalBalanceResponse } from './openapi';

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
}

export default new PreferenceService();
