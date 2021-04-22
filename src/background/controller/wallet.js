import {
  eth,
  preference,
  notification,
  permission,
  session,
} from 'background/service';

class Wallet {
  setPassword = (password) => {
    eth.password = password;
  };

  getAccount = () => {
    let pa = preference.getCurrentAccount();
    if (!pa) {
      pa = eth.getAccount();
      preference.setCurrentAccount(pa);
    }
    return pa;
  };

  getApproval = notification.getApproval;
  handleApproval = notification.handleApproval;
  isUnlocked = eth.isUnlocked;
  setPassword = eth.setPassword;
  submitPassword = eth.submitPassword;
  setup = preference.setup;
  isSetup = preference.isSetup;
  getConnectedSites = permission.getConnectedSites;
  removeConnectedSite = permission.removeConnectedSite;
  getCurrentMnemonics = eth.getCurrentMnemonics;
  createNewVaultAndKeychain = eth.createNewVaultAndKeychain;
  lockWallet = () => {
    eth.lockWallet();
    session.broadcastEvent('disconnect');
  };
  clearKeyrings = eth.clearKeyrings;

  importKey = eth.importKey;
  importMnemonics = eth.importMnemonics;
  getAccounts = eth.getAccounts;
  getAllTypedAccounts = eth.getAllTypedAccounts;
  addNewAccount = eth.addNewAccount;

  changeAccount = (account, tabId) => {
    preference.setCurrentAccount(account);

    const { origin } = session.getSession(tabId);
    // just test, should be all broadcast
    session.broadcastEvent('accountsChanged', [account], origin);
  };

  clearStorage = () => {
    chrome.storage.local.clear();
  };
}

export default new Wallet();
