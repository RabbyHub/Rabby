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
      nativeUsd?: string;
      nativeNotEnough?: boolean;
      gasAccount?: [boolean, string];
      loading?: boolean;
    }
  >
>;

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
  needsNative,
  needsGasAccount,
  hasActiveRequest = false,
}: {
  state?: SignMainnetGasLevelState[SignMainnetSupportedGasLevel];
  needsNative: boolean;
  needsGasAccount: boolean;
  hasActiveRequest?: boolean;
}) => {
  const hasNativeData =
    state?.nativeUsd !== undefined && state?.nativeNotEnough !== undefined;
  const hasGasAccountData = state?.gasAccount !== undefined;

  if (state?.loading && hasActiveRequest) {
    return false;
  }

  return (
    (needsNative && !hasNativeData) || (needsGasAccount && !hasGasAccountData)
  );
};

export const hasUsableSiblingSignMainnetGasLevel = ({
  selectedSupportedLevel,
  gasAccountChainSupported,
  levelState,
}: {
  selectedSupportedLevel?: SignMainnetSupportedGasLevel;
  gasAccountChainSupported: boolean;
  levelState: SignMainnetGasLevelState;
}) =>
  SIGN_MAINNET_SUPPORTED_GAS_LEVELS.some((level) => {
    if (level === selectedSupportedLevel) {
      return false;
    }

    const state = levelState[level];
    if (!state) {
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

export const shouldAutoOpenSignMainnetGasModal = ({
  fetchMode,
  selectedSupportedLevel,
  nativeTokenInsufficient,
  gasAccountUsable,
  gasAccountChainSupported,
  levelState,
}: {
  fetchMode: 'idle' | 'prefetch' | 'open';
  selectedSupportedLevel?: SignMainnetSupportedGasLevel;
  nativeTokenInsufficient: boolean;
  gasAccountUsable: boolean;
  gasAccountChainSupported: boolean;
  levelState: SignMainnetGasLevelState;
}) =>
  fetchMode === 'prefetch' &&
  nativeTokenInsufficient &&
  !gasAccountUsable &&
  hasUsableSiblingSignMainnetGasLevel({
    selectedSupportedLevel,
    gasAccountChainSupported,
    levelState,
  });
