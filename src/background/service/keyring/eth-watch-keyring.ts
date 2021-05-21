// https://github.com/MetaMask/eth-simple-keyring#the-keyring-class-protocol
import { EventEmitter } from 'events';

const keyringType = 'Watch Address';

class WatchKeyring extends EventEmitter {
  static type = keyringType;
  type = keyringType;
  accounts: string[] = [];
  accountToAdd = '';

  constructor(opts = {}) {
    super();
    this.deserialize(opts);
  }

  serialize() {
    return Promise.resolve({
      accounts: this.accounts,
    });
  }

  async deserialize(opts) {
    if (opts.accounts) {
      this.accounts = opts.accounts;
    }
  }

  setAccountToAdd = (account) => {
    this.accountToAdd = account;
  };

  addAccounts = async () => {
    if (!this.accountToAdd) {
      return;
    }
    if (this.accounts.includes(this.accountToAdd)) {
      throw new Error(`The account you're are trying to import is a duplicate`);
    }

    this.accounts.push(this.accountToAdd);

    return [this.accountToAdd];
  };

  // just generate a qrcode
  // signTransaction(address, transaction) {}

  signPersonalMessage(withAccount: string, message: string) {
    // TODO
  }

  async getAccounts(): Promise<string[]> {
    return this.accounts.slice();
  }

  removeAccount(address: string): void {
    if (
      !this.accounts.map((a) => a.toLowerCase()).includes(address.toLowerCase())
    ) {
      throw new Error(`Address ${address} not found in watch keyring`);
    }
    this.accounts = this.accounts.filter(
      (a) => a.toLowerCase() !== address.toLowerCase()
    );
  }
}

export default WatchKeyring;
