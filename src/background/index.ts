import 'reflect-metadata';
import { browser } from 'webextension-polyfill-ts';
import { ethErrors } from 'eth-rpc-errors';
import { WalletController } from 'background/controller/wallet';
import { Message } from 'utils';
import { storage } from './webapi';
import {
  permission,
  preference,
  session,
  keyringService,
  chainService,
} from './service';
import { providerController, walletController } from './controller';

const { PortMessage } = Message;

let appStoreLoaded = false;

async function restoreAppState() {
  const keyringState = await storage.get('keyringState');
  await permission.init();
  await preference.init();
  await chainService.init();

  keyringService.loadStore(keyringState);
  keyringService.store.subscribe((value) => storage.set('keyringState', value));

  appStoreLoaded = true;
}

restoreAppState();

// for page provider
browser.runtime.onConnect.addListener((port) => {
  if (!port.sender?.tab) {
    return;
  }

  const pm = new PortMessage(port);

  pm.listen(async (req) => {
    if (!appStoreLoaded) {
      throw ethErrors.provider.disconnected();
    }

    const sessionId = port.sender?.tab?.id;
    req.session = session.getOrCreateSession(sessionId);

    // for background push to respective page
    req.session.pushMessage = (event, data) => {
      pm.send('message', { event, data });
    };

    return providerController(req);
  });
});

declare global {
  interface Window {
    wallet: WalletController;
  }
}

// for popup operate
window.wallet = new Proxy(walletController, {
  get(target, propKey, receiver) {
    if (!appStoreLoaded) {
      throw ethErrors.provider.disconnected();
    }
    return Reflect.get(target, propKey, receiver);
  },
});
