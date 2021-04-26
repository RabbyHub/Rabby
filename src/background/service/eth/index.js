import * as ethUtil from 'ethereumjs-util';
import KeyringService from './eth-keyring-controller';
import TrezorKeyring from './eth-trezor-keyring';
import { ethErrors } from 'eth-rpc-errors';
import { addHexPrefix } from 'background/utils';
import { storage } from 'background/webapi';

// trezor: do read https://github.com/trezor/connect/blob/develop/src/js/plugins/webextension/README.md

const KEYRING_TYPE = {
  mnemonic: 'HD Key Tree',
  trezor: TrezorKeyring.type,
};

class Eth {
  constructor() {
    this.initKeyringService();
  }

  setPassword = (password) => {
    this.password = password;
  };

  initKeyringService = async () => {
    const initState = await storage.get('keyringState');

    this.keyringService = new KeyringService({
      keyringTypes: [TrezorKeyring],
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

  importMnemonics = (seed) =>
    this.keyringService.createNewVaultAndRestore(this.password, seed);

  signPersonalMessage = (data) => this.keyringService.signPersonalMessage(data);

  isUnlocked = () => this.keyringService.memStore.getState().isUnlocked;

  submitPassword = (password) => this.keyringService.submitPassword(password);

  getKeyringByType = (type) => {
    const keyring = this.keyringService.getKeyringsByType(type)[0];

    if (keyring) {
      return keyring;
    }

    throw new ethErrors.rpc.internal(`No ${type} keyring found`);
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
