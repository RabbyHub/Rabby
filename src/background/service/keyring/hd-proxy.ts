import PortMessage from '@/utils/message/portMessage';
import { KEYRING_CLASS } from '.';
import { browser } from 'webextension-polyfill-ts';
import { BetterJSON } from '@/utils/better-json';

export interface HDKeyringParams {
  type: string;
  options?: any;
}

export type HdKeyringType = keyof typeof KEYRING_CLASS['HARDWARE'];

const pm = new PortMessage();
const cached = new Map<string, string>();

export const initHDKeyring = async (
  type: keyof typeof KEYRING_CLASS['HARDWARE'],
  options?: any
) => {
  const id = type;
  const params = BetterJSON.stringify({ type, options });

  console.log('getHDKeyring', type, options);
  cached.set(id, params);

  await pm.request({
    type: 'getHDKeyring',
    params,
    id,
  });

  console.log('getHDKeyring init', type, id);

  return id;
};

export async function invokeHDKeyring<T>(
  id: HdKeyringType,
  method: OnlyClassMethods<T> | string,
  params?: any
): Promise<any> {
  console.log('invokeHDKeyring', id, method, params);
  const result = ((await pm.request({
    type: 'invoke',
    id,
    method,
    params: BetterJSON.stringify(params),
  })) ?? '{}') as string;

  return BetterJSON.parse(result);
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
