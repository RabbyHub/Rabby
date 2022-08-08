import PortMessage from '@/utils/message/portMessage';
import { KEYRING_CLASS } from '.';
import { nanoid } from 'nanoid';
import { browser } from 'webextension-polyfill-ts';

export interface HDKeyringParams {
  type: string;
  options?: any;
}

export type HdKeyringType = keyof typeof KEYRING_CLASS['HARDWARE'];

const pm = new PortMessage();
const cached = new Map<string, HDKeyringParams>();

export const initHDKeyring = async (
  type: keyof typeof KEYRING_CLASS['HARDWARE']
) => {
  const id = nanoid();
  const params = { type };

  await pm.request({
    type: 'getHDKeyring',
    params,
    id,
  });

  cached.set(id, params);

  return id;
};

export async function invokeHDKeyring<T>(
  id: string,
  method: OnlyClassMethods<T> | string,
  params?: any
): Promise<any> {
  return pm.request({
    type: 'invoke',
    id,
    method,
    params,
  });
}

type OnlyClassMethods<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

browser.runtime.onMessage.addListener((event) => {
  if (event === 'init-connect-keyring-service') {
    pm.connect('keyring');

    pm.request({
      type: 'init',
      params: {
        data: Object.fromEntries(cached),
      },
    });
  }
});
