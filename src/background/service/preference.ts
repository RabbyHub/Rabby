import cloneDeep from 'lodash/cloneDeep';
import eventBus from '@/eventBus';
import { createPersistStore, isSameAddress } from 'background/utils';
import {
  keyringService,
  sessionService,
  i18n,
  permissionService,
} from './index';
import { TotalBalanceResponse, TokenItem } from './openapi';
import {
  HARDWARE_KEYRING_TYPES,
  EVENTS,
  CHAINS_ENUM,
  LANGS,
  DARK_MODE_TYPE,
} from 'consts';
import browser from 'webextension-polyfill';
import semver from 'semver-compare';
import { syncStateToUI } from '../utils/broadcastToUI';
import { BROADCAST_TO_UI_EVENTS } from '@/utils/broadcastToUI';
import dayjs from 'dayjs';
import type { IExtractFromPromise } from '@/ui/utils/type';
import { OpenApiService } from '@rabby-wallet/rabby-api';

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
export type CurvePointCollection = IExtractFromPromise<
  ReturnType<OpenApiService['getNetCurve']>
>;
export interface PreferenceStore {
  currentAccount: Account | undefined | null;
  externalLinkAck: boolean;
  hiddenAddresses: Account[];
  balanceMap: {
    [address: string]: TotalBalanceResponse;
  };
  curvePointsMap: {
    [address: string]: CurvePointCollection;
  };
  testnetBalanceMap: {
    [address: string]: TotalBalanceResponse;
  };
  /**
   * @why only mainnet assets would be calculated in Dashboard, we don't need curvePointsMap for testnet
   */
  // testnetCurveDataMap: {
  //   [address: string]: {
  //     curveData: CurvePointCollection;
  //   };
  // };
  /**
   * @deprecated
   */
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
  collectionStarred?: Token[];
  /**
   * auto lock time in minutes
   */
  autoLockTime?: number;
  hiddenBalance?: boolean;
  isShowTestnet?: boolean;
  themeMode?: DARK_MODE_TYPE;
  addressSortStore: AddressSortStore;

  reserveGasOnSendToken?: boolean;
}

export interface AddressSortStore {
  search: string;
  sortType: 'usd' | 'addressType' | 'alphabet';
  lastScrollOffset?: number;
  lastCurrentRecordTime?: number;
}

const defaultAddressSortStore: AddressSortStore = {
  search: '',
  sortType: 'usd',
};

class PreferenceService {
  store!: PreferenceStore;
  popupOpen = false;
  hasOtherProvider = false;
  currentCoboSafeAddress?: Account | null;

  init = async () => {
    const defaultLang = 'en';
    this.store = await createPersistStore<PreferenceStore>({
      name: 'preference',
      template: {
        currentAccount: undefined,
        externalLinkAck: false,
        hiddenAddresses: [],
        balanceMap: {},
        curvePointsMap: {},
        testnetBalanceMap: {},
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
        collectionStarred: [],
        hiddenBalance: false,
        isShowTestnet: false,
        themeMode: DARK_MODE_TYPE.light,
        addressSortStore: {
          ...defaultAddressSortStore,
        },
        reserveGasOnSendToken: true,
      },
    });

    if (
      !this.store.locale ||
      !LANGS.find((item) => item.code === this.store.locale)
    ) {
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
    if (!this.store.testnetBalanceMap) {
      this.store.testnetBalanceMap = {};
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
    if (!this.store.collectionStarred) {
      this.store.collectionStarred = [];
    }
    if (!this.store.autoLockTime) {
      this.store.autoLockTime = 0;
    }
    if (!this.store.hiddenBalance) {
      this.store.hiddenBalance = false;
    }
    if (!this.store.isShowTestnet) {
      this.store.isShowTestnet = false;
    }
    if (!this.store.addressSortStore) {
      this.store.addressSortStore = {
        ...defaultAddressSortStore,
      };
    }
  };

  getPreference = (key?: string) => {
    if (!key || ['search', 'lastCurrent'].includes(key)) {
      this.resetAddressSortStoreExpiredValue();
    }
    if (key === 'isShowTestnet') {
      return true;
    }
    return key ? this.store[key] : { ...this.store, isShowTestnet: true };
  };

  setPreferencePartials = (data: Partial<PreferenceStore>) => {
    Object.keys(data).forEach((k) => {
      if (k in this.store) {
        this.store[k] = data[k];
      } else {
        const err = `Preference key ${k} not found`;
        if (process.env.DEBUG) {
          throw new Error(err);
        } else {
          console.error(err);
        }
      }
    });
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
    return this.store.lastSelectedSwapPayToken?.[key];
  };

  setLastSelectedSwapPayToken = (address: string, token: TokenItem) => {
    const key = address.toLowerCase();
    this.store.lastSelectedSwapPayToken = {
      ...this.store.lastSelectedSwapPayToken,
      [key]: token,
    };
  };

  getLastSelectedGasTopUpChain = (address: string) => {
    const key = address.toLowerCase();
    return this.store.lastSelectedGasTopUpChain?.[key];
  };

  setLastSelectedGasTopUpChain = (address: string, chain: CHAINS_ENUM) => {
    const key = address.toLowerCase();
    this.store.lastSelectedGasTopUpChain = {
      ...this.store.lastSelectedGasTopUpChain,
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
      .filter((lang) => LANGS.find((item) => item.code === lang));
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
      syncStateToUI(BROADCAST_TO_UI_EVENTS.accountsChanged, account);
    }
  };

  setPopupOpen = (isOpen) => {
    this.popupOpen = isOpen;
  };

  getPopupOpen = () => this.popupOpen;

  updateTestnetAddressBalance = (
    address: string,
    data: TotalBalanceResponse
  ) => {
    const testnetBalanceMap = this.store.testnetBalanceMap || {};
    this.store.testnetBalanceMap = {
      ...testnetBalanceMap,
      [address.toLowerCase()]: data,
    };
  };

  removeTestnetAddressBalance = (address: string) => {
    const key = address.toLowerCase();
    if (key in this.store.testnetBalanceMap) {
      const map = this.store.testnetBalanceMap;
      delete map[key];
      this.store.testnetBalanceMap = map;
    }
  };

  removeAddressBalance = (address: string) => {
    const key = address.toLowerCase();
    if (key in this.store.balanceMap) {
      const map = this.store.balanceMap;
      delete map[key];
      this.store.balanceMap = map;
    }
  };

  updateBalanceAboutCache = (
    address: string,
    data: {
      totalBalance?: TotalBalanceResponse;
      curvePoints?: CurvePointCollection;
    }
  ) => {
    const addr = address.toLowerCase();
    if (data.totalBalance) {
      const balanceMap = this.store.balanceMap || {};
      this.store.balanceMap = {
        ...balanceMap,
        [addr]: data.totalBalance,
      };
    }

    if (data.curvePoints) {
      const curvePointsMap = this.store.curvePointsMap || {};
      this.store.curvePointsMap = {
        ...curvePointsMap,
        [addr]: data.curvePoints,
      };
    }
  };

  getBalanceAboutCacheByAddress = (address: string) => {
    const addr = address.toLowerCase();
    const balanceMap = this.store.balanceMap || {};
    const curvePointsMap = this.store.curvePointsMap || {};

    return {
      totalBalance: balanceMap[addr] || null,
      curvePoints: curvePointsMap[addr] || null,
    };
  };

  getBalanceAboutCacheMap = () => {
    return {
      balanceMap: this.store.balanceMap || {},
      curvePointsMap: this.store.curvePointsMap || {},
    };
  };

  removeCurvePoints = (address: string) => {
    const key = address.toLowerCase();
    if (key in this.store.curvePointsMap) {
      const map = this.store.curvePointsMap;
      delete map[key];
      this.store.curvePointsMap = map;
    }
  };

  /** useless now, maybe useful in the future */
  // getTestnetAddressBalance = (address: string): TotalBalanceResponse | null => {
  //   const balanceMap = this.store.testnetBalanceMap || {};
  //   return balanceMap[address.toLowerCase()] || null;
  // };

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

  getThemeMode = () => {
    return this.store.themeMode;
  };

  setThemeMode = (themeMode: DARK_MODE_TYPE) => {
    this.store.themeMode = themeMode;
  };

  isReserveGasOnSendToken = () => {
    return this.store.reserveGasOnSendToken;
  };

  getHighlightedAddresses = () => {
    return (this.store.highligtedAddresses || []).filter(
      (item) => !!item.brandName && !!item.address
    );
  };
  updateHighlightedAddresses = (list: IHighlightedAddress[]) => {
    this.store.highligtedAddresses = list;
  };

  removeHighlightedAddress = (item: IHighlightedAddress) => {
    this.store.highligtedAddresses = this.store.highligtedAddresses.filter(
      (highlighted) =>
        !(
          isSameAddress(highlighted.address, item.address) &&
          highlighted.brandName === item.brandName
        )
    );
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
  hasCustomizedToken = (token: Token) => {
    return !!this.store.customizedToken?.find(
      (item) =>
        isSameAddress(item.address, token.address) && item.chain === token.chain
    );
  };
  addCustomizedToken = (token: Token) => {
    if (this.hasCustomizedToken(token)) {
      throw new Error('Token already added');
    }

    this.store.customizedToken = [...(this.store.customizedToken || []), token];
  };
  removeCustomizedToken = (token: Token) => {
    this.store.customizedToken = this.store.customizedToken?.filter(
      (item) =>
        !(
          isSameAddress(item.address, token.address) &&
          item.chain === token.chain
        )
    );
  };
  getBlockedToken = () => {
    return this.store.blockedToken || [];
  };
  addBlockedToken = (token: Token) => {
    if (
      !this.store.blockedToken?.find(
        (item) =>
          isSameAddress(item.address, token.address) &&
          item.chain === token.chain
      )
    ) {
      this.store.blockedToken = [...(this.store.blockedToken || []), token];
    }
  };
  removeBlockedToken = (token: Token) => {
    this.store.blockedToken = this.store.blockedToken?.filter(
      (item) =>
        !(
          isSameAddress(item.address, token.address) &&
          item.chain === token.chain
        )
    );
  };
  getCollectionStarred = () => {
    return this.store.collectionStarred || [];
  };
  addCollectionStarred = (token: Token) => {
    if (
      !this.store.collectionStarred?.find(
        (item) =>
          isSameAddress(item.address, token.address) &&
          item.chain === token.chain
      )
    ) {
      this.store.collectionStarred = [
        ...(this.store.collectionStarred || []),
        token,
      ];
    }
  };
  removeCollectionStarred = (token: Token) => {
    this.store.collectionStarred = this.store.collectionStarred?.filter(
      (item) =>
        !(
          isSameAddress(item.address, token.address) &&
          item.chain === token.chain
        )
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

  setAutoLockTime = (time: number) => {
    this.store.autoLockTime = time;
  };
  setHiddenBalance = (value: boolean) => {
    this.store.hiddenBalance = value;
  };
  getIsShowTestnet = () => {
    // return this.store.isShowTestnet;
    return true;
  };
  setIsShowTestnet = (value: boolean) => {
    this.store.isShowTestnet = value;
  };
  saveCurrentCoboSafeAddress = async () => {
    this.currentCoboSafeAddress = await this.getCurrentAccount();
  };
  resetCurrentCoboSafeAddress = async () => {
    this.setCurrentAccount(this.currentCoboSafeAddress ?? null);
  };

  resetAddressSortStoreExpiredValue = () => {
    if (
      !this.store.addressSortStore.lastCurrentRecordTime ||
      (this.store.addressSortStore.lastCurrentRecordTime &&
        dayjs().isAfter(
          dayjs
            .unix(this.store.addressSortStore.lastCurrentRecordTime)
            .add(15, 'minute')
        ))
    ) {
      this.store.addressSortStore = {
        ...this.store.addressSortStore,
        search: '',
        lastScrollOffset: undefined,
        lastCurrentRecordTime: undefined,
      };
    }
  };

  getAddressSortStoreValue = (key: keyof AddressSortStore) => {
    if (['search', 'lastScrollOffset'].includes(key)) {
      this.resetAddressSortStoreExpiredValue();
    }
    return this.store.addressSortStore[key];
  };

  setAddressSortStoreValue = <K extends keyof AddressSortStore>(
    key: K,
    value: AddressSortStore[K]
  ) => {
    if (['search', 'lastCurrent'].includes(key)) {
      this.store.addressSortStore = {
        ...this.store.addressSortStore,
        lastCurrentRecordTime: dayjs().unix(),
      };
    }
    this.store.addressSortStore = {
      ...this.store.addressSortStore,
      [key]: value,
    };
  };
}

export default new PreferenceService();
