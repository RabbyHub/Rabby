import { addHexPrefix } from 'ethereumjs-util';
import EventEmitter from 'events';
import { t } from 'i18next';
import { isAddress } from 'web3-utils';

export const keyringType = 'CoboArgus';

interface DeserializeOption {
  accounts?: string[];
  accountDetails?: Record<string, AccountDetail>;
}

interface AccountDetail {
  address: string;
  safeModules: {
    address: string;
    networkId: string;
  }[];
}

interface SignTransactionOptions {
  signatures: string[];
  provider: any;
}

export default class CoboArgusKeyring extends EventEmitter {
  static type = keyringType;
  type = keyringType;
  accounts: string[] = [];
  accountDetails: Record<string, AccountDetail> = {};
  accountToAdd: string | null = null;

  constructor(options: DeserializeOption = {}) {
    super();
    this.deserialize(options);
  }

  deserialize(opts: DeserializeOption) {
    if (opts.accounts) {
      this.accounts = opts.accounts;
    }

    if (opts.accountDetails) {
      this.accountDetails = opts.accountDetails;
    }
  }

  serialize() {
    return Promise.resolve({
      accounts: this.accounts,
      accountDetails: this.accountDetails,
    });
  }

  setAccountToAdd = (account: string) => {
    this.accountToAdd = account;
  };

  async getAccounts() {
    return this.accounts;
  }

  setAccountDetail = (address: string, accountDetail: AccountDetail) => {
    this.accountDetails = {
      ...this.accountDetails,
      [address.toLowerCase()]: accountDetail,
    };
  };

  getAccountDetail = (address: string) => {
    return this.accountDetails[address.toLowerCase()];
  };

  addAccounts = async () => {
    if (!this.accountToAdd) throw new Error('There is no address to add');
    if (!isAddress(this.accountToAdd)) {
      throw new Error("The address you're are trying to import is invalid");
    }
    const prefixedAddress = addHexPrefix(this.accountToAdd);

    if (
      this.accounts.find(
        (acct) => acct.toLowerCase() === prefixedAddress.toLowerCase()
      )
    ) {
      const error = new Error(
        JSON.stringify({
          address: prefixedAddress,
          anchor: 'DuplicateAccountError',
        })
      );
      throw error;
    }

    this.accounts.push(prefixedAddress.toLowerCase());

    return [prefixedAddress];
  };

  removeAccount(address: string): void {
    this.accounts = this.accounts.filter(
      (account) => account.toLowerCase() !== address.toLowerCase()
    );
  }

  async signTransaction(
    address: string,
    transaction,
    opts: SignTransactionOptions
  ) {
    console.log(address, transaction, opts);
  }

  signTypedData() {
    throw new Error('not support in Cobo Safe');
  }

  signPersonalMessage() {
    throw new Error('not support in Cobo Safe');
  }
}
