import { keyringService } from '@/background/service';
import { Account } from '@/background/service/preference';
import { KEYRING_CLASS } from '@/constant';

const AUTO_CONNECT_SILENTLY_ORIGINS = new Set<string>([
  'https://polymarket.com',
]);
const AUTO_CONNECT_METHODS = new Set<string>(['wallet_requestPermissions']);

export const shouldAutoConnect = (origin: string, method?: string) => {
  if (!method || !AUTO_CONNECT_METHODS.has(method)) return false;
  return AUTO_CONNECT_SILENTLY_ORIGINS.has(origin);
};

const SUPPORTED_KEYRING_LIST = [
  KEYRING_CLASS.PRIVATE_KEY,
  KEYRING_CLASS.MNEMONIC,
];

const AUTO_PERSONAL_SIGN_ORIGINS = new Set<string>(['https://polymarket.com']);
const AUTO_PERSONAL_SIGN_METHODS = new Set<string>(['personal_sign']);
export const shouldAutoPersonalSign = ({
  origin,
  method,
  account,
}: {
  origin: string;
  method?: string;
  account?: Account;
}) => {
  if (
    !account ||
    !method ||
    !SUPPORTED_KEYRING_LIST.some((type) => account.brandName === type) ||
    !AUTO_PERSONAL_SIGN_METHODS.has(method) ||
    !AUTO_PERSONAL_SIGN_ORIGINS.has(origin)
  ) {
    return false;
  }
  if (account.brandName === KEYRING_CLASS.MNEMONIC) {
    const currentKeyring = keyringService.keyrings.find((item) => {
      return (
        item.type === KEYRING_CLASS.MNEMONIC &&
        item.mnemonic &&
        item.accounts.includes(account.address)
      );
    });
    if (!currentKeyring) {
      return false;
    }
    if (currentKeyring?.needPassphrase) {
      return false;
    }
  }

  return true;
};
