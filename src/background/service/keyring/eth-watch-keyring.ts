// https://github.com/MetaMask/eth-simple-keyring#the-keyring-class-protocol
import { EventEmitter } from 'events';

const keyringType = 'Watch Address';

class WatchKeyring extends EventEmitter {
  static type = keyringType;
  type = keyringType;
  accounts: string[] = [];

  constructor(opts = {}) {
    super();
    this.deserialize(opts);
  }

  serialize() {
    return Promise.resolve({
      accounts: this.accounts,
    });
  }

  deserialize(opts) {
    this.accounts = opts.accounts;
  }

  // just generate a qrcode
  signTransaction(address, transaction) {}

  signMessage(address, data) {}

  getAccounts(): Promise<string[]> {
    return Promise.resolve(this.accounts.slice());
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
