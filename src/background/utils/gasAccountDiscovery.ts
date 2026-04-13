import { KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import { Account } from 'background/service/preference';
import { gasAccountService, openapiService } from 'background/service';

const DIRECT_SIGN_TYPES = new Set<string>([
  KEYRING_TYPE.SimpleKeyring,
  KEYRING_TYPE.HdKeyring,
  KEYRING_CLASS.HARDWARE.LEDGER,
  KEYRING_CLASS.HARDWARE.ONEKEY,
]);

const HARDWARE_DIRECT_SIGN_TYPES = new Set<string>([
  KEYRING_CLASS.HARDWARE.LEDGER,
  KEYRING_CLASS.HARDWARE.ONEKEY,
]);

export const isGasAccountDirectSignType = (type?: string) =>
  !!type && DIRECT_SIGN_TYPES.has(type);

export const isGasAccountHardwareType = (type?: string) =>
  !!type && HARDWARE_DIRECT_SIGN_TYPES.has(type);

const hasGasAccountBalance = (balance?: number, noRegister?: boolean) =>
  !noRegister && Number(balance || 0) > 0;

export const discoverGasAccountRuntimeState = async (accounts: Account[]) => {
  const visibleAccounts = accounts.filter((account) =>
    isGasAccountDirectSignType(account.type)
  );

  if (!visibleAccounts.length) {
    gasAccountService.setDiscoveryState({
      pendingHardwareAccount: undefined,
      autoLoginAccount: undefined,
      accountsWithGasAccountBalance: [],
    });
    return gasAccountService.getGasAccountData();
  }

  const responses = await Promise.all(
    visibleAccounts.map(async (account) => {
      try {
        const info = await openapiService.getGasAccountInfoV2({
          id: account.address,
        });

        if (
          !hasGasAccountBalance(
            info?.account?.balance,
            info?.account?.no_register
          )
        ) {
          return null;
        }

        return {
          account,
          balance: Number(info.account.balance || 0),
        };
      } catch (error) {
        return null;
      }
    })
  );

  const accountsWithGasAccountBalance = responses
    .filter(Boolean)
    .sort((a, b) => (b?.balance || 0) - (a?.balance || 0))
    .map((item) => ({
      address: item!.account.address,
      type: item!.account.type,
      brandName: item!.account.brandName,
    }));

  const hasSession = gasAccountService.hasGasAccountSession();
  const autoLoginAccount = hasSession
    ? undefined
    : accountsWithGasAccountBalance.find(
        (account) => !isGasAccountHardwareType(account.type)
      );
  const pendingHardwareAccount =
    autoLoginAccount || hasSession
      ? undefined
      : accountsWithGasAccountBalance.find((account) =>
          isGasAccountHardwareType(account.type)
        );

  gasAccountService.setDiscoveryState({
    autoLoginAccount,
    pendingHardwareAccount,
    accountsWithGasAccountBalance,
  });

  return gasAccountService.getGasAccountData();
};
