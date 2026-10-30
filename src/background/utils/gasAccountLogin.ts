import { gasAccountService, pageStateCacheService } from 'background/service';
import { Account } from 'background/service/preference';

type HandleGasAccountLoginSuccessOptions = {
  redirectToGasAccount?: boolean;
};

export const handleGasAccountLoginSuccess = async (
  signature: string,
  account: Account,
  options: HandleGasAccountLoginSuccessOptions = {}
) => {
  const { redirectToGasAccount = false } = options;

  gasAccountService.setGasAccountSig(signature, account);

  if (redirectToGasAccount) {
    await pageStateCacheService.clear();
    await pageStateCacheService.set({
      path: '/gas-account',
      states: {},
    });
  }
};
