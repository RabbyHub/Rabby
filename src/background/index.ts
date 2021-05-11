import { browser } from 'webextension-polyfill-ts';
import { Message } from 'utils';
import { permission, preference, session } from './service';
import { providerController, walletController } from './controller';

const { PortMessage } = Message;

permission.init();
preference.init();

browser.runtime.onConnect.addListener((port) => {
  if (!port.sender?.tab) {
    return;
  }

  const pm = new PortMessage(port);

  pm.listen((req) => {
    const sessionId = port.sender?.tab?.id;
    req.session = session.getSession(sessionId);

    // for background push to respective page
    req.session.pushMessage = (event, data) => {
      pm.send('message', { event, data });
    };

    return providerController(req);
  });
});

// for popup
window.wallet = walletController;
