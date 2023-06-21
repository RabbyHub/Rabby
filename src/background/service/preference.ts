import cloneDeep from 'lodash/cloneDeep';
import eventBus from '@/eventBus';
import { createPersistStore } from 'background/utils';
import {
  keyringService,
  sessionService,
  i18n,
  permissionService,
} from './index';
import { TotalBalanceResponse, TokenItem } from './openapi';
import { HARDWARE_KEYRING_TYPES, EVENTS, CHAINS_ENUM } from 'consts';
import { browser } from 'webextension-polyfill-ts';
import semver from 'semver-compare';

const version = process.env.release || '0';

export interface Account {
  type: string;
  address: string;
  brandName: string;
  alianName?: string;
  displayBrandName?: string;
  index?: number;
  balance?: number;
}

export interface ChainGas {
  gasPrice?: number | null; // custom cached gas price
  gasLevel?: string | null; // cached gasLevel
  lastTimeSelect?: 'gasLevel' | 'gasPrice'; // last time selection, 'gasLevel' | 'gasPrice'
  expireAt?: number;
}

export interface GasCache {
  [chainId: string | number]: ChainGas;
}

export interface addedToken {
  [address: string]: string[];
}

export interface Token {
  address: string;
  chain: string;
}

export type IHighlightedAddress = {
  brandName: Account['brandName'];
  address: Account['address'];
};
export interface PreferenceStore {
  currentAccount: Account | undefined | null;
  externalLinkAck: boolean;
  hiddenAddresses: Account[];
  balanceMap: {
    [address: string]: TotalBalanceResponse;
  };
  useLedgerLive: boolean;
  locale: string;
  watchAddressPreference: Record<string, number>;
  isDefaultWallet: boolean;
  lastTimeSendToken: Record<string, TokenItem>;
  highligtedAddresses: IHighlightedAddress[];
  walletSavedList: any[];
  alianNames?: Record<string, string>;
  initAlianNames: boolean;
  gasCache: GasCache;
  currentVersion: string;
  firstOpen: boolean;
  pinnedChain: string[];
  /**
   * @deprecated
   */
  addedToken: addedToken;
  tokenApprovalChain: Record<string, CHAINS_ENUM>;
  nftApprovalChain: Record<string, CHAINS_ENUM>;
  sendLogTime?: number;
  needSwitchWalletCheck?: boolean;
  lastSelectedSwapPayToken?: Record<string, TokenItem>;
  lastSelectedGasTopUpChain?: Record<string, CHAINS_ENUM>;
  sendEnableTime?: number;
  customizedToken?: Token[];
  blockedToken?: Token[];
}

const SUPPORT_LOCALES = ['en'];

class PreferenceService {
  store!: PreferenceStore;
  popupOpen = false;
  hasOtherProvider = false;

  init = async () => {
    const defaultLang = 'en';
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
        isDefaultWallet: false,
        lastTimeSendToken: {},
        highligtedAddresses: [],
        walletSavedList: [],
        alianNames: {},
        initAlianNames: false,
        gasCache: {},
        currentVersion: '0',
        firstOpen: false,
        pinnedChain: [],
        addedToken: {},
        tokenApprovalChain: {},
        nftApprovalChain: {},
        sendLogTime: 0,
        needSwitchWalletCheck: true,
        sendEnableTime: 0,
        customizedToken: [],
        blockedToken: [],
      },
    });
    if (!this.store.locale || this.store.locale !== defaultLang) {
      this.store.locale = defaultLang;
    }
    i18n.changeLanguage(this.store.locale);
    if (
      this.store.isDefaultWallet === undefined ||
      this.store.isDefaultWallet === null
    ) {
      this.store.isDefaultWallet = false;
    }
    if (!this.store.lastTimeSendToken) {
      this.store.lastTimeSendToken = {};
    }
    if (!this.store.initAlianNames) {
      this.store.initAlianNames = false;
    }
    if (!this.store.gasCache) {
      this.store.gasCache = {};
    }
    if (!this.store.pinnedChain) {
      this.store.pinnedChain = [];
    }
    if (!this.store.addedToken) {
      this.store.addedToken = {};
    }
    if (!this.store.externalLinkAck) {
      this.store.externalLinkAck = false;
    }
    if (!this.store.hiddenAddresses) {
      this.store.hiddenAddresses = [];
    }
    if (!this.store.balanceMap) {
      this.store.balanceMap = {};
    }
    if (!this.store.useLedgerLive) {
      this.store.useLedgerLive = false;
    }
    if (!this.store.highligtedAddresses) {
      this.store.highligtedAddresses = [];
    }
    if (!this.store.walletSavedList) {
      this.store.walletSavedList = [];
    }
    if (!this.store.tokenApprovalChain) {
      this.store.tokenApprovalChain = {};
    }
    if (!this.store.nftApprovalChain) {
      this.store.nftApprovalChain = {};
    }
    if (!this.store.sendLogTime) {
      this.store.sendLogTime = 0;
    }
    if (this.store.needSwitchWalletCheck == null) {
      this.store.needSwitchWalletCheck = true;
    }
    if (!this.store.sendEnableTime) {
      this.store.sendEnableTime = 0;
    }
    if (!this.store.customizedToken) {
      this.store.customizedToken = [];
    }
    if (!this.store.blockedToken) {
      this.store.blockedToken = [];
    }
  };

  getPreference = (key?: string) => {
    return key ? this.store[key] : this.store;
  };

  getTokenApprovalChain = (address: string) => {
    const key = address.toLowerCase();
    return this.store.tokenApprovalChain[key] || CHAINS_ENUM.ETH;
  };

  setTokenApprovalChain = (address: string, chain: CHAINS_ENUM) => {
    const key = address.toLowerCase();
    this.store.tokenApprovalChain = {
      ...this.store.tokenApprovalChain,
      [key]: chain,
    };
  };

  getNFTApprovalChain = (address: string) => {
    const key = address.toLowerCase();
    return this.store.nftApprovalChain[key] || CHAINS_ENUM.ETH;
  };

  setNFTApprovalChain = (address: string, chain: CHAINS_ENUM) => {
    const key = address.toLowerCase();
    this.store.nftApprovalChain = {
      ...this.store.nftApprovalChain,
      [key]: chain,
    };
  };

  getLastTimeSendToken = (address: string) => {
    const key = address.toLowerCase();
    return this.store.lastTimeSendToken[key];
  };

  setLastTimeSendToken = (address: string, token: TokenItem) => {
    const key = address.toLowerCase();
    this.store.lastTimeSendToken = {
      ...this.store.lastTimeSendToken,
      [key]: token,
    };
  };

  getLastSelectedSwapPayToken = (address: string) => {
    const key = address.toLowerCase();
    return this.store?.lastSelectedSwapPayToken?.[key];
  };

  setLastSelectedSwapPayToken = (address: string, token: TokenItem) => {
    const key = address.toLowerCase();
    this.store.lastSelectedSwapPayToken = {
      ...this.store?.lastSelectedSwapPayToken,
      [key]: token,
    };
  };

  getLastSelectedGasTopUpChain = (address: string) => {
    const key = address.toLowerCase();
    return this.store?.lastSelectedGasTopUpChain?.[key];
  };

  setLastSelectedGasTopUpChain = (address: string, chain: CHAINS_ENUM) => {
    const key = address.toLowerCase();
    this.store.lastSelectedGasTopUpChain = {
      ...this.store?.lastSelectedGasTopUpChain,
      [key]: chain,
    };
  };

  setIsDefaultWallet = (val: boolean) => {
    this.store.isDefaultWallet = val;
    // todo: check if this is needed
    eventBus.emit(EVENTS.broadcastToUI, {
      method: 'isDefaultWalletChanged',
      params: val,
    });
  };

  getIsDefaultWallet = (origin?: string) => {
    if (origin && permissionService.getSite(origin)?.preferMetamask) {
      return false;
    }
    return this.store.isDefaultWallet;
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

  /**
   * @deprecated
   */
  getHiddenAddresses = (): Account[] => {
    return [];
    // return cloneDeep(this.store.hiddenAddresses);
  };

  hideAddress = (type: string, address: string, brandName: string) => {
    this.store.hiddenAddresses = [
      ...this.store.hiddenAddresses,
      {
        type,
        address,
        brandName,
      },
    ];
    if (
      type === this.store.currentAccount?.type &&
      address === this.store.currentAccount.address &&
      brandName === this.store.currentAccount.brandName
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
    const account = cloneDeep(this.store.currentAccount);
    if (!account) return account;
    return {
      ...account,
      address: account.address.toLowerCase(),
    };
  };

  setCurrentAccount = (account: Account | null) => {
    this.store.currentAccount = account;
    if (account) {
      sessionService.broadcastEvent('accountsChanged', [
        account.address.toLowerCase(),
      ]);
      eventBus.emit(EVENTS.broadcastToUI, {
        method: 'accountsChanged',
        params: account,
      });
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

  getHighlightedAddresses = () => {
    return (this.store.highligtedAddresses || []).filter(
      (item) => !!item.brandName && !!item.address
    );
  };
  updateHighlightedAddresses = (list: IHighlightedAddress[]) => {
    this.store.highligtedAddresses = list;
  };

  getWalletSavedList = () => {
    return this.store.walletSavedList || [];
  };
  updateWalletSavedList = (list: any[]) => {
    this.store.walletSavedList = list;
  };

  getInitAlianNameStatus = () => {
    return this.store.initAlianNames;
  };
  changeInitAlianNameStatus = () => {
    this.store.initAlianNames = true;
  };
  getLastTimeGasSelection = (chainId: keyof GasCache): ChainGas | null => {
    const cache = this.store.gasCache[chainId];
    if (cache && cache.lastTimeSelect === 'gasPrice') {
      if (Date.now() <= (cache.expireAt || 0)) {
        return cache;
      } else if (cache.gasLevel) {
        return {
          lastTimeSelect: 'gasLevel',
          gasLevel: cache.gasLevel,
        };
      } else {
        return null;
      }
    } else {
      return cache;
    }
  };

  updateLastTimeGasSelection = (chainId: keyof GasCache, gas: ChainGas) => {
    if (gas.lastTimeSelect === 'gasPrice') {
      this.store.gasCache = {
        ...this.store.gasCache,
        [chainId]: {
          ...this.store.gasCache[chainId],
          ...gas,
          expireAt: Date.now() + 3600000, // custom gasPrice will expire at 1h later
        },
      };
    } else {
      this.store.gasCache = {
        ...this.store.gasCache,
        [chainId]: {
          ...this.store.gasCache[chainId],
          ...gas,
        },
      };
    }
  };
  getIsFirstOpen = () => {
    if (
      !this.store.currentVersion ||
      semver(version, this.store.currentVersion) > 0
    ) {
      this.store.currentVersion = version;
      this.store.firstOpen = true;
    }
    return this.store.firstOpen;
  };
  updateIsFirstOpen = () => {
    this.store.firstOpen = false;
  };
  getSavedChains = () => {
    return this.store.pinnedChain;
  };
  saveChain = (name: string) => {
    this.store.pinnedChain = [...this.store.pinnedChain, name];
  };
  updateChain = (list: string[]) => (this.store.pinnedChain = list);
  /**
   * @deprecated
   */
  getAddedToken = (address: string) => {
    const key = address.toLowerCase();
    return this.store.addedToken[key] || [];
  };
  /**
   * @deprecated
   */
  updateAddedToken = (address: string, tokenList: string[]) => {
    const key = address.toLowerCase();
    this.store.addedToken[key] = tokenList;
  };
  getCustomizedToken = () => {
    return this.store.customizedToken || [];
  };
  addCustomizedToken = (token: Token) => {
    if (
      !this.store.customizedToken?.find(
        (item) => item.address === token.address && item.chain === token.chain
      )
    ) {
      this.store.customizedToken = [
        ...(this.store.customizedToken || []),
        token,
      ];
    }
  };
  removeCustomizedToken = (token: Token) => {
    this.store.customizedToken = this.store.customizedToken?.filter(
      (item) => !(item.address === token.address && item.chain === token.chain)
    );
  };
  getBlockedToken = () => {
    return this.store.blockedToken || [];
  };
  addBlockedToken = (token: Token) => {
    if (
      !this.store.blockedToken?.find(
        (item) => item.address === token.address && item.chain === token.chain
      )
    ) {
      this.store.blockedToken = [...(this.store.blockedToken || []), token];
    }
  };
  removeBlockedToken = (token: Token) => {
    this.store.blockedToken = this.store.blockedToken?.filter(
      (item) => !(item.address === token.address && item.chain === token.chain)
    );
  };

  getSendLogTime = () => {
    return this.store.sendLogTime || 0;
  };
  updateSendLogTime = (time: number) => {
    this.store.sendLogTime = time;
  };
  getSendEnableTime = () => {
    return this.store.sendEnableTime || 0;
  };
  updateSendEnableTime = (time: number) => {
    this.store.sendEnableTime = time;
  };
  getNeedSwitchWalletCheck = () => {
    if (this.store.needSwitchWalletCheck == null) {
      return true;
    }
    return this.store.needSwitchWalletCheck;
  };
  updateNeedSwitchWalletCheck = (value: boolean) => {
    this.store.needSwitchWalletCheck = value;
  };
}

export default new PreferenceService();
