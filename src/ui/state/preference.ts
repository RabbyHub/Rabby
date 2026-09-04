import { create } from 'zustand';

import type { TokenItem } from '@/background/service/openapi';
import type {
  AddressSortStore,
  GasCache,
  addedToken,
  UnlockPreferredMethod,
} from '@/background/service/preference';
import { CHAINS_ENUM, DARK_MODE_TYPE } from '@/constant';
import { changeLanguage } from '@/i18n';
import { wallet } from '@/ui/wallet';
import { ga4 } from '@/utils/ga4';
import {
  getDefaultRateGuideLastExposure,
  LAST_EXPOSURE_VERSIONED_KEY,
  RateGuideLastExposure,
  userCouldRated,
} from '@/utils/rateGuidance';

export interface PreferenceState {
  externalLinkAck: boolean;
  useLedgerLive: boolean;
  locale: string;
  isDefaultWallet: boolean;
  lastTimeSendToken: Record<string, TokenItem>;
  walletSavedList: [];
  gasCache: GasCache;
  currentVersion: string;
  firstOpen: boolean;
  pinnedChain: string[];
  addedToken: addedToken;
  tokenApprovalChain: Record<string, CHAINS_ENUM>;
  nftApprovalChain: Record<string, CHAINS_ENUM>;
  autoLockTime: number;
  hiddenBalance: boolean;
  isShowTestnet: boolean;
  userDataTrackingOptOut: boolean;
  addressSortStore: AddressSortStore;
  themeMode: DARK_MODE_TYPE;
  reserveGasOnSendToken: boolean;
  isHideEcologyNoticeDict: Record<string | number, boolean>;
  isEnabledPwdForNonWhitelistedTx?: boolean;
  isEnabledDappAccount?: boolean;
  biometricUnlockEnabled?: boolean;
  biometricUnlockCredentialId?: string;
  biometricUnlockEncryptedPassword?: string;
  biometricUnlockIv?: string;
  unlockPreferredMethod?: UnlockPreferredMethod;
  rateGuideLastExposure?: RateGuideLastExposure;
  dashboardPanelOrder?: string[];

  /** @deprecated */
  desktopTokensAllMode?: boolean;
}

type PreferenceValue<
  Key extends keyof PreferenceState | undefined
> = Key extends keyof PreferenceState ? PreferenceState[Key] : PreferenceState;

export type PreferenceActions = {
  setField: (payload: Partial<PreferenceState>) => void;
  init: () => Promise<PreferenceState>;
  getPreference: <Key extends keyof PreferenceState | undefined = undefined>(
    key?: Key
  ) => Promise<PreferenceValue<Key>>;
  getPreferenceValue: <Key extends keyof PreferenceState>(options: {
    key: Key;
    updateLocalStore?: boolean;
  }) => Promise<PreferenceState[Key]>;
  getIsDefaultWallet: () => Promise<void>;
  setIsDefaultWallet: (isDefault: boolean) => Promise<void>;
  getTokenApprovalChain: (address: string) => Promise<void>;
  setTokenApprovalChain: (payload: {
    address: string;
    chain: CHAINS_ENUM;
  }) => Promise<void>;
  setNFTApprovalChain: (payload: {
    address: string;
    chain: CHAINS_ENUM;
  }) => Promise<void>;
  addPinnedChain: (chain: CHAINS_ENUM) => Promise<void>;
  removePinnedChain: (chain: CHAINS_ENUM) => Promise<void>;
  updatePinnedChainList: (chains: CHAINS_ENUM[]) => Promise<void>;
  setAutoLockTime: (time: number) => Promise<void>;
  setIsHideEcologyNoticeDict: (
    patch: Record<string | number, boolean>
  ) => Promise<void>;
  setHiddenBalance: (hidden: boolean) => Promise<void>;
  setIsShowTestnet: (value: boolean) => Promise<void>;
  setUserDataTrackingOptOut: (value: boolean) => Promise<void>;
  setDesktopTokensAllMode: (value: boolean) => Promise<void>;
  switchLocale: (locale: string) => Promise<void>;
  switchThemeMode: (themeMode: DARK_MODE_TYPE) => Promise<void>;
  setIsReserveGasOnSendToken: (value: boolean) => Promise<void>;
  getAddressSortStoreValue: <Key extends keyof AddressSortStore>(
    key: Key
  ) => Promise<AddressSortStore[Key]>;
  setAddressSortStoreValue: <Key extends keyof AddressSortStore>(payload: {
    key: Key;
    value: AddressSortStore[Key];
  }) => Promise<void>;
  enablePwdForNonWhitelistedTx: (value: boolean) => Promise<void>;
  enableDappAccount: (value: boolean) => Promise<void>;
  setBiometricUnlock: (payload: {
    enabled: boolean;
    credentialId?: string;
    encryptedPassword?: string;
    iv?: string;
  }) => Promise<void>;
  setUnlockPreferredMethod: (method: UnlockPreferredMethod) => Promise<void>;
  setRateGuideLastExposure: (
    lastExposure: Partial<RateGuideLastExposure>
  ) => Promise<void>;
};

export type PreferenceStore = PreferenceState & PreferenceActions;

export const getDefaultPreferenceState = (): PreferenceState => ({
  externalLinkAck: false,
  useLedgerLive: false,
  locale: 'en',
  isDefaultWallet: true,
  lastTimeSendToken: {},
  walletSavedList: [],
  gasCache: {},
  currentVersion: '0',
  firstOpen: false,
  pinnedChain: [],
  addedToken: {},
  tokenApprovalChain: {},
  nftApprovalChain: {},
  autoLockTime: 0,
  hiddenBalance: false,
  isShowTestnet: false,
  userDataTrackingOptOut: true,
  addressSortStore: {} as AddressSortStore,
  themeMode: DARK_MODE_TYPE.system,
  reserveGasOnSendToken: false,
  isHideEcologyNoticeDict: {},
  isEnabledPwdForNonWhitelistedTx: false,
  isEnabledDappAccount: false,
  biometricUnlockEnabled: false,
  biometricUnlockCredentialId: '',
  biometricUnlockEncryptedPassword: '',
  biometricUnlockIv: '',
  unlockPreferredMethod: 'biometric',
  rateGuideLastExposure: getDefaultRateGuideLastExposure(),
  desktopTokensAllMode: false,
  dashboardPanelOrder: [],
});

export const selectIsReserveGasOnSendToken = (state: PreferenceState) =>
  state.reserveGasOnSendToken;

export const selectRateGuideLastExposureTimestamp = (state: PreferenceState) =>
  state.rateGuideLastExposure?.[LAST_EXPOSURE_VERSIONED_KEY]?.time;

export const selectUserViewedRate = (state: PreferenceState) =>
  userCouldRated(state.rateGuideLastExposure);

export const usePreferenceStore = create<PreferenceStore>()((set, get) => ({
  ...getDefaultPreferenceState(),

  setField(payload) {
    set(payload);
  },
  async init() {
    return get().getPreference();
  },
  async getPreference<
    Key extends keyof PreferenceState | undefined = undefined
  >(key?: Key) {
    const value = await wallet.getPreference(key);
    if (key) {
      set({ [key]: value });
    } else {
      set(value as PreferenceState);
    }
    return value as PreferenceValue<Key>;
  },
  async getPreferenceValue<Key extends keyof PreferenceState>({
    key,
    updateLocalStore = false,
  }: {
    key: Key;
    updateLocalStore?: boolean;
  }) {
    const value = (await wallet.getPreference(key)) as PreferenceState[Key];
    if (updateLocalStore) {
      set({ [key]: value });
    }
    return value;
  },
  async getIsDefaultWallet() {
    const isDefaultWallet = await wallet.isDefaultWallet();
    set({ isDefaultWallet });
  },
  async setIsDefaultWallet(isDefault) {
    await wallet.setIsDefaultWallet(isDefault);
    void get().getIsDefaultWallet();
  },
  async getTokenApprovalChain(rawAddress) {
    const address = rawAddress.toLowerCase();
    const chain = await wallet.getTokenApprovalChain(address);
    set((state) => ({
      tokenApprovalChain: {
        ...state.tokenApprovalChain,
        [address]: chain,
      },
    }));
  },
  async setTokenApprovalChain({ address, chain }) {
    await wallet.setTokenApprovalChain(address, chain);
    void get().getTokenApprovalChain(address);
  },
  async setNFTApprovalChain({ address, chain }) {
    await wallet.setNFTApprovalChain(address, chain);
    void get().getPreference('nftApprovalChain');
  },
  async addPinnedChain(chain) {
    if (get().pinnedChain.includes(chain)) {
      return;
    }
    await wallet.saveChain(chain);
    void get().getPreference('pinnedChain');
  },
  async removePinnedChain(chain) {
    const list = get().pinnedChain.filter((item) => item !== chain);
    await wallet.updateChain(list);
    void get().getPreference('pinnedChain');
  },
  async updatePinnedChainList(chains) {
    set({ pinnedChain: chains });
    await wallet.updateChain(chains);
    void get().getPreference('pinnedChain');
  },
  async setAutoLockTime(time) {
    set({ autoLockTime: time });
    await wallet.setAutoLockTime(time);
    void get().getPreference('autoLockTime');
  },
  async setIsHideEcologyNoticeDict(patch) {
    const value = {
      ...get().isHideEcologyNoticeDict,
      ...patch,
    };
    set({ isHideEcologyNoticeDict: value });
    await wallet.setIsHideEcologyNoticeDict(value);
    void get().getPreference('isHideEcologyNoticeDict');
  },
  async setHiddenBalance(hiddenBalance) {
    set({ hiddenBalance });
    await wallet.setHiddenBalance(hiddenBalance);
    void get().getPreference('hiddenBalance');
  },
  async setIsShowTestnet(isShowTestnet) {
    set({ isShowTestnet });
    await wallet.setIsShowTestnet(isShowTestnet);
    void get().getPreference('isShowTestnet');
  },
  async setUserDataTrackingOptOut(userDataTrackingOptOut) {
    set({ userDataTrackingOptOut });
    await wallet.setUserDataTrackingOptOut(userDataTrackingOptOut);
    void get().getPreference('userDataTrackingOptOut');
  },
  async setDesktopTokensAllMode(desktopTokensAllMode) {
    set({ desktopTokensAllMode });
    await wallet.setDesktopTokensAllMode(desktopTokensAllMode);
    void get().getPreference('desktopTokensAllMode');
  },
  async switchLocale(locale) {
    set({ locale });
    changeLanguage(locale);
    await wallet.setLocale(locale);
    void get().getPreference('locale');
  },
  async switchThemeMode(themeMode) {
    set({ themeMode });
    await wallet.setThemeMode(themeMode);
    void get().getPreference('themeMode');
    ga4.fireEvent(
      `ThemeMode_${themeMode === DARK_MODE_TYPE.dark ? 'Dark' : 'Light'}`,
      { event_category: 'Settings Snapshot' }
    );
  },
  async setIsReserveGasOnSendToken(reserveGasOnSendToken) {
    set({ reserveGasOnSendToken });
    await wallet.setReserveGasOnSendToken(reserveGasOnSendToken);
    void get().getPreference('reserveGasOnSendToken');
  },
  async getAddressSortStoreValue<Key extends keyof AddressSortStore>(key: Key) {
    return (await wallet.getAddressSortStoreValue(
      key
    )) as AddressSortStore[Key];
  },
  async setAddressSortStoreValue<Key extends keyof AddressSortStore>({
    key,
    value,
  }: {
    key: Key;
    value: AddressSortStore[Key];
  }) {
    await wallet.setAddressSortStoreValue(key, value);
    void get().getPreference('addressSortStore');
  },
  async enablePwdForNonWhitelistedTx(value) {
    await wallet.enablePwdForNonWhitelistedTx(value);
    void get().getPreference('isEnabledPwdForNonWhitelistedTx');
    ga4.fireEvent(`PwdForNonWhitelistedTx_${value ? 'On' : 'Off'}`, {
      event_category: 'Settings Snapshot',
    });
  },
  async enableDappAccount(value) {
    await wallet.enableDappAccount(value);
    void get().getPreference('isEnabledDappAccount');
    ga4.fireEvent(`DappAccount_${value ? 'On' : 'Off'}`, {
      event_category: 'Settings Snapshot',
    });
  },
  async setBiometricUnlock(payload) {
    await wallet.setBiometricUnlock(payload);
    set({
      biometricUnlockEnabled: payload.enabled,
      biometricUnlockCredentialId: payload.credentialId || '',
      biometricUnlockEncryptedPassword: payload.encryptedPassword || '',
      biometricUnlockIv: payload.iv || '',
    });
    ga4.fireEvent(`Unlock_Biometrics_${payload.enabled ? 'On' : 'Off'}`, {
      event_category: 'Settings Snapshot',
    });
  },
  async setUnlockPreferredMethod(unlockPreferredMethod) {
    await wallet.setUnlockPreferredMethod(unlockPreferredMethod);
    set({ unlockPreferredMethod });
  },
  async setRateGuideLastExposure(lastExposure) {
    await wallet.setRateGuideLastExposure(lastExposure);
    set({
      rateGuideLastExposure: {
        ...getDefaultRateGuideLastExposure(),
        ...lastExposure,
        [LAST_EXPOSURE_VERSIONED_KEY]: {
          time: -1,
          userViewedRate: false,
          ...lastExposure[LAST_EXPOSURE_VERSIONED_KEY],
        },
      },
    });
  },
}));

export const initializePreferenceStore = () =>
  usePreferenceStore.getState().init();

export const preferenceActions: PreferenceActions = new Proxy(
  {} as PreferenceActions,
  {
    get(_target, property: keyof PreferenceActions) {
      return usePreferenceStore.getState()[property];
    },
  }
);
