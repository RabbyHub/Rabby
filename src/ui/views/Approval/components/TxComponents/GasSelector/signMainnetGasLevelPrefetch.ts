import { GasAccountCheckResult } from '@rabby-wallet/rabby-api/dist/types';

export const SIGN_MAINNET_SUPPORTED_GAS_LEVELS = [
  'slow',
  'normal',
  'fast',
] as const;

export type SignMainnetSupportedGasLevel = typeof SIGN_MAINNET_SUPPORTED_GAS_LEVELS[number];

export type SignMainnetGasLevelState = Partial<
  Record<
    SignMainnetSupportedGasLevel,
    {
      fingerprint?: string;
      nativeUsd?: string;
      nativeNotEnough?: boolean;
      gasAccount?: [boolean, string];
      loading?: boolean;
      gasAccountResult?: GasAccountCheckResult;
    }
  >
>;

export type SignMainnetAutoDowngradeGasLevel = {
  level: SignMainnetSupportedGasLevel;
  gasMethod: 'native' | 'gasAccount';
};

export type SignMainnetSupportedGasLevelPrice = {
  level: SignMainnetSupportedGasLevel;
  price: number;
};

export const resolveSignMainnetGasLevelFetchMode = ({
  isReady,
  isModalOpen,
  nativeTokenInsufficient,
  gasAccountUsable,
}: {
  isReady: boolean;
  isModalOpen: boolean;
  nativeTokenInsufficient: boolean;
  gasAccountUsable: boolean;
}) => {
  if (!isReady) {
    return 'idle' as const;
  }

  if (nativeTokenInsufficient && !gasAccountUsable) {
    return 'prefetch' as const;
  }

  return isModalOpen ? ('open' as const) : ('idle' as const);
};

export const resolveSignMainnetGasLevelFetchNeeds = ({
  gasAccountChainSupported,
}: {
  gasAccountChainSupported: boolean;
}) => ({
  needsNative: true,
  needsGasAccount: gasAccountChainSupported,
});

export const shouldFetchSignMainnetGasLevel = ({
  state,
  requestFingerprint,
  needsNative,
  needsGasAccount,
  hasActiveRequest = false,
}: {
  state?: SignMainnetGasLevelState[SignMainnetSupportedGasLevel];
  requestFingerprint: string;
  needsNative: boolean;
  needsGasAccount: boolean;
  hasActiveRequest?: boolean;
}) => {
  const isFreshState = state?.fingerprint === requestFingerprint;
  const hasNativeData =
    isFreshState &&
    state?.nativeUsd !== undefined &&
    state?.nativeNotEnough !== undefined;
  const hasGasAccountData = isFreshState && state?.gasAccount !== undefined;

  if (state?.loading && isFreshState && hasActiveRequest) {
    return false;
  }

  return (
    !isFreshState ||
    (needsNative && !hasNativeData) ||
    (needsGasAccount && !hasGasAccountData)
  );
};

export const hasUsableSiblingSignMainnetGasLevel = ({
  selectedSupportedLevel,
  gasAccountChainSupported,
  levelState,
  requestFingerprint,
}: {
  selectedSupportedLevel?: SignMainnetSupportedGasLevel;
  gasAccountChainSupported: boolean;
  levelState: SignMainnetGasLevelState;
  requestFingerprint: string;
}) =>
  SIGN_MAINNET_SUPPORTED_GAS_LEVELS.some((level) => {
    if (level === selectedSupportedLevel) {
      return false;
    }

    const state = levelState[level];
    if (!state || state.fingerprint !== requestFingerprint) {
      return false;
    }

    if (state.nativeUsd !== undefined && state.nativeNotEnough === false) {
      return true;
    }

    return !!(
      gasAccountChainSupported &&
      state.nativeNotEnough === true &&
      state.gasAccount &&
      state.gasAccount[0] === false
    );
  });

export const resolveSignMainnetAutoDowngradeGasLevel = ({
  selectedSupportedLevel,
  selectedGasPrice,
  supportedGasLevels = [],
  gasAccountChainSupported,
  levelState,
  requestFingerprint,
}: {
  selectedSupportedLevel?: SignMainnetSupportedGasLevel;
  selectedGasPrice?: number;
  supportedGasLevels?: SignMainnetSupportedGasLevelPrice[];
  gasAccountChainSupported: boolean;
  levelState: SignMainnetGasLevelState;
  requestFingerprint: string;
}): SignMainnetAutoDowngradeGasLevel | null => {
  const selectedIndex = selectedSupportedLevel
    ? SIGN_MAINNET_SUPPORTED_GAS_LEVELS.indexOf(selectedSupportedLevel)
    : -1;

  const lowerLevels =
    selectedIndex >= 0
      ? SIGN_MAINNET_SUPPORTED_GAS_LEVELS.slice(0, selectedIndex).reverse()
      : supportedGasLevels
          .filter(
            (gasLevel) =>
              Number.isFinite(gasLevel.price) &&
              typeof selectedGasPrice === 'number' &&
              Number.isFinite(selectedGasPrice) &&
              gasLevel.price < selectedGasPrice
          )
          .sort((a, b) => b.price - a.price)
          .map((gasLevel) => gasLevel.level);

  if (!lowerLevels.length) {
    return null;
  }

  for (const level of lowerLevels) {
    const state = levelState[level];
    if (!state || state.fingerprint !== requestFingerprint || state.loading) {
      return null;
    }

    if (state.nativeUsd !== undefined && state.nativeNotEnough === false) {
      return { level, gasMethod: 'native' };
    }

    if (state.nativeNotEnough !== true) {
      return null;
    }

    const levelGasAccountSupported =
      gasAccountChainSupported && !state.gasAccountResult?.chain_not_support;

    if (levelGasAccountSupported) {
      if (!state.gasAccount) {
        return null;
      }

      if (state.gasAccount[0] === false) {
        return { level, gasMethod: 'gasAccount' };
      }
    }
  }

  return null;
};

export const shouldAutoOpenSignMainnetGasModal = ({
  fetchMode,
  selectedSupportedLevel,
  nativeTokenInsufficient,
  gasAccountUsable,
  gasAccountChainSupported,
  levelState,
  requestFingerprint,
}: {
  fetchMode: 'idle' | 'prefetch' | 'open';
  selectedSupportedLevel?: SignMainnetSupportedGasLevel;
  nativeTokenInsufficient: boolean;
  gasAccountUsable: boolean;
  gasAccountChainSupported: boolean;
  levelState: SignMainnetGasLevelState;
  requestFingerprint: string;
}) =>
  fetchMode === 'prefetch' &&
  nativeTokenInsufficient &&
  !gasAccountUsable &&
  hasUsableSiblingSignMainnetGasLevel({
    selectedSupportedLevel,
    gasAccountChainSupported,
    levelState,
    requestFingerprint,
  });
