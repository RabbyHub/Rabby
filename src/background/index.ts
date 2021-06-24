import 'reflect-metadata';
import { browser } from 'webextension-polyfill-ts';
import { ethErrors } from 'eth-rpc-errors';
import { WalletController } from 'background/controller/wallet';
import { Message } from 'utils';
import { storage } from './webapi';
import {
  permissionService,
  preferenceService,
  sessionService,
  keyringService,
  chainService,
  openapiService,
} from './service';
import { providerController, walletController } from './controller';

const { PortMessage } = Message;

let appStoreLoaded = false;

async function restoreAppState() {
  const keyringState = await storage.get('keyringState');
  keyringService.loadStore(keyringState);
  keyringService.store.subscribe((value) => storage.set('keyringState', value));

  await permissionService.init();
  await preferenceService.init();
  await openapiService.init();
  await chainService.init();

  appStoreLoaded = true;
}

restoreAppState();

// for page provider
browser.runtime.onConnect.addListener((port) => {
  if (!port.sender?.tab) {
    return;
  }

  const pm = new PortMessage(port);

  pm.listen(async (data) => {
    if (!appStoreLoaded) {
      throw ethErrors.provider.disconnected();
    }

    const sessionId = port.sender?.tab?.id;
    const session = sessionService.getOrCreateSession(sessionId);

    const req = { data, session };
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
