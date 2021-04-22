import * as ethUtil from 'ethereumjs-util';
import KeyringService from './eth-keyring-controller';
import { addHexPrefix } from 'background/utils';
import { storage } from 'background/webapi';

class Eth {
  constructor() {
    this.initKeyring();
  }

  setPassword = (password) => {
    this.password = password;
  }

  initKeyring = async () => {
    const initState = await storage.get('keyringState');

    this.keyringService = new KeyringService({
      initState,
    });

    this.keyringService.store.subscribe((value) =>
      storage.set('keyringState', value)
    );
  };

  getAccount = async () => {
    const [account] = await this.getAccounts();

    return account;
  };

  getAccounts = () => this.keyringService.getAccounts();

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

  signPersonalMessage = (data) =>
    this.keyringService.signPersonalMessage(data);

  isUnlocked = () => this.keyringService.memStore.getState().isUnlocked;

  submitPassword = (password) =>
    this.keyringService.submitPassword(password);

  createNewVaultAndKeychain = () =>
    this.keyringService.createNewVaultAndKeychain(this.password);

  getCurrentMnemonics = async () => {
    const primaryKeyring = this.keyringService.getKeyringsByType(
      'HD Key Tree'
    )[0];
    if (!primaryKeyring) {
      throw new Error('No HD Key Tree found');
    }

    const serialized = await primaryKeyring.serialize();
    const seedWords = serialized.mnemonic;

    return seedWords;
  };

  lockWallet = () => this.keyringService.setLocked();
  clearKeyrings = () => this.keyringService.clearKeyrings();
  getAllTypedAccounts = () => this.keyringService.getAllTypedAccounts();

  addNewAccount = () => {
    const primaryKeyring = this.keyringService.getKeyringsByType(
      'HD Key Tree',
    )[0];
    if (!primaryKeyring) {
      throw new Error('MetamaskController - No HD Key Tree found');
    }
    return this.keyringService.addNewAccount(primaryKeyring);
  }
}

export default new Eth();
