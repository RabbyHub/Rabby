import * as ethUtil from 'ethereumjs-util';
import Wallet, { thirdparty } from 'ethereumjs-wallet';
import KeyringService from './eth-keyring-controller';
import TrezorKeyring from './eth-trezor-keyring';
import LedgerBridgeKeyring from '@metamask/eth-ledger-bridge-keyring';
import { ethErrors } from 'eth-rpc-errors';
import { addHexPrefix } from 'background/utils';
import { storage } from 'background/webapi';
import { noop } from 'ui/utils';

const KEYRING_TYPE = {
  mnemonic: 'HD Key Tree',
  trezor: TrezorKeyring.type,
  ledger: LedgerBridgeKeyring.type,
};

class Eth {
  constructor() {
    this.initKeyringService();
  }

  password = '';

  keyringService: any;

  setPassword = (password) => {
    this.password = password;
  };

  initKeyringService = async () => {
    const initState = await storage.get('keyringState');

    this.keyringService = new KeyringService({
      keyringTypes: [TrezorKeyring, LedgerBridgeKeyring],
      initState,
    });

    this.keyringService.store.subscribe((value) =>
      storage.set('keyringState', value)
    );
  };

  signTransaction = (tx, from) => {
    return this.keyringService.signTransaction(tx, from);
  };

  importKey = async (data) => {
    const prefixed = addHexPrefix(data);
    const buffer = ethUtil.toBuffer(prefixed);

    if (!ethUtil.isValidPrivate(buffer)) {
      throw new Error('Cannot import invalid private key.');
    }

    const privateKey = ethUtil.stripHexPrefix(prefixed);
    return this.keyringService.createNewVaultAndSimpleKeyring(
      this.password,
      privateKey
    );
  };

  // json forumla is from "https://github.com/SilentCicero/ethereumjs-accounts"
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
    return this.keyringService.createNewVaultAndSimpleKeyring(
      this.password,
      ethUtil.stripHexPrefix(privateKey)
    );
  };

  importMnemonics = (seed) =>
    this.keyringService.createNewVaultAndRestore(this.password, seed);

  signPersonalMessage = (data) => this.keyringService.signPersonalMessage(data);

  isUnlocked = () => this.keyringService.memStore.getState().isUnlocked;

  unlock = async (password) => {
    await this.keyringService.submitPassword(password);

    this.password = password;
  };

  getAccounts = noop;

  getKeyringByType = (type) => {
    const keyring = this.keyringService.getKeyringsByType(type)[0];

    if (keyring) {
      return keyring;
    }

    throw ethErrors.rpc.internal(`No ${type} keyring found`);
  };

  createNewVaultAndKeychain = () =>
    this.keyringService.createNewVaultAndKeychain(this.password);

  getCurrentMnemonics = async () => {
    const keyring = this.getKeyringByType(KEYRING_TYPE.mnemonic);
    const serialized = await keyring.serialize();
    const seedWords = serialized.mnemonic;

    return seedWords;
  };

  lockWallet = () => this.keyringService.setLocked();
  clearKeyrings = () => this.keyringService.clearKeyrings();
  getAllTypedAccounts = () => this.keyringService.getAllTypedAccounts();

  addNewAccount = () => {
    const keyring = this.getKeyringByType(KEYRING_TYPE.mnemonic);

    return this.keyringService.addNewAccount(keyring);
  };

  getOrCreateHardwareKeyring = async (type) => {
    let keyring;
    try {
      keyring = this.getKeyringByType(KEYRING_TYPE[type]);
    } catch {
      keyring = await this.keyringService.addNewKeyring(KEYRING_TYPE[type]);
    }

    return keyring;
  };

  unlockHardwareAccount = async (type, indexes) => {
    const keyring = this.getKeyringByType(KEYRING_TYPE[type]);

    for (let i = 0; i < indexes.length; i++) {
      keyring.setAccountToUnlock(indexes[i]);
      await this.keyringService.addNewAccount(keyring);
    }

    return keyring.accounts[keyring.accounts.length - 1];
  };
}

export default new Eth();
