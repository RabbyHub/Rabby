import { Message } from 'helper';
import eth from 'background/eth';
import { approval, permission, preference, innerRequest } from 'background/wallet';
import { Flow } from 'background/request';

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

  console.log('handler', method, req)
  if (innerRequest[method]) {
    return innerRequest[method](req);
  }

  return new Flow().handle(req);
}

// const connectedPorts = new Map();

chrome.runtime.onConnect.addListener((port) => {
  // notify to pages
  // connectedPorts.set(port.sender.tab.id, new PortMessage(port).listen(handleRequest));
  new PortMessage(port).listen(handlePageRequest);
});


// for popup
window.eth = {
  // state
  getApproval: approval.getApproval,
  handleApproval: approval.handleApproval,
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
