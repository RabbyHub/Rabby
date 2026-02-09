import { keyringService } from '@/background/service';
import { Account } from '@/background/service/preference';
import { KEYRING_CLASS } from '@/constant';
// import { hex2Text } from '@/ui/utils';
import { fromHex, isHex } from 'viem';

const AUTO_CONNECT_SILENTLY_ORIGINS = new Set<string>([
  'https://polymarket.com',
  'https://www.asterdex.com',
  'https://app.lighter.xyz',
  'https://venus.io',
  'https://app.spark.fi',
  'https://app.opinion.trade',
  'https://probable.markets',
]);
const AUTO_CONNECT_METHODS = new Set<string>([
  'wallet_requestPermissions',
  'eth_requestAccounts',
]);

export const shouldAutoConnect = (origin: string, method?: string) => {
  if (!method || !AUTO_CONNECT_METHODS.has(method)) return false;
  return AUTO_CONNECT_SILENTLY_ORIGINS.has(origin);
};

const SUPPORTED_KEYRING_LIST = [
  KEYRING_CLASS.PRIVATE_KEY,
  KEYRING_CLASS.MNEMONIC,
];

const AUTO_PERSONAL_SIGN_ORIGINS = new Set<string>([
  'https://polymarket.com',
  'https://www.asterdex.com',
  'https://app.lighter.xyz',
  'https://app.opinion.trade',
  'https://probable.markets',
]);
const AUTO_PERSONAL_SIGN_METHODS = new Set<string>(['personal_sign']);

const SUPPORTED_PERSONAL_SIGN = new Map<string, string[]>([
  [
    'https://polymarket.com',
    ['polymarket.com wants you to sign in with your Ethereum account:'],
  ],
  ['https://www.asterdex.com', ['You are signing into Aster DEX']],
  [
    'https://app.lighter.xyz',
    ['Access Lighter account', 'Register Lighter Account'],
  ],
  [
    'https://app.opinion.trade',
    ['app.opinion.trade wants you to sign in with your'],
  ],
  [
    'https://probable.markets',
    ['probable.markets wants you to sign in with your'],
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

  const matchTextArr = SUPPORTED_PERSONAL_SIGN.get(origin);
  let isValidText = false;
  const isHexString = isHex(msg[0]);

  if (isHexString) {
    try {
      isValidText = matchTextArr
        ? matchTextArr?.some((text) =>
            fromHex(msg[0] as any, 'string')?.startsWith(text)
          )
        : false;
    } catch (error) {
      return false;
    }
  } else {
    isValidText = matchTextArr
      ? matchTextArr?.some((text) => (msg[0] as string).startsWith(text))
      : false;
  }

  if (!isValidText) {
    return false;
  }

  return true;
};
