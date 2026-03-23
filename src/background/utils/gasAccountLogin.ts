import { ga4 } from '@/utils/ga4';
import {
  gasAccountService,
  openapiService,
  pageStateCacheService,
} from 'background/service';
import { Account } from 'background/service/preference';

type HandleGasAccountLoginSuccessOptions = {
  redirectToGasAccount?: boolean;
};

const fireGasAccountStatusEvent = (hasBalance: boolean) => {
  ga4.fireEvent(`GasAccount_On_${hasBalance ? 'True' : 'False'}`, {
    event_category: 'Gas Account',
  });
  gasAccountService.markGa4ActiveTracked();
};

const getGasAccountHasBalance = async (sig: string, accountId: string) => {
  try {
    const info = await openapiService.getGasAccountInfo({
      sig,
      id: accountId,
    });

    return Number(info?.account?.balance || 0) > 0;
  } catch (error) {
    console.error('[getGasAccountHasBalance] failed', error);
    return undefined;
  }
};

const syncGasAccountBalanceState = async (sig: string, accountId: string) => {
  const hasBalance = await getGasAccountHasBalance(sig, accountId);
  if (typeof hasBalance !== 'boolean') {
    return undefined;
  }

  gasAccountService.setCurrentBalanceState(accountId, hasBalance);
  return hasBalance;
};

export const handleGasAccountLoginSuccess = async (
  signature: string,
  account: Account,
  options: HandleGasAccountLoginSuccessOptions = {}
) => {
  const { redirectToGasAccount = false } = options;
  const previousSig = gasAccountService.getGasAccountSig();
  const previousBalanceState = gasAccountService.getCurrentBalanceState();
  const wasLoggedIn = !!previousSig.sig && !!previousSig.accountId;
  const hadBalance =
    previousBalanceState.accountId === previousSig.accountId
      ? previousBalanceState.hasBalance
      : undefined;
  const isFirstLogin = gasAccountService.markLoggedIn();

  gasAccountService.setGasAccountSig(signature, account);

  if (redirectToGasAccount) {
    await pageStateCacheService.clear();
    await pageStateCacheService.set({
      path: '/gas-account',
      states: {},
    });
  }

  if (isFirstLogin) {
    ga4.fireEvent('GasAccount_FirstLogin', {
      event_category: 'Gas Account',
    });
  }

  const hasBalance = await syncGasAccountBalanceState(
    signature,
    account.address
  );
  if (hasBalance === undefined) {
    return;
  }

  if (!wasLoggedIn || (hadBalance === false && hasBalance)) {
    fireGasAccountStatusEvent(hasBalance);
  }
};

export const trackGasAccountActiveStatus = async (
  sig?: string,
  accountId?: string
) => {
  if (!sig || !accountId) {
    return false;
  }

  const hasBalance = await syncGasAccountBalanceState(sig, accountId);
  if (hasBalance === undefined) {
    return false;
  }

  fireGasAccountStatusEvent(hasBalance);
  return true;
};
