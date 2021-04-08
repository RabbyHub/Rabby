import KeyringController from './eth-keyring-controller';
import * as ethUtil from 'ethereumjs-util';
import { addHexPrefix } from 'background/helper';
import { storage } from 'background/webapi';

class Eth {
  constructor(password = '12345678') {
    this.password = password;
    this.initKeyringController();
  }

  initKeyringController = async () => {
    const initState = await storage.get('keyringState');

    this.keyringController = new KeyringController({
      initState
    });

    this.keyringController.store.subscribe((value) => storage.set('keyringState', value))
  }

  getAccount = async () => {
    const [account] = await this.getAccounts();

    return account;
  }

  getAccounts = () => this.keyringController.getAccounts();

  signTransaction = (tx, from) => {
    console.log('----signTransaction-----')
    console.log(tx, from)

    return this.keyringController.signTransaction(tx, from);
  };

  importKey = async (data) => {
    const prefixed = addHexPrefix(data);
    const buffer = ethUtil.toBuffer(prefixed);

    if (!ethUtil.isValidPrivate(buffer)) {
      throw new Error('Cannot import invalid private key.');
    }

    const privateKey = ethUtil.stripHexPrefix(prefixed);
    return this.keyringController.createNewVaultAndSimpleKeyring(this.password, privateKey);
  }

  signPersonalMessage = (data) => this.keyringController.signPersonalMessage(data);

  isUnlocked = () => this.keyringController.memStore.getState().isUnlocked;

  submitPassword = (password) => this.keyringController.submitPassword(password);
}

export default new Eth();
