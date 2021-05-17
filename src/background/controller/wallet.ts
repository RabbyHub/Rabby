import * as ethUtil from 'ethereumjs-util';
import Wallet, { thirdparty } from 'ethereumjs-wallet';
import { ethErrors } from 'eth-rpc-errors';
import {
  keyringService,
  preference,
  notification,
  permission,
  session,
} from 'background/service';
import { openIndexPage } from 'background/webapi/tab';
import { KEYRING_CLASS, DisplayedKeryring } from 'background/service/keyring';
import { addHexPrefix } from 'background/utils';
import BaseController from './base';

export class WalletController extends BaseController {
  boot = (password) => keyringService.boot(password);
  isBooted = () => keyringService.isBooted();

  getApproval = notification.getApproval;
  resolveApproval = notification.resolveApproval;
  rejectApproval = notification.rejectApproval;

  unlock = (password: string) => keyringService.submitPassword(password);
  isUnlocked = () => keyringService.memStore.getState().isUnlocked;
  lockWallet = () => {
    keyringService.setLocked();
    session.broadcastEvent('disconnect');
  };

  getConnectedSites = permission.getConnectedSites;
  getRecentConnectedSites = permission.getRecentConnectSites;
  getCurrentConnectedSite = (tabId: number) => {
    const { origin } = session.getSession(tabId) || {};
    return permission.getWithoutUpdate(origin);
  };
  updateConnectSite = permission.updateConnectSite;
  removeConnectedSite = permission.removeConnectedSite;

  generateMnemonic = () => keyringService.generateMnemonic();

  getCurrentMnemonics = async () => {
    const keyring = this._getKeyringByType(KEYRING_CLASS.MNEMONIC);
    const serialized = await keyring.serialize();
    const seedWords = serialized.mnemonic;

    return seedWords;
  };

  createNewVaultInMnenomic = () => keyringService.createNewVaultInMnenomic();
  clearKeyrings = () => keyringService.clearKeyrings();

  importPrivateKey = async (data) => {
    const prefixed = addHexPrefix(data);
    const buffer = ethUtil.toBuffer(prefixed);

    if (!ethUtil.isValidPrivate(buffer)) {
      throw new Error('Cannot import invalid private key.');
    }

    const privateKey = ethUtil.stripHexPrefix(prefixed);
    return keyringService.importPrivateKey(privateKey);
  };

  // json format is from "https://github.com/SilentCicero/ethereumjs-accounts"
  // or "https://github.com/ethereum/wiki/wiki/Web3-Secret-Storage-Definition"
  // for example: https://www.myetherwallet.com/create-wallet
  importJson = async (content: string, password: string) => {
    let wallet;
    try {
      wallet = thirdparty.fromEtherWallet(content, password);
    } catch (e) {
      wallet = await Wallet.fromV3(content, password, true);
    }

    const privateKey = wallet.getPrivateKeyString();
    return keyringService.importPrivateKey(ethUtil.stripHexPrefix(privateKey));
  };

  importMnemonics = async (seed) => {
    const account = await keyringService.importMnemonics(seed);
    preference.setCurrentAccount(account);
  };

  getAllClassAccounts: () => Promise<
    Record<string, DisplayedKeryring[]>
  > = async () => {
    const typedAccounts = await keyringService.getAllTypedAccounts();
    const result: Record<string, DisplayedKeryring[]> = {};
    const hardwareTypes = Object.values(KEYRING_CLASS.HARDWARE);

    for (const account of typedAccounts) {
      const type = hardwareTypes.includes(account.type)
        ? 'hardware'
        : account.type;

      result[type] = result[type] || [];
      result[type].push(account);
    }

    return result;
  };

  deriveNewAccount = () => {
    const keyring = this._getKeyringByType(KEYRING_CLASS.MNEMONIC);

    return keyringService.addNewAccount(keyring);
  };

  changeAccount = (account, tabId) => {
    preference.setCurrentAccount(account);

    const currentSession = session.getOrCreateSession(tabId);
    if (currentSession) {
      // just test, should be all broadcast
      session.broadcastEvent(
        'accountsChanged',
        [account],
        currentSession.origin
      );
    }
  };

  connectHardware = async (type) => {
    let keyring;
    try {
      keyring = this._getKeyringByType(KEYRING_CLASS.HARDWARE[type]);
    } catch {
      keyring = await keyringService.addNewKeyring(
        KEYRING_CLASS.HARDWARE[type]
      );
    }

    return {
      getFirstPage: keyring.getFirstPage.bind(keyring),
      getNextPage: keyring.getNextPage.bind(keyring),
      getPreviousPage: keyring.getPreviousPage.bind(keyring),
    };
  };

  unlockHardwareAccount = async (type, indexes) => {
    const keyring = this._getKeyringByType(KEYRING_CLASS.HARDWARE[type]);

    for (let i = 0; i < indexes.length; i++) {
      keyring.setAccountToUnlock(indexes[i]);
      await keyringService.addNewAccount(keyring);
    }

    const account = keyring.accounts[keyring.accounts.length - 1];
    preference.setCurrentAccount(account);
    session.broadcastEvent('accountsChanged', account);
  };

  setPopupOpen = (isOpen) => {
    preference.setPopupOpen(isOpen);
  };

  openIndexPage = openIndexPage;

  private _getKeyringByType(type) {
    const keyring = keyringService.getKeyringsByType(type)[0];

    if (keyring) {
      return keyring;
    }

    throw ethErrors.rpc.internal(`No ${type} keyring found`);
  }
}

export default new WalletController();
