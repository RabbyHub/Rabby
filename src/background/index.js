import { Message } from 'utils';
import { permission, preference, session } from 'background/service';
import { providerController, walletController } from 'background/controller';

const { PortMessage } = Message;

permission.init();
preference.init();

chrome.runtime.onConnect.addListener((port) => {
  const pm = new PortMessage(port);

  pm.listen((req) => {
    req.session = session.getSession(port.sender.tab.id);

    // for background push to respective page
    req.session.pushMessage = (event, data) =>
      pm.send('message', { event, data });
    return providerController(req);
  });
});

// for popup
window.wallet = walletController;
