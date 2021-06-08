// https://github.com/MetaMask/eth-simple-keyring#the-keyring-class-protocol
import { EventEmitter } from 'events';
import { ethErrors } from 'eth-rpc-errors';
import { isAddress } from 'web3-utils';
import { addHexPrefix } from 'ethereumjs-util';

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
    if (!isAddress(this.accountToAdd)) {
      throw new Error("The account you're are trying to import is a invalid");
    }
    const prefixedAddress = addHexPrefix(this.accountToAdd);

    if (
      this.accounts
        .map((x) => x.toLowerCase())
        .includes(prefixedAddress.toLowerCase())
    ) {
      throw new Error("The account you're are trying to import is a duplicate");
    }

    this.accounts.push(prefixedAddress);

    return [prefixedAddress];
  };

  // pull the transaction current state, then resolve or reject
  async signTransaction(address, transaction) {
    throw ethErrors.provider.userRejectedRequest();
  }

  async signPersonalMessage(withAccount: string, message: string) {
    throw ethErrors.provider.userRejectedRequest();
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
