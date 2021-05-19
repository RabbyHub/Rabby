import * as ethUtil from 'ethereumjs-util';
import Wallet, { thirdparty } from 'ethereumjs-wallet';
import { ethErrors } from 'eth-rpc-errors';
import * as bip39 from 'bip39';
import {
  keyringService,
  preference,
  notification,
  permission,
  session,
  chainService,
} from 'background/service';
import { openIndexPage } from 'background/webapi/tab';
import { KEYRING_CLASS, DisplayedKeryring } from 'background/service/keyring';
import { addHexPrefix } from 'background/utils';
import BaseController from './base';
import { CHAINS_ENUM } from 'consts';
import { Account } from '../service/preference';

export class WalletController extends BaseController {
  /* wallet */
  boot = (password) => keyringService.boot(password);
  isBooted = () => keyringService.isBooted();
  verifyPassword = (password: string) =>
    keyringService.verifyPassword(password);

  getApproval = notification.getApproval;
  resolveApproval = notification.resolveApproval;
  rejectApproval = notification.rejectApproval;

  unlock = (password: string) => keyringService.submitPassword(password);
  isUnlocked = () => keyringService.memStore.getState().isUnlocked;
  lockWallet = () => {
    keyringService.setLocked();
    session.broadcastEvent('disconnect');
  };
  setPopupOpen = (isOpen) => {
    preference.setPopupOpen(isOpen);
  };
  openIndexPage = openIndexPage;

  /* chains */

  getEnableChains = () => chainService.getEnabledChains();
  enableChain = (id: CHAINS_ENUM) => chainService.enableChain(id);
  disableChain = (id: CHAINS_ENUM) => chainService.disableChain(id);

  /* connectedSites */

  getConnectedSites = permission.getConnectedSites;
  getRecentConnectedSites = permission.getRecentConnectSites;
  getCurrentConnectedSite = (tabId: number) => {
    const { origin } = session.getSession(tabId) || {};
    return permission.getWithoutUpdate(origin);
  };
  updateConnectSite = permission.updateConnectSite;
  removeConnectedSite = permission.removeConnectedSite;

  /* keyrings */

  clearKeyrings = () => keyringService.clearKeyrings();

  importPrivateKey = async (data) => {
    const prefixed = addHexPrefix(data);
    const buffer = ethUtil.toBuffer(prefixed);

    if (!ethUtil.isValidPrivate(buffer)) {
      throw new Error('Cannot import invalid private key.');
    }

    const privateKey = ethUtil.stripHexPrefix(prefixed);
    const keyring = await keyringService.importPrivateKey(privateKey);
    const [account] = await keyring.getAccounts();
    preference.setCurrentAccount({ address: account, type: keyring.type });
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

  generateMnemonic = () => keyringService.generateMnemonic();
  importMnemonics = async (mnemonic) => {
    const keyring = await keyringService.importMnemonics(mnemonic);
    const [account] = await keyring.getAccounts();
    preference.setCurrentAccount({ address: account, type: keyring.type });
  };

  getHiddenAddresses = () => preference.getHiddenAddresses();
  showAddress = (type: string, address: string) =>
    preference.showAddress(type, address);
  hideAddress = (type: string, address: string) =>
    preference.hideAddress(type, address);

  generateKeyringWithMnemonic = (mnemonic) => {
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error('mnemonic phrase is invalid.');
    }

    const Keyring = keyringService.getKeyringClassForType(
      KEYRING_CLASS.MNEMONIC
    );

    return new Keyring({ mnemonic });
  };

  addKeyring = (keyring) => keyringService.addKeyring(keyring);

  getCurrentMnemonics = async () => {
    const keyring = this._getKeyringByType(KEYRING_CLASS.MNEMONIC);
    const serialized = await keyring.serialize();
    const seedWords = serialized.mnemonic;

    return seedWords;
  };

  deriveNewAccount = async () => {
    const keyring = this._getKeyringByType(KEYRING_CLASS.MNEMONIC);

    const accounts = await keyringService.addNewAccount(keyring);
    preference.setCurrentAccount({ address: accounts[0], type: keyring.type });

    return accounts;
  };

  getAccountsCount = async () => {
    return await keyringService.keyrings.reduce(async (count, keyring) => {
      return count + (await keyring.getAccounts()).length;
    }, 0);
  };

  getTypedAccounts = async (type) => {
    return Promise.all(
      keyringService.keyrings
        .filter((keyring) => !type || keyring.type === type)
        .map((keyring) => keyringService.displayForKeyring(keyring))
    );
  };

  getAllVisibleAccounts: () => Promise<
    Record<string, DisplayedKeryring[]>
  > = async () => {
    const typedAccounts = await keyringService.getAllTypedVisibleAccounts();
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

  changeAccount = (account: Account, tabId: number | undefined) => {
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

  connectHardware = async (type, hdPath) => {
    let keyring;
    const keyringType = KEYRING_CLASS.HARDWARE[type];
    try {
      keyring = this._getKeyringByType(keyringType);
    } catch {
      keyring = await keyringService.addNewKeyring(keyringType);
    }

    if (hdPath && keyring.setHdPath) {
      keyring.setHdPath(hdPath);
    }

    return keyring;
  };

  unlockHardwareAccount = async (keyring, indexes) => {
    for (let i = 0; i < indexes.length; i++) {
      keyring.setAccountToUnlock(indexes[i]);
      await keyringService.addNewAccount(keyring);
    }

    const account = keyring.accounts[keyring.accounts.length - 1];
    preference.setCurrentAccount({ address: account, type: keyring.type });
    session.broadcastEvent('accountsChanged', account);
  };

  private _getKeyringByType(type) {
    const keyring = keyringService.getKeyringsByType(type)[0];

    if (keyring) {
      return keyring;
    }

    throw ethErrors.rpc.internal(`No ${type} keyring found`);
  }
}

export default new WalletController();
