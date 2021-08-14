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
  pageStateCacheService,
} from 'background/service';
import { openIndexPage } from 'background/webapi/tab';
import { CacheState } from 'background/service/pageStateCache';
import i18n from 'background/service/i18n';
import { KEYRING_CLASS, DisplayedKeryring } from 'background/service/keyring';
import BaseController from './base';
import { CHAINS_ENUM, CHAINS } from 'consts';
import { Account } from '../service/preference';
import { ConnectedSite } from '../service/permission';
import DisplayKeyring from '../service/keyring/display';

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

  unlock = async (password: string) => {
    await keyringService.submitPassword(password);
    sessionService.broadcastEvent('unlock');
  };
  isUnlocked = () => keyringService.memStore.getState().isUnlocked;

  lockWallet = async () => {
    await keyringService.setLocked();
    sessionService.broadcastEvent('accountsChanged', []);
    sessionService.broadcastEvent('lock');
  };
  setPopupOpen = (isOpen) => {
    preferenceService.setPopupOpen(isOpen);
  };
  openIndexPage = openIndexPage;

  hasPageStateCache = () => pageStateCacheService.has();
  getPageStateCache = () => {
    if (!this.isUnlocked()) return null;
    return pageStateCacheService.get();
  };
  clearPageStateCache = () => pageStateCacheService.clear();
  setPageStateCache = (cache: CacheState) => pageStateCacheService.set(cache);

  getAddressBalance = async (address: string) => {
    const data = await openapiService.getTotalBalance(address);
    preferenceService.updateAddressBalance(address, data);
    return data;
  };
  getAddressCacheBalance = (address: string | undefined) => {
    if (!address) return null;
    return preferenceService.getAddressBalance(address);
  };

  setHasOtherProvider = (val: boolean) =>
    preferenceService.setHasOtherProvider(val);
  getHasOtherProvider = () => preferenceService.getHasOtherProvider();

  getExternalLinkAck = () => preferenceService.getExternalLinkAck();

  setExternalLinkAck = (ack) => preferenceService.setExternalLinkAck(ack);

  getLocale = () => preferenceService.getLocale();
  setLocale = (locale: string) => preferenceService.setLocale(locale);

  /* chains */
  getSupportChains = () => chainService.getSupportChains();
  getEnableChains = () => chainService.getEnabledChains();
  enableChain = (id: CHAINS_ENUM) => chainService.enableChain(id);
  disableChain = (id: CHAINS_ENUM) => chainService.disableChain(id);

  /* connectedSites */

  getConnectedSite = permissionService.getConnectedSite;
  getConnectedSites = permissionService.getConnectedSites;
  getRecentConnectedSites = () => {
    const max = 12;
    let list: (ConnectedSite | null)[] = permissionService.getRecentConnectSites(
      max
    );
    if (list.length < max) {
      list = [...list, ...Array(max - list.length).fill(null)];
    }
    return list;
  };
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
  removeConnectedSite = (origin: string) => {
    sessionService.broadcastEvent('accountsChanged', [], origin);
    permissionService.removeConnectedSite(origin);
  };
  getSitesByDefaultChain = permissionService.getSitesByDefaultChain;
  topConnectedSite = (origin: string) =>
    permissionService.topConnectedSite(origin);
  unpinConnectedSite = (origin: string) =>
    permissionService.unpinConnectedSite(origin);
  /* keyrings */

  clearKeyrings = () => keyringService.clearKeyrings();

  importWatchAddress = async (address) => {
    let keyring, isNewKey;
    const keyringType = KEYRING_CLASS.WATCH;
    try {
      keyring = this._getKeyringByType(keyringType);
    } catch {
      const WatchKeyring = keyringService.getKeyringClassForType(keyringType);
      keyring = new WatchKeyring();
      isNewKey = true;
    }

    keyring.setAccountToAdd(address);
    await keyringService.addNewAccount(keyring);
    if (isNewKey) {
      await keyringService.addKeyring(keyring);
    }
    return this._setCurrentAccountFromKeyring(keyring, -1);
  };

  getPrivateKey = async (
    password: string,
    { address, type }: { address: string; type: string }
  ) => {
    await this.verifyPassword(password);
    const keyring = await keyringService.getKeyringForAccount(address, type);
    if (!keyring) return null;
    return await keyring.exportAccount(address);
  };

  getMnemonics = async (password: string) => {
    await this.verifyPassword(password);
    const keyring = this._getKeyringByType(KEYRING_CLASS.MNEMONIC);
    const serialized = await keyring.serialize();
    const seedWords = serialized.mnemonic;

    return seedWords;
  };

  importPrivateKey = async (data) => {
    const privateKey = ethUtil.stripHexPrefix(data);
    const buffer = Buffer.from(privateKey, 'hex');

    const error = new Error(i18n.t('the private key is invalid'));
    try {
      if (!ethUtil.isValidPrivate(buffer)) {
        throw error;
      }
    } catch {
      throw error;
    }

    const keyring = await keyringService.importPrivateKey(privateKey);
    return this._setCurrentAccountFromKeyring(keyring);
  };

  // json format is from "https://github.com/SilentCicero/ethereumjs-accounts"
  // or "https://github.com/ethereum/wiki/wiki/Web3-Secret-Storage-Definition"
  // for example: https://www.myetherwallet.com/create-wallet
  importJson = async (content: string, password: string) => {
    try {
      JSON.parse(content);
    } catch {
      throw new Error(i18n.t('the input file is invalid'));
    }

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

  getPreMnemonics = () => keyringService.getPreMnemonics();
  generatePreMnemonic = () => keyringService.generatePreMnemonic();
  removePreMnemonics = () => keyringService.removePreMnemonics();
  createKeyringWithMnemonics = async (mnemonic) => {
    const keyring = await keyringService.createKeyringWithMnemonics(mnemonic);
    keyringService.removePreMnemonics();
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

  removeAddress = async (address: string, type: string) => {
    await keyringService.removeAccount(address, type);
    preferenceService.removeAddressBalance(address);
    const current = preferenceService.getCurrentAccount();
    if (current?.address === address && current.type === type) {
      this.resetCurrentAccount();
    }
  };

  resetCurrentAccount = async () => {
    const [account] = await this.getAccounts();
    if (account) {
      preferenceService.setCurrentAccount(account);
    } else {
      preferenceService.setCurrentAccount(null);
    }
  };

  generateKeyringWithMnemonic = (mnemonic) => {
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error(i18n.t('mnemonic phrase is invalid'));
    }

    const Keyring = keyringService.getKeyringClassForType(
      KEYRING_CLASS.MNEMONIC
    );

    return new Keyring({ mnemonic });
  };

  addKeyring = async (keyring) => {
    await keyringService.addKeyring(keyring);
    this._setCurrentAccountFromKeyring(keyring);
  };

  getKeyringByType = (type: string) => keyringService.getKeyringByType(type);

  checkHasMnemonic = () => {
    try {
      const keyring = this._getKeyringByType(KEYRING_CLASS.MNEMONIC);
      return !!keyring.mnemonic;
    } catch (e) {
      return false;
    }
  };

  deriveNewAccountFromMnemonic = async () => {
    const keyring = this._getKeyringByType(KEYRING_CLASS.MNEMONIC);

    await keyringService.addNewAccount(keyring);
    this._setCurrentAccountFromKeyring(keyring, -1);
  };

  getAccountsCount = async () => {
    const accounts = await keyringService.getAccounts();
    return accounts.filter((x) => x).length;
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
      result[type].push({
        ...account,
        keyring: new DisplayKeyring(account.keyring),
      });
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
      result[type].push({
        ...account,
        keyring: new DisplayKeyring(account.keyring),
      });
    }

    return result;
  };

  changeAccount = (account: Account) => {
    preferenceService.setCurrentAccount(account);
  };

  isUseLedgerLive = () => preferenceService.isUseLedgerLive();

  updateUseLedgerLive = async (value: boolean) =>
    preferenceService.updateUseLedgerLive(value);

  connectHardware = (type, hdPath?: string) => {
    let keyring;
    const keyringType = KEYRING_CLASS.HARDWARE[type];
    try {
      keyring = this._getKeyringByType(keyringType);
    } catch {
      const Keyring = keyringService.getKeyringClassForType(keyringType);
      keyring = new Keyring();
    }

    if (hdPath && keyring.setHdPath) {
      keyring.setHdPath(hdPath);
    }

    return keyring;
  };

  unlockHardwareAccount = async (keyring, indexes) => {
    let hasKeyring = false;
    try {
      hasKeyring = !!this._getKeyringByType(keyring.type);
    } catch (e) {
      // NOTHING
    }
    if (!hasKeyring) {
      await keyringService.addKeyring(keyring);
    }
    for (let i = 0; i < indexes.length; i++) {
      keyring.setAccountToUnlock(indexes[i]);
      await keyringService.addNewAccount(keyring);
    }

    return this._setCurrentAccountFromKeyring(keyring);
  };

  getWatchAddressPreference = (address: string) =>
    preferenceService.getWatchAddressPreference(address);

  setWatchAddressPreference = preferenceService.setWatchAddressPreference;

  private _getKeyringByType(type) {
    const keyring = keyringService.getKeyringsByType(type)[0];

    if (keyring) {
      return keyring;
    }

    throw ethErrors.rpc.internal(`No ${type} keyring found`);
  }

  private async _setCurrentAccountFromKeyring(keyring, index = 0) {
    const accounts = await keyring.getAccounts();
    const account = accounts[index < 0 ? index + accounts.length : index];

    if (!account) {
      throw new Error('the current account is empty');
    }

    const _account = {
      address: account,
      type: keyring.type,
    };
    preferenceService.setCurrentAccount(_account);

    return [_account];
  }
}

export default new WalletController();
