import * as ethUtil from 'ethereumjs-util';
import Wallet, { thirdparty } from 'ethereumjs-wallet';
import { ethErrors } from 'eth-rpc-errors';
import * as bip39 from 'bip39';
import {
  keyringService,
  preferenceService,
  notificationService,
  permissionService,
  sessionService,
  chainService,
  openapiService,
} from 'background/service';
import { openIndexPage } from 'background/webapi/tab';
import { KEYRING_CLASS, DisplayedKeryring } from 'background/service/keyring';
import { addHexPrefix } from 'background/utils';
import BaseController from './base';
import { CHAINS_ENUM, CHAINS } from 'consts';
import { Account } from '../service/preference';
import { ConnectedSite } from '../service/permission';

export class WalletController extends BaseController {
  openapi = openapiService;

  /* wallet */
  boot = (password) => keyringService.boot(password);
  isBooted = () => keyringService.isBooted();
  verifyPassword = (password: string) =>
    keyringService.verifyPassword(password);

  getApproval = notificationService.getApproval;
  resolveApproval = notificationService.resolveApproval;
  rejectApproval = notificationService.rejectApproval;

  unlock = (password: string) => keyringService.submitPassword(password);
  isUnlocked = () => keyringService.memStore.getState().isUnlocked;
  lockWallet = () => {
    keyringService.setLocked();
    sessionService.broadcastEvent('disconnect');
  };
  setPopupOpen = (isOpen) => {
    preferenceService.setPopupOpen(isOpen);
  };
  openIndexPage = openIndexPage;

  getAddressBalance = async (address: string) => {
    const data = await openapiService.getTotalBalance(address);
    preferenceService.updateAddressBalance(address, data);
    return data;
  };
  getAddressCacheBalance = (address: string | undefined) => {
    if (!address) return null;
    return preferenceService.getAddressBalance(address);
  };

  /* chains */
  getSupportChains = () => chainService.getSupportChains();
  getEnableChains = () => chainService.getEnabledChains();
  enableChain = (id: CHAINS_ENUM) => chainService.enableChain(id);
  disableChain = (id: CHAINS_ENUM) => chainService.disableChain(id);

  /* connectedSites */

  getConnectedSite = permissionService.getConnectedSite;
  getConnectedSites = permissionService.getConnectedSites;
  getRecentConnectedSites = permissionService.getRecentConnectSites;
  getCurrentConnectedSite = (tabId: number) => {
    const { origin } = sessionService.getSession(tabId) || {};
    return permissionService.getWithoutUpdate(origin);
  };
  updateConnectSite = (origin: string, data: ConnectedSite) => {
    permissionService.updateConnectSite(origin, data);
    sessionService.broadcastEvent(
      'chainChanged',
      {
        chain: CHAINS[data.chain].hex,
        networkVersion: CHAINS[data.chain].network,
      },
      data.origin
    );
  };
  removeConnectedSite = permissionService.removeConnectedSite;
  getSitesByDefaultChain = permissionService.getSitesByDefaultChain;

  /* keyrings */

  clearKeyrings = () => keyringService.clearKeyrings();

  importWatchAddress = async (address) => {
    let keyring;
    const keyringType = KEYRING_CLASS.WATCH;
    try {
      keyring = this._getKeyringByType(keyringType);
    } catch {
      keyring = await keyringService.addNewKeyring(keyringType);
    }

    keyring.setAccountToAdd(address);
    await keyringService.addNewAccount(keyring);
    return this._setCurrentAccountFromKeyring(keyring);
  };

  importPrivateKey = async (data) => {
    const prefixed = addHexPrefix(data);
    const buffer = ethUtil.toBuffer(prefixed);

    if (!ethUtil.isValidPrivate(buffer)) {
      throw new Error('Cannot import invalid private key.');
    }

    const privateKey = ethUtil.stripHexPrefix(prefixed);
    const keyring = await keyringService.importPrivateKey(privateKey);
    return this._setCurrentAccountFromKeyring(keyring);
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
    const keyring = await keyringService.importPrivateKey(
      ethUtil.stripHexPrefix(privateKey)
    );
    return this._setCurrentAccountFromKeyring(keyring);
  };

  generateMnemonic = () => keyringService.generateMnemonic();
  createKeyringWithMnemonics = async (mnemonic) => {
    const keyring = await keyringService.createKeyringWithMnemonics(mnemonic);
    return this._setCurrentAccountFromKeyring(keyring);
  };

  getHiddenAddresses = () => preferenceService.getHiddenAddresses();
  showAddress = (type: string, address: string) =>
    preferenceService.showAddress(type, address);
  hideAddress = (type: string, address: string) => {
    preferenceService.hideAddress(type, address);
    const current = preferenceService.getCurrentAccount();
    if (current?.address === address && current.type === type) {
      this.resetCurrentAccount();
    }
  };

  removeAddress = (address: string, type: string) => {
    keyringService.removeAccount(address, type);
    const current = preferenceService.getCurrentAccount();
    if (current?.address === address && current.type === type) {
      this.resetCurrentAccount();
    }
  };

  resetCurrentAccount = async () => {
    const [account] = await this.getAccounts();
    if (account) {
      preferenceService.setCurrentAccount(account);
    }
  };

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

  deriveNewAccountFromMnemonic = async () => {
    const keyring = this._getKeyringByType(KEYRING_CLASS.MNEMONIC);

    const accounts = await keyringService.addNewAccount(keyring);
    preferenceService.setCurrentAccount({
      address: accounts[0],
      type: keyring.type,
    });

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
    preferenceService.setCurrentAccount(account);

    const currentSession = sessionService.getSession(tabId);
    if (currentSession) {
      sessionService.broadcastEvent('accountsChanged', [account.address]);
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
    preferenceService.setCurrentAccount({
      address: account,
      type: keyring.type,
    });
    sessionService.broadcastEvent('accountsChanged', account);
  };

  private _getKeyringByType(type) {
    const keyring = keyringService.getKeyringsByType(type)[0];

    if (keyring) {
      return keyring;
    }

    throw ethErrors.rpc.internal(`No ${type} keyring found`);
  }

  private async _setCurrentAccountFromKeyring(keyring) {
    const [account] = await keyring.getAccounts();

    const _account = {
      address: account,
      type: keyring.type,
    };
    preferenceService.setCurrentAccount(_account);

    return [_account];
  }
}

export default new WalletController();
