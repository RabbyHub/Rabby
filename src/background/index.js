import { Message } from 'helper';
import { notification, permission, preference } from 'background/service';
import { providerController, walletController } from 'background/controller';
import { Tab } from 'background/utils/webapi';

const { PortMessage } = Message;

const initialize = async () => {
  await permission.init();
  await preference.init();
};

initialize().catch((err) => {
  console.log(err);
});

chrome.runtime.onConnect.addListener((port) => {
  Tab.fromId(port.sender.tab.id)
    .on('removed', (id) => notification.clear(id))
    .on('updated', (id) => notification.clear(id));

  new PortMessage(port).listen(providerController);
});

console.log('walletController', walletController)

// for popup
window.wallet = walletController;
