import { CHAINS } from '@/constant';
import { keyBy } from 'lodash';
import browser from 'webextension-polyfill';
import { ledgerUSBVendorId } from '@ledgerhq/devices';

declare global {
  const langLocales: Record<string, Record<'message', string>>;
}

const t = (name) => browser.i18n.getMessage(name);

const format = (str, ...args) => {
  return args.reduce((m, n) => m.replace('_s_', n), str);
};

export { t, format };

const chainsDict = keyBy(CHAINS, 'serverId');
export const getChain = (chainId?: string) => {
  if (!chainId) {
    return null;
  }
  return chainsDict[chainId];
};

export const hasConnectedLedgerDevice = async () => {
  const devices = await navigator.hid.getDevices();
  return (
    devices.filter((device) => device.vendorId === ledgerUSBVendorId).length > 0
  );
};

export const getOriginFromUrl = (url: string) => {
  const urlObj = new URL(url);
  return urlObj.origin;
};

/**
 *
 * @param url (exchange.pancakeswap.finance/blabla)
 * @returns (pancakeswap.finance)
 */
export const getMainDomain = (url: string) => {
  try {
    const origin = getOriginFromUrl(url);
    const arr = origin.split('.');
    const mainDomainWithPath = [arr[arr.length - 2], arr[arr.length - 1]].join(
      '.'
    );
    return mainDomainWithPath.replace(/^https?:\/\//, '');
  } catch (err) {
    return '';
  }
};

export const resemblesETHAddress = (str: string): boolean => {
  return str.length === 42;
};

export const getAddressScanLink = (scanLink: string, address: string) => {
  if (/transaction\/_s_/.test(scanLink)) {
    return scanLink.replace(/transaction\/_s_/, `address/${address}`);
  }
  return scanLink.replace(/tx\/_s_/, `address/${address}`);
};
