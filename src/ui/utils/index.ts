import {
  IS_CHROME,
  CHECK_METAMASK_INSTALLED_URL,
  WALLET_BRAND_CONTENT,
  KEYRING_CLASS,
  KEYRINGS_LOGOS,
  KEYRING_PURPLE_LOGOS,
} from 'consts';
import { Account } from 'background/service/preference';
// eslint-disable-next-line @typescript-eslint/no-empty-function
export const noop = () => {};

import { ledgerUSBVendorId } from '@ledgerhq/devices';
import { getImKeyDevices } from './imKey';

export * from './WalletContext';
export * from './WindowContext';

export * from './hooks';

export * from './webapi';

export * from './time';

export * from './number';

const UI_TYPE = {
  Tab: 'index',
  Pop: 'popup',
  Notification: 'notification',
};

type UiTypeCheck = {
  isTab: boolean;
  isNotification: boolean;
  isPop: boolean;
};

export const getUiType = (): UiTypeCheck => {
  const { pathname } = window.location;
  return Object.entries(UI_TYPE).reduce((m, [key, value]) => {
    m[`is${key}`] = pathname === `/${value}.html`;

    return m;
  }, {} as UiTypeCheck);
};

export const hex2Text = (hex: string) => {
  try {
    return hex.startsWith('0x')
      ? decodeURIComponent(
          hex.replace(/^0x/, '').replace(/[0-9a-f]{2}/g, '%$&')
        )
      : hex;
  } catch {
    return hex;
  }
};

export const getUITypeName = (): string => {
  const UIType = getUiType();

  if (UIType.isPop) return 'popup';
  if (UIType.isNotification) return 'notification';
  if (UIType.isTab) return 'tab';

  return '';
};

/**
 *
 * @param origin (exchange.pancakeswap.finance)
 * @returns (pancakeswap)
 */
export const getOriginName = (origin: string) => {
  const matches = origin.replace(/https?:\/\//, '').match(/^([^.]+\.)?(\S+)\./);

  return matches ? matches[2] || origin : origin;
};

export const hashCode = (str: string) => {
  if (!str) return 0;
  let hash = 0,
    i,
    chr,
    len;
  if (str.length === 0) return hash;
  for (i = 0, len = str.length; i < len; i++) {
    chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

export const isMetaMaskActive = async () => {
  let url = '';

  if (IS_CHROME) {
    url = CHECK_METAMASK_INSTALLED_URL.Chrome;
  }

  if (!url) return false;

  try {
    const res = await fetch(url);
    await res.text();

    return true;
  } catch (e) {
    return false;
  }
};

export const ellipsisOverflowedText = (
  str: string,
  length = 5,
  removeLastComma = false
) => {
  if (str.length <= length) return str;
  let cut = str.substring(0, length);
  if (removeLastComma) {
    if (cut.endsWith(',')) {
      cut = cut.substring(0, length - 1);
    }
  }
  return `${cut}...`;
};

/**
 * @description compare address is same, ignore case
 */
export const isSameAddress = (a: string, b: string) => {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
};

export const icons = {
  mnemonic: KEYRING_PURPLE_LOGOS[KEYRING_CLASS.MNEMONIC],
  privatekey: KEYRING_PURPLE_LOGOS[KEYRING_CLASS.PRIVATE_KEY],
  watch: KEYRING_PURPLE_LOGOS[KEYRING_CLASS.WATCH],
};

export const getAccountIcon = (account: Account) => {
  if (account) {
    if (WALLET_BRAND_CONTENT[account?.brandName]) {
      return WALLET_BRAND_CONTENT[account?.brandName].image;
    }
    switch (account.type) {
      case KEYRING_CLASS.MNEMONIC || 'HD Key Tree':
        return icons.mnemonic;
      case KEYRING_CLASS.PRIVATE_KEY:
        return icons.privatekey;
      case KEYRING_CLASS.WATCH:
        return icons.watch;
    }

    return KEYRINGS_LOGOS[account.type];
  }
  return '';
};

export const isStringOrNumber = (data) => {
  return typeof data === 'string' || typeof data === 'number';
};

export const hasConnectedLedgerDevice = async () => {
  const devices = await navigator.hid.getDevices();
  return (
    devices.filter((device) => device.vendorId === ledgerUSBVendorId).length > 0
  );
};

export const hasConnectedImKeyDevice = async () => {
  return !!(await getImKeyDevices()).length;
};
