import { browser } from 'webextension-polyfill-ts';
import {
  eth,
  preference,
  notification,
  permission,
  session,
  account,
} from 'background/service';
import { openIndex } from 'background/webapi/tab';

export class Wallet {
  getAccount = () => account.getAccount();

  getApproval = notification.getApproval;
  resolveApproval = notification.resolveApproval;
  rejectApproval = notification.rejectApproval;
  isUnlocked = eth.isUnlocked;

  setPassword = (password: string) => {
    eth.setPassword(password);
    preference.setup();
  };

  unlock = eth.unlock;

  isSetup = preference.isSetup;
  getConnectedSites = permission.getConnectedSites;
  getRecentConnectedSites = permission.getRecentConnectSites;
  getCurrentConnectedSite = (tabId: number) => {
    const { origin } = session.getSession(tabId);
    return permission.getWithoutUpdate(origin);
  };
  removeConnectedSite = permission.removeConnectedSite;
  getCurrentMnemonics = eth.getCurrentMnemonics;
  createNewVaultAndKeychain = eth.createNewVaultAndKeychain;
  lockWallet = () => {
    eth.lockWallet();
    session.broadcastEvent('disconnect');
  };
  clearKeyrings = eth.clearKeyrings;

  importKey = eth.importKey;
  importJson = eth.importJson;
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
    browser.storage.local.clear();
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
  };

  openIndex = openIndex;
}

export default new Wallet();
