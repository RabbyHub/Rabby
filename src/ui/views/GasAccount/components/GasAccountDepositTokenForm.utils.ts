import BigNumber from 'bignumber.js';
import { isSameAddress } from '@/ui/utils';
import { findAccountByPriority } from '@/utils/account';
import type { GasAccountAvailableToken } from '../hooks/useDepositTokenAvailability';
import { MAX_GAS_ACCOUNT_DEPOSIT_USD } from './depositUtils';

type AccountLike = {
  address: string;
  type: string;
  brandName: string;
  [key: string]: any;
};

export const buildOwnerAccountMap = <T extends AccountLike>(
  tokens: GasAccountAvailableToken[],
  accounts: T[],
  accountFilter?: (account: T) => boolean
): Map<string, T> => {
  const map = new Map<string, T>();

  tokens.forEach((token) => {
    const matchedAccounts = accounts.filter((account) =>
      isSameAddress(account.address, token.owner_addr)
    );
    const preferred =
      accountFilter && matchedAccounts.length
        ? matchedAccounts.filter(accountFilter)
        : matchedAccounts;
    const matchedAccount = findAccountByPriority(
      (preferred.length ? preferred : matchedAccounts) as any
    ) as T | undefined;

    if (matchedAccount) {
      map.set(token.owner_addr.toLowerCase(), matchedAccount);
    }
  });

  return map;
};

export interface DepositValidationMessages {
  unavailablePaymentWallet: string;
  invalidAmount: string;
  zeroInvalidAmount: string;
  minAmountRequired: string;
  insufficientTokenBalance: string;
  fetchQuoteFailed: string;
  insufficientBalanceLabel: string;
}

export const getDepositAmountValidation = ({
  hasSelectedToken,
  hasSelectedOwnerAccount,
  usdValue,
  amountValue,
  isBridgeDeposit,
  directTokenBalance,
  tokenBalanceUsd,
  hasTokenPrice,
  minDepositUsd,
  messages,
}: {
  hasSelectedToken: boolean;
  hasSelectedOwnerAccount: boolean;
  usdValue: string;
  amountValue: number;
  isBridgeDeposit: boolean;
  directTokenBalance: number;
  tokenBalanceUsd: number;
  hasTokenPrice: boolean;
  minDepositUsd: number;
  messages: DepositValidationMessages;
}) => {
  if (!hasSelectedToken) {
    return { isValid: false, errorMessage: '' };
  }

  if (!hasSelectedOwnerAccount) {
    return {
      isValid: false,
      errorMessage: messages.unavailablePaymentWallet,
    };
  }

  if (!usdValue) {
    return { isValid: false, errorMessage: '' };
  }

  if (Number.isNaN(amountValue)) {
    return {
      isValid: false,
      errorMessage: messages.invalidAmount,
    };
  }

  if (amountValue <= 0) {
    return {
      isValid: false,
      errorMessage: messages.zeroInvalidAmount,
    };
  }

  if (amountValue < minDepositUsd) {
    return {
      isValid: false,
      errorMessage: messages.minAmountRequired,
    };
  }

  if (amountValue > MAX_GAS_ACCOUNT_DEPOSIT_USD) {
    return {
      isValid: false,
      errorMessage: messages.invalidAmount,
    };
  }

  if (!isBridgeDeposit && directTokenBalance < amountValue) {
    return {
      isValid: false,
      errorMessage: messages.insufficientTokenBalance,
    };
  }

  if (isBridgeDeposit && tokenBalanceUsd < amountValue) {
    return {
      isValid: false,
      errorMessage: messages.insufficientTokenBalance,
    };
  }

  if (isBridgeDeposit && !hasTokenPrice) {
    return {
      isValid: false,
      errorMessage: messages.fetchQuoteFailed,
    };
  }

  return {
    isValid: true,
    errorMessage: '',
  };
};

export const getMinDepositUsdValue = (minDepositPrice?: number) =>
  Math.max(1, Number(minDepositPrice || 0));

export const getDefaultDepositUsdValue = (minDepositPrice?: number) =>
  new BigNumber(getMinDepositUsdValue(minDepositPrice)).toFixed(
    2,
    BigNumber.ROUND_CEIL
  );

export const getBridgeFromTokenAmount = ({
  amountValue,
  tokenPrice,
}: {
  amountValue: number;
  tokenPrice?: number;
}) => {
  if (!tokenPrice || !amountValue) {
    return 0;
  }

  return amountValue / tokenPrice;
};

export const getDepositMaxUsdValue = ({
  isBridgeDeposit,
  directTokenBalance,
  tokenBalanceUsd,
}: {
  isBridgeDeposit: boolean;
  directTokenBalance: number;
  tokenBalanceUsd: number;
}) => {
  return isBridgeDeposit ? tokenBalanceUsd : directTokenBalance;
};

export const getDepositBalanceCopy = ({
  hasSelectedToken,
  tokenBalanceUsd,
  amountValue,
  formattedBalance,
  balanceLabel,
  insufficientBalanceLabel,
}: {
  hasSelectedToken: boolean;
  tokenBalanceUsd: number;
  amountValue: number;
  formattedBalance: string;
  balanceLabel: string;
  insufficientBalanceLabel: string;
}) => {
  const isInsufficient =
    hasSelectedToken &&
    (tokenBalanceUsd < 1 || (amountValue > 0 && tokenBalanceUsd < amountValue));
  const label = isInsufficient ? insufficientBalanceLabel : balanceLabel;

  return {
    copy: `${label}: ${formattedBalance}`,
    isInsufficient,
  };
};
