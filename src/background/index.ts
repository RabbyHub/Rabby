import { Message } from 'utils';
import { permission, preference, session } from './service';
import { providerController, walletController } from './controller';

const { PortMessage } = Message;

permission.init();
preference.init();

chrome.runtime.onConnect.addListener((port) => {
  if (!port?.sender?.tab) {
    return;
  }
  const pm = new PortMessage(port);

  pm.listen((req) => {
    if (!port?.sender?.tab) return
    const sessionId = port.sender.tab.id;
    // TODO: FIXME
    req.session = session.createSession(sessionId, null);

    // for background push to respective page
    req.session.pushMessage = (event, data) => {
      pm.send('message', { event, data });
    };

    return providerController(req);
  });
});

// for popup
window.wallet = walletController;
