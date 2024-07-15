import { CHAINS } from '@/constant';
import { keyBy } from 'lodash';
import browser from 'webextension-polyfill';
import { findChain } from './chain';

declare global {
  const langLocales: Record<string, Record<'message', string>>;
}

const t = (name) => browser.i18n.getMessage(name);

const format = (str, ...args) => {
  return args.reduce((m, n) => m.replace('_s_', n), str);
};

export { t, format };

export const getChain = (chainId?: string) => {
  if (!chainId) {
    return null;
  }
  return findChain({
    serverId: chainId,
  });
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
  } else if (/tx\/_s_/.test(scanLink)) {
    return scanLink.replace(/tx\/_s_/, `address/${address}`);
  } else {
    return scanLink.endsWith('/')
      ? `${scanLink}address/${address}`
      : `${scanLink}/address/${address}`;
  }
};

export const getTxScanLink = (scankLink: string, hash: string) => {
  if (scankLink.includes('_s_')) {
    return scankLink.replace('_s_', hash);
  }
  return scankLink.endsWith('/')
    ? `${scankLink}tx/${hash}`
    : `${scankLink}/tx/${hash}`;
};

export const safeJSONParse = (str: string) => {
  try {
    return JSON.parse(str);
  } catch (err) {
    return null;
  }
};
