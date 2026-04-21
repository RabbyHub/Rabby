export type ApprovalGasMethod = 'native' | 'gasAccount';

export type ApprovalGasDisplayMode =
  | 'legacy'
  | 'native_insufficient_prefers_gasAccount';

export const APPROVAL_GAS_DISPLAY_MODE: ApprovalGasDisplayMode =
  'native_insufficient_prefers_gasAccount';

const canUseApprovalGasAccount = ({
  gasAccountChainSupported,
  noCustomRPC,
}: {
  gasAccountChainSupported?: boolean;
  noCustomRPC?: boolean;
}) => !!gasAccountChainSupported && !!noCustomRPC;

export const isApprovalSmartGasDisplayEnabled = (
  mode: ApprovalGasDisplayMode = APPROVAL_GAS_DISPLAY_MODE
) => mode === 'native_insufficient_prefers_gasAccount';

export const shouldHideApprovalGasMethodTabs = (
  mode: ApprovalGasDisplayMode = APPROVAL_GAS_DISPLAY_MODE
) => isApprovalSmartGasDisplayEnabled(mode);

export const shouldAutoSwitchToApprovalGasAccount = ({
  nativeTokenInsufficient,
  gasAccountChainSupported,
  freeGasAvailable,
  noCustomRPC,
}: {
  nativeTokenInsufficient?: boolean;
  gasAccountChainSupported?: boolean;
  freeGasAvailable?: boolean;
  noCustomRPC?: boolean;
}) =>
  !!nativeTokenInsufficient &&
  !freeGasAvailable &&
  canUseApprovalGasAccount({
    gasAccountChainSupported,
    noCustomRPC,
  });

export const resolveApprovalGasMethod = ({
  mode = APPROVAL_GAS_DISPLAY_MODE,
  legacyGasMethod,
  nativeTokenInsufficient,
  gasAccountChainSupported,
  freeGasAvailable,
  noCustomRPC,
}: {
  mode?: ApprovalGasDisplayMode;
  legacyGasMethod?: ApprovalGasMethod;
  nativeTokenInsufficient?: boolean;
  gasAccountChainSupported?: boolean;
  freeGasAvailable?: boolean;
  noCustomRPC?: boolean;
}): ApprovalGasMethod => {
  if (!isApprovalSmartGasDisplayEnabled(mode)) {
    return legacyGasMethod || 'native';
  }

  return shouldAutoSwitchToApprovalGasAccount({
    nativeTokenInsufficient,
    gasAccountChainSupported,
    freeGasAvailable,
    noCustomRPC,
  })
    ? 'gasAccount'
    : 'native';
};

export const resolveApprovalGasLevelMethod = ({
  mode = APPROVAL_GAS_DISPLAY_MODE,
  isCustom = false,
  nativeTokenInsufficient,
  gasAccountChainSupported,
  freeGasAvailable,
  noCustomRPC,
  currentGasMethod = 'native',
}: {
  mode?: ApprovalGasDisplayMode;
  isCustom?: boolean;
  nativeTokenInsufficient?: boolean;
  gasAccountChainSupported?: boolean;
  freeGasAvailable?: boolean;
  noCustomRPC?: boolean;
  currentGasMethod?: ApprovalGasMethod;
}): ApprovalGasMethod => {
  if (isCustom) {
    return currentGasMethod;
  }

  return resolveApprovalGasMethod({
    mode,
    legacyGasMethod: currentGasMethod,
    nativeTokenInsufficient,
    gasAccountChainSupported,
    freeGasAvailable,
    noCustomRPC,
  });
};

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
  levelGasAccountNotEnough,
}: {
  isActive: boolean;
  displayMethod: ApprovalGasMethod;
  nativeTokenInsufficient?: boolean;
  gasAccountBalanceEnough?: boolean;
  levelNativeInsufficient?: boolean;
  levelGasAccountNotEnough?: boolean;
}) => {
  if (isActive) {
    return isApprovalGasMethodNotEnough({
      displayMethod,
      nativeTokenInsufficient,
      gasAccountBalanceEnough,
    });
  }

  return displayMethod === 'gasAccount'
    ? levelGasAccountNotEnough
    : levelNativeInsufficient;
};
