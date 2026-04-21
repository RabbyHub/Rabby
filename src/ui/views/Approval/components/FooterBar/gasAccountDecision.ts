import { GasAccountCheckResult } from '@/background/service/openapi';
import { supportedDirectSign } from '@/ui/hooks/useMiniApprovalDirectSign';
import { GAS_ACCOUNT_INSUFFICIENT_TIP } from '@/ui/views/GasAccount/hooks/checkTxs';

export const shouldAutoSwitchToGasAccountFromGasless = ({
  showGasLess,
  isGasNotEnough,
  canUseGasLess,
  canGotoUseGasAccount,
}: {
  showGasLess: boolean;
  isGasNotEnough: boolean;
  canUseGasLess: boolean;
  canGotoUseGasAccount: boolean;
}) => showGasLess && isGasNotEnough && !canUseGasLess && canGotoUseGasAccount;

export const shouldShowGasLessNotEnough = ({
  showGasLess,
  isGasNotEnough,
  payGasByGasAccount,
  canUseGasLess,
}: {
  showGasLess: boolean;
  isGasNotEnough: boolean;
  payGasByGasAccount: boolean;
  canUseGasLess: boolean;
}) => showGasLess && isGasNotEnough && !payGasByGasAccount && !canUseGasLess;

export const getGasAccountDecision = ({
  gasAccountCost,
  noCustomRPC,
  isWalletConnect,
  accountType,
  authTimeFormChanged,
}: {
  gasAccountCost?: GasAccountCheckResult & { err_msg?: string };
  noCustomRPC?: boolean;
  isWalletConnect?: boolean;
  accountType?: string;
  authTimeFormChanged?: boolean;
}) => {
  const customRPCUnsupported = !noCustomRPC;
  const walletConnectUnsupported = !!isWalletConnect;
  const chainUnsupported = !!gasAccountCost?.chain_not_support;
  const insufficientBalance =
    !!gasAccountCost &&
    !gasAccountCost.balance_is_enough &&
    !gasAccountCost.chain_not_support;
  const errMsg = gasAccountCost?.err_msg;
  const hasBlockingError =
    !!errMsg &&
    errMsg.toLowerCase() !== GAS_ACCOUNT_INSUFFICIENT_TIP.toLowerCase();
  const supportsSimplifiedSign = supportedDirectSign(accountType || '');
  const canUseGasAccount =
    !!noCustomRPC &&
    !!gasAccountCost?.balance_is_enough &&
    !gasAccountCost.chain_not_support &&
    !!gasAccountCost.is_gas_account &&
    !hasBlockingError;
  const canGotoUseGasAccount =
    !!noCustomRPC &&
    !!gasAccountCost?.balance_is_enough &&
    !gasAccountCost.chain_not_support &&
    !!gasAccountCost.is_gas_account;
  const canDepositUseGasAccount =
    !!noCustomRPC &&
    !!gasAccountCost &&
    !gasAccountCost.balance_is_enough &&
    !gasAccountCost.chain_not_support;

  return {
    customRPCUnsupported,
    walletConnectUnsupported,
    chainUnsupported,
    insufficientBalance,
    blockingError: hasBlockingError ? errMsg : null,
    canUseGasAccount,
    canGotoUseGasAccount,
    canDepositUseGasAccount,
    canEnterNewTopUpFlow: supportsSimplifiedSign,
    shouldKeepLegacyTipBehavior: !supportsSimplifiedSign,
    authTimeFormChanged: !!authTimeFormChanged,
    canResumeAfterTopUp: supportsSimplifiedSign && !authTimeFormChanged,
  };
};
