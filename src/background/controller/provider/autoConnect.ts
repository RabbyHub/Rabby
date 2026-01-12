import { keyringService } from '@/background/service';
import { Account } from '@/background/service/preference';
import { KEYRING_CLASS } from '@/constant';
import { hex2Text } from '@/ui/utils';
import { fromHex } from 'viem';

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

const SUPPORTED_PERSONAL_SIGN = new Map<string, string>([
  [
    'https://polymarket.com',
    'polymarket.com wants you to sign in with your Ethereum account:',
  ],
]);

export const shouldAutoPersonalSign = ({
  origin,
  method,
  account,
  msgParams: msg,
}: {
  origin: string;
  method?: string;
  account?: Account;
  msgParams?: [string, string];
}) => {
  if (
    !msg ||
    !account ||
    !method ||
    !SUPPORTED_KEYRING_LIST.some((type) => account.brandName === type) ||
    !AUTO_PERSONAL_SIGN_METHODS.has(method) ||
    !AUTO_PERSONAL_SIGN_ORIGINS.has(origin) ||
    !SUPPORTED_PERSONAL_SIGN.has(origin)
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

  const matchText = SUPPORTED_PERSONAL_SIGN.get(origin);
  const isValidText = matchText
    ? fromHex(msg[0] as any, 'string')?.startsWith(matchText)
    : false;

  if (!isValidText) {
    return false;
  }

  return true;
};
