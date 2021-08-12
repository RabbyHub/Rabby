import cloneDeep from 'lodash/cloneDeep';
import { createPersistStore } from 'background/utils';
import { keyringService, sessionService, i18n } from './index';
import { TotalBalanceResponse } from './openapi';
import { HARDWARE_KEYRING_TYPES } from 'consts';
import { browser } from 'webextension-polyfill-ts';

export interface Account {
  type: string;
  address: string;
}

interface PreferenceStore {
  currentAccount: Account | undefined | null;
  externalLinkAck: boolean;
  hiddenAddresses: Account[];
  balanceMap: {
    [address: string]: TotalBalanceResponse;
  };
  useLedgerLive: boolean;
  locale: string;
  watchAddressPreference: Record<string, number>;
}

const SUPPORT_LOCALES = ['en', 'zh_CN'];

class PreferenceService {
  store!: PreferenceStore;
  popupOpen = false;
  hasOtherProvider = false;

  init = async () => {
    let defaultLang = 'en';
    const acceptLangs = await this.getAcceptLanguages();
    if (acceptLangs.length > 0) {
      defaultLang = acceptLangs[0];
    }
    this.store = await createPersistStore<PreferenceStore>({
      name: 'preference',
      template: {
        currentAccount: undefined,
        externalLinkAck: false,
        hiddenAddresses: [],
        balanceMap: {},
        useLedgerLive: false,
        locale: defaultLang,
        watchAddressPreference: {},
      },
    });
    if (!this.store.locale) {
      this.store.locale = defaultLang;
    }
    i18n.changeLanguage(this.store.locale);
  };

  getHasOtherProvider = () => {
    return this.hasOtherProvider;
  };

  setHasOtherProvider = (val: boolean) => {
    this.hasOtherProvider = val;
  };

  getAcceptLanguages = async () => {
    let langs = await browser.i18n.getAcceptLanguages();
    if (!langs) langs = [];
    return langs
      .map((lang) => lang.replace(/-/g, '_'))
      .filter((lang) => SUPPORT_LOCALES.includes(lang));
  };

  getHiddenAddresses = (): Account[] => {
    return cloneDeep(this.store.hiddenAddresses);
  };

  getWatchAddressPreference = (address: string) => {
    const key = address.toLowerCase();
    if (
      !this.store.watchAddressPreference ||
      !this.store.watchAddressPreference[key]
    )
      return null;

    return this.store.watchAddressPreference[key];
  };

  setWatchAddressPreference = (address: string, id: number) => {
    if (!this.store.watchAddressPreference) {
      this.store.watchAddressPreference = {};
    }
    this.store.watchAddressPreference = {
      ...this.store.watchAddressPreference,
      [address.toLowerCase()]: id,
    };
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

  getCurrentAccount = (): Account | undefined | null => {
    return cloneDeep(this.store.currentAccount);
  };

  setCurrentAccount = (account: Account | null) => {
    this.store.currentAccount = account;
    if (account) {
      sessionService.broadcastEvent('accountsChanged', [account.address]);
    }
  };

  setPopupOpen = (isOpen) => {
    this.popupOpen = isOpen;
  };

  getPopupOpen = () => this.popupOpen;

  updateAddressBalance = (address: string, data: TotalBalanceResponse) => {
    const balanceMap = this.store.balanceMap || {};
    this.store.balanceMap = {
      ...balanceMap,
      [address.toLowerCase()]: data,
    };
  };

  removeAddressBalance = (address: string) => {
    const key = address.toLowerCase();
    if (key in this.store.balanceMap) {
      const map = this.store.balanceMap;
      delete map[key];
      this.store.balanceMap = map;
    }
  };

  getAddressBalance = (address: string): TotalBalanceResponse | null => {
    const balanceMap = this.store.balanceMap || {};
    return balanceMap[address.toLowerCase()] || null;
  };

  getExternalLinkAck = (): boolean => {
    return this.store.externalLinkAck;
  };

  setExternalLinkAck = (ack = false) => {
    this.store.externalLinkAck = ack;
  };

  getLocale = () => {
    return this.store.locale;
  };

  setLocale = (locale: string) => {
    this.store.locale = locale;
    i18n.changeLanguage(locale);
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
