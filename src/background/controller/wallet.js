import {
  eth,
  preference,
  notification,
  permission,
  session,
  account,
} from 'background/service';

class Wallet {
  setPassword = (password) => {
    eth.password = password;
  };

  getAccount = () => account.getAccount();

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

    const currentSession = session.getSession(tabId);
    if (currentSession) {
      // just test, should be all broadcast
      session.broadcastEvent(
        'accountsChanged',
        [account],
        currentSession.origin
      );
    }
  };

  clearStorage = () => {
    chrome.storage.local.clear();
  };

  connectHardware = async (type) => {
    const keyring = await eth.getOrCreateHardwareKeyring(type);

    return {
      getFirstPage: keyring.getFirstPage.bind(keyring),
      getNextPage: keyring.getNextPage.bind(keyring),
      getPreviousPage: keyring.getPreviousPage.bind(keyring),
    };
  };

  unlockHardwareAccount = async (type, indexes) => {
    const account = await eth.unlockHardwareAccount(type, indexes);
    preference.setCurrentAccount(account);
    session.broadcastEvent('accountsChanged', account);
  };

  setPopupOpen = (isOpen) => {
    preference.setPopupOpen(isOpen);
  }
}

export default new Wallet();
