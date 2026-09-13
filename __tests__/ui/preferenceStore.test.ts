import { CHAINS_ENUM, DARK_MODE_TYPE } from '@/constant';
import { changeLanguage } from '@/i18n';
import {
  getDefaultPreferenceState,
  selectIsReserveGasOnSendToken,
  selectRateGuideLastExposureTimestamp,
  selectUserViewedRate,
  usePreferenceStore,
} from '@/ui/state/preference';
import { wallet } from '@/ui/wallet';
import { ga4 } from '@/utils/ga4';
import {
  getDefaultRateGuideLastExposure,
  LAST_EXPOSURE_VERSIONED_KEY,
} from '@/utils/rateGuidance';

jest.mock('@/i18n', () => ({
  changeLanguage: jest.fn(),
}));

jest.mock('@/utils/ga4', () => ({
  ga4: {
    fireEvent: jest.fn(),
  },
}));

jest.mock('@/ui/wallet', () => ({
  wallet: {
    enableDappAccount: jest.fn(),
    enablePwdForNonWhitelistedTx: jest.fn(),
    getAddressSortStoreValue: jest.fn(),
    getPreference: jest.fn(),
    getTokenApprovalChain: jest.fn(),
    isDefaultWallet: jest.fn(),
    saveChain: jest.fn(),
    setAddressSortStoreValue: jest.fn(),
    setAutoLockTime: jest.fn(),
    setBiometricUnlock: jest.fn(),
    setDesktopTokensAllMode: jest.fn(),
    setHiddenBalance: jest.fn(),
    setIsDefaultWallet: jest.fn(),
    setIsHideEcologyNoticeDict: jest.fn(),
    setIsShowTestnet: jest.fn(),
    setLocale: jest.fn(),
    setNFTApprovalChain: jest.fn(),
    setRateGuideLastExposure: jest.fn(),
    setReserveGasOnSendToken: jest.fn(),
    setThemeMode: jest.fn(),
    setTokenApprovalChain: jest.fn(),
    setUnlockPreferredMethod: jest.fn(),
    setUserDataTrackingOptOut: jest.fn(),
    updateChain: jest.fn(),
  },
}));

describe('preference store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePreferenceStore.setState(getDefaultPreferenceState());
    (wallet.getPreference as jest.Mock).mockImplementation((key?: string) =>
      Promise.resolve(
        key
          ? getDefaultPreferenceState()[key]
          : getDefaultPreferenceState()
      )
    );
  });

  test('keeps the UI preference snapshot in a non-persisted store', () => {
    const state = usePreferenceStore.getState();

    expect(state).toMatchObject({
      locale: 'en',
      pinnedChain: [],
      hiddenBalance: false,
      themeMode: DARK_MODE_TYPE.system,
      reserveGasOnSendToken: false,
    });
    expect(selectIsReserveGasOnSendToken(state)).toBe(false);
    expect(selectRateGuideLastExposureTimestamp(state)).toBe(-1);
    expect(selectUserViewedRate(state)).toBe(false);
    expect('persist' in usePreferenceStore).toBe(false);
  });

  test('initializes the complete preference snapshot from the background', async () => {
    const preference = {
      ...getDefaultPreferenceState(),
      locale: 'zh_CN',
      hiddenBalance: true,
      pinnedChain: [CHAINS_ENUM.ETH],
    };
    (wallet.getPreference as jest.Mock).mockResolvedValue(preference);

    await expect(usePreferenceStore.getState().init()).resolves.toBe(
      preference
    );

    expect(wallet.getPreference).toHaveBeenCalledWith(undefined);
    expect(usePreferenceStore.getState()).toMatchObject(preference);
  });

  test('reads one preference with optional local synchronization', async () => {
    (wallet.getPreference as jest.Mock).mockResolvedValue(true);

    await expect(
      usePreferenceStore.getState().getPreference('hiddenBalance')
    ).resolves.toBe(true);
    expect(usePreferenceStore.getState().hiddenBalance).toBe(true);

    usePreferenceStore.setState({ isShowTestnet: false });
    await expect(
      usePreferenceStore.getState().getPreferenceValue({
        key: 'isShowTestnet',
        updateLocalStore: false,
      })
    ).resolves.toBe(true);
    expect(usePreferenceStore.getState().isShowTestnet).toBe(false);

    await usePreferenceStore.getState().getPreferenceValue({
      key: 'isShowTestnet',
      updateLocalStore: true,
    });
    expect(usePreferenceStore.getState().isShowTestnet).toBe(true);
  });

  test('updates pinned chains through the background preference API', async () => {
    (wallet.saveChain as jest.Mock).mockResolvedValue(undefined);
    (wallet.updateChain as jest.Mock).mockResolvedValue(undefined);
    usePreferenceStore.setState({ pinnedChain: [CHAINS_ENUM.ETH] });

    await usePreferenceStore.getState().addPinnedChain(CHAINS_ENUM.ETH);
    expect(wallet.saveChain).not.toHaveBeenCalled();

    await usePreferenceStore.getState().addPinnedChain(CHAINS_ENUM.BSC);
    expect(wallet.saveChain).toHaveBeenCalledWith(CHAINS_ENUM.BSC);

    await usePreferenceStore.getState().removePinnedChain(CHAINS_ENUM.ETH);
    expect(wallet.updateChain).toHaveBeenCalledWith([]);

    (wallet.getPreference as jest.Mock).mockResolvedValue([
      CHAINS_ENUM.ETH,
      CHAINS_ENUM.BSC,
    ]);
    await usePreferenceStore
      .getState()
      .updatePinnedChainList([CHAINS_ENUM.ETH, CHAINS_ENUM.BSC]);
    expect(usePreferenceStore.getState().pinnedChain).toEqual([
      CHAINS_ENUM.ETH,
      CHAINS_ENUM.BSC,
    ]);
  });

  test('updates approval chains with normalized addresses', async () => {
    (wallet.getTokenApprovalChain as jest.Mock).mockResolvedValue(
      CHAINS_ENUM.BSC
    );
    (wallet.setTokenApprovalChain as jest.Mock).mockResolvedValue(undefined);

    await usePreferenceStore
      .getState()
      .getTokenApprovalChain('0xAbC');

    expect(wallet.getTokenApprovalChain).toHaveBeenCalledWith('0xabc');
    expect(usePreferenceStore.getState().tokenApprovalChain['0xabc']).toBe(
      CHAINS_ENUM.BSC
    );

    await usePreferenceStore.getState().setTokenApprovalChain({
      address: '0xAbC',
      chain: CHAINS_ENUM.ETH,
    });
    expect(wallet.setTokenApprovalChain).toHaveBeenCalledWith(
      '0xAbC',
      CHAINS_ENUM.ETH
    );
  });

  test('optimistically updates locale and theme while preserving side effects', async () => {
    (wallet.setLocale as jest.Mock).mockResolvedValue(undefined);
    (wallet.setThemeMode as jest.Mock).mockResolvedValue(undefined);

    (wallet.getPreference as jest.Mock).mockResolvedValue('zh_CN');
    await usePreferenceStore.getState().switchLocale('zh_CN');
    expect(usePreferenceStore.getState().locale).toBe('zh_CN');
    expect(changeLanguage).toHaveBeenCalledWith('zh_CN');
    expect(wallet.setLocale).toHaveBeenCalledWith('zh_CN');

    (wallet.getPreference as jest.Mock).mockResolvedValue(DARK_MODE_TYPE.dark);
    await usePreferenceStore
      .getState()
      .switchThemeMode(DARK_MODE_TYPE.dark);
    expect(usePreferenceStore.getState().themeMode).toBe(DARK_MODE_TYPE.dark);
    expect(wallet.setThemeMode).toHaveBeenCalledWith(DARK_MODE_TYPE.dark);
    expect(ga4.fireEvent).toHaveBeenCalledWith('ThemeMode_Dark', {
      event_category: 'Settings Snapshot',
    });
  });

  test('updates biometric and rate-guide state after background writes', async () => {
    (wallet.setBiometricUnlock as jest.Mock).mockResolvedValue(undefined);
    (wallet.setRateGuideLastExposure as jest.Mock).mockResolvedValue(undefined);

    await usePreferenceStore.getState().setBiometricUnlock({
      enabled: true,
      credentialId: 'credential',
      encryptedPassword: 'encrypted',
      iv: 'iv',
    });
    expect(usePreferenceStore.getState()).toMatchObject({
      biometricUnlockEnabled: true,
      biometricUnlockCredentialId: 'credential',
      biometricUnlockEncryptedPassword: 'encrypted',
      biometricUnlockIv: 'iv',
    });

    const lastExposure = getDefaultRateGuideLastExposure({
      time: Date.now() - 1,
      userViewedRate: false,
    });
    await usePreferenceStore
      .getState()
      .setRateGuideLastExposure(lastExposure);

    expect(
      usePreferenceStore.getState().rateGuideLastExposure?.[
        LAST_EXPOSURE_VERSIONED_KEY
      ]
    ).toEqual(lastExposure[LAST_EXPOSURE_VERSIONED_KEY]);
    expect(selectUserViewedRate(usePreferenceStore.getState())).toBe(true);
  });
});
