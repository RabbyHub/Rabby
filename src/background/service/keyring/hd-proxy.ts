import PortMessage from '@/utils/message/portMessage';
import { KEYRING_CLASS } from '.';
import { nanoid } from 'nanoid';
import { browser } from 'webextension-polyfill-ts';

const pm = new PortMessage();
const cached = new Set();

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

  cached[id] = params;

  return id;
};

export const invokeHDKeyring = async (
  id: string,
  method: string,
  params: any
) => {
  console.log(id, method, params);
  return pm.request({
    type: 'invoke',
    id,
    method,
    params,
  });
};

browser.runtime.onMessage.addListener((event) => {
  if (event === 'init-connect-keyring-service') {
    pm.connect('keyring');

    pm.request({
      type: 'init',
    });
  }
});
