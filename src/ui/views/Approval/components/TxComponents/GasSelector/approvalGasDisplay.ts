import { GAS_ACCOUNT_INSUFFICIENT_TIP } from '@/ui/views/GasAccount/hooks/checkTxs';

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

export const shouldHideApprovalGasMethodTabs = (
  mode: ApprovalGasDisplayMode = APPROVAL_GAS_DISPLAY_MODE
) => isApprovalSmartGasDisplayEnabled(mode);

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
  legacyGasMethod,
  nativeTokenInsufficient,
  gasAccountChainSupported,
  freeGasAvailable,
  noCustomRPC,
  isWalletConnect,
}: {
  mode?: ApprovalGasDisplayMode;
  legacyGasMethod?: ApprovalGasMethod;
  nativeTokenInsufficient?: boolean;
  gasAccountChainSupported?: boolean;
  freeGasAvailable?: boolean;
  noCustomRPC?: boolean;
  isWalletConnect: boolean;
}): ApprovalGasMethod => {
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
  isCustom = false,
  nativeTokenInsufficient,
  currentGasMethod = 'native',
  sharedGasAccountAvailable,
}: {
  mode?: ApprovalGasDisplayMode;
  isCustom?: boolean;
  nativeTokenInsufficient?: boolean;
  gasAccountChainSupported?: boolean;
  freeGasAvailable?: boolean;
  noCustomRPC?: boolean;
  currentGasMethod?: ApprovalGasMethod;
  sharedGasAccountAvailable?: boolean;
}): ApprovalGasMethod => {
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
  !!gasAccountChainSupported &&
  (!gasAccountErrMsg ||
    gasAccountErrMsg?.toLowerCase() ===
      GAS_ACCOUNT_INSUFFICIENT_TIP?.toLowerCase());

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
