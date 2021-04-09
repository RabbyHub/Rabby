import { Message } from 'helper';
import eth from 'background/eth';
import { notification, permission, preference, innerRequest } from 'background/wallet';
import { Flow } from 'background/request';
import { Tab } from 'background/webapi';

const { PortMessage } = Message;

const initialize = async () => {
  await permission.init();
  await preference.init();
}

initialize().catch((err) => {
  console.log(err);
})

const handlePageRequest = async (req) => {
  const { data: { method } } = req;

  // console.log('handle', method, req)
  if (innerRequest[method]) {
    return innerRequest[method](req);
  }

  return new Flow().handle(req);
}

chrome.runtime.onConnect.addListener((port) => {
  Tab.fromId(port.sender.tab.id)
  .on('removed', (id) => notification.clear(id))
  .on('updated', (id) => notification.clear(id));

  new PortMessage(port).listen(handlePageRequest);
});


// for popup
window.eth = {
  // state
  getApproval: notification.getApproval,
  handleApproval: notification.handleApproval,
  isUnlocked: eth.isUnlocked,
  submitPassword: eth.submitPassword,
  hasVault: preference.hasVault,
  getConnectedSites: permission.getConnectedSites,
  removeConnectedSite: permission.removeConnectedSite,

  // wallet
  importKey: eth.importKey,
  getAccount: eth.getAccount,
  getAccounts: eth.getAccounts,
};
