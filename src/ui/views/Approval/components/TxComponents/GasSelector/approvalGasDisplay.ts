export type ApprovalGasMethod = 'native' | 'gasAccount';

export type ApprovalGasDisplayMode =
  | 'legacy'
  | 'native_insufficient_prefers_gasAccount';

export const APPROVAL_GAS_DISPLAY_MODE: ApprovalGasDisplayMode =
  'native_insufficient_prefers_gasAccount';

const canUseApprovalGasAccount = ({
  gasAccountChainSupported,
  noCustomRPC,
  isWalletConnect,
}: {
  gasAccountChainSupported?: boolean;
  noCustomRPC?: boolean;
  isWalletConnect: boolean;
}) => !!gasAccountChainSupported && !!noCustomRPC && !isWalletConnect;

export const isApprovalSmartGasDisplayEnabled = (
  mode: ApprovalGasDisplayMode = APPROVAL_GAS_DISPLAY_MODE
) => mode === 'native_insufficient_prefers_gasAccount';

// Smart mode decides the default; users can still override it in the picker.
export const shouldHideApprovalGasMethodTabs = () => false;

export const shouldAutoSwitchToApprovalGasAccount = ({
  nativeTokenInsufficient,
  gasAccountChainSupported,
  freeGasAvailable,
  noCustomRPC,
  isWalletConnect,
}: {
  nativeTokenInsufficient?: boolean;
  gasAccountChainSupported?: boolean;
  freeGasAvailable?: boolean;
  noCustomRPC?: boolean;
  isWalletConnect: boolean;
}) =>
  !!nativeTokenInsufficient &&
  !freeGasAvailable &&
  canUseApprovalGasAccount({
    gasAccountChainSupported,
    noCustomRPC,
    isWalletConnect,
  });

export const resolveApprovalGasMethod = ({
  mode = APPROVAL_GAS_DISPLAY_MODE,
  manualGasMethod,
  legacyGasMethod,
  nativeTokenInsufficient,
  gasAccountChainSupported,
  freeGasAvailable,
  noCustomRPC,
  isWalletConnect,
}: {
  mode?: ApprovalGasDisplayMode;
  manualGasMethod?: ApprovalGasMethod;
  legacyGasMethod?: ApprovalGasMethod;
  nativeTokenInsufficient?: boolean;
  gasAccountChainSupported?: boolean;
  freeGasAvailable?: boolean;
  noCustomRPC?: boolean;
  isWalletConnect: boolean;
}): ApprovalGasMethod => {
  if (manualGasMethod) {
    return manualGasMethod;
  }

  if (!isApprovalSmartGasDisplayEnabled(mode)) {
    return legacyGasMethod || 'native';
  }

  return shouldAutoSwitchToApprovalGasAccount({
    nativeTokenInsufficient,
    gasAccountChainSupported,
    freeGasAvailable,
    noCustomRPC,
    isWalletConnect,
  })
    ? 'gasAccount'
    : 'native';
};

export const resolveApprovalGasLevelMethod = ({
  manualGasMethod,
  isCustom = false,
  nativeTokenInsufficient,
  currentGasMethod = 'native',
  sharedGasAccountAvailable,
}: {
  mode?: ApprovalGasDisplayMode;
  manualGasMethod?: ApprovalGasMethod;
  isCustom?: boolean;
  nativeTokenInsufficient?: boolean;
  gasAccountChainSupported?: boolean;
  freeGasAvailable?: boolean;
  noCustomRPC?: boolean;
  currentGasMethod?: ApprovalGasMethod;
  sharedGasAccountAvailable?: boolean;
}): ApprovalGasMethod => {
  if (manualGasMethod) {
    return manualGasMethod;
  }

  if (isCustom) {
    return currentGasMethod;
  }

  if (nativeTokenInsufficient === false) {
    return 'native';
  }

  if (nativeTokenInsufficient === true && sharedGasAccountAvailable) {
    return 'gasAccount';
  }

  return 'native';
};

export const canDisplaySharedGasAccountForApproval = ({
  gasAccountBalanceEnough,
  gasAccountChainSupported,
  noCustomRPC,
  gasAccountErrMsg,
  isWalletConnect,
}: {
  gasAccountBalanceEnough: boolean;
  gasAccountChainSupported: boolean;
  noCustomRPC?: boolean;
  gasAccountErrMsg?: string | null;
  isWalletConnect: boolean;
}) =>
  !isWalletConnect &&
  !!noCustomRPC &&
  !!gasAccountBalanceEnough &&
  !!gasAccountChainSupported;
// &&
// (!gasAccountErrMsg ||
//   gasAccountErrMsg?.toLowerCase() ===
//     GAS_ACCOUNT_INSUFFICIENT_TIP?.toLowerCase());

export const isApprovalGasMethodNotEnough = ({
  displayMethod,
  nativeTokenInsufficient,
  gasAccountBalanceEnough,
}: {
  displayMethod: ApprovalGasMethod;
  nativeTokenInsufficient?: boolean;
  gasAccountBalanceEnough?: boolean;
}) =>
  displayMethod === 'gasAccount'
    ? gasAccountBalanceEnough === false
    : !!nativeTokenInsufficient;

export const resolveApprovalDisplayedGasLevelNotEnough = ({
  isActive,
  displayMethod,
  nativeTokenInsufficient,
  gasAccountBalanceEnough,
  levelNativeInsufficient,
  sharedGasAccountAvailable,
}: {
  isActive: boolean;
  displayMethod: ApprovalGasMethod;
  nativeTokenInsufficient?: boolean;
  gasAccountBalanceEnough?: boolean;
  levelNativeInsufficient?: boolean;
  sharedGasAccountAvailable?: boolean;
}) => {
  if (isActive) {
    return isApprovalGasMethodNotEnough({
      displayMethod,
      nativeTokenInsufficient,
      gasAccountBalanceEnough,
    });
  }

  if (
    nativeTokenInsufficient &&
    sharedGasAccountAvailable &&
    gasAccountBalanceEnough
  ) {
    return false;
  }

  return displayMethod === 'gasAccount'
    ? !sharedGasAccountAvailable
    : !!levelNativeInsufficient;
};
