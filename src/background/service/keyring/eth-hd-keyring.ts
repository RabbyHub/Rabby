import Wallet, { hdkey } from 'ethereumjs-wallet';
import SimpleKeyring from '@rabby-wallet/eth-simple-keyring';
import * as bip39 from 'bip39';
import * as sigUtil from 'eth-sig-util';

// Options:
const hdPathString = "m/44'/60'/0'/0";
const type = 'HD Key Tree';

interface DeserializeOption {
  hdPath?: string;
  mnemonic?: string;
  activeIndexes?: number[];
}

class HdKeyring extends SimpleKeyring {
  static type = type;

  type = type;
  mnemonic: string | null = null;
  hdPath = hdPathString;
  hdWallet?: hdkey;
  root: hdkey | null = null;
  wallets: Wallet[] = [];
  _index2wallet: Record<number, [string, Wallet]> = {};
  activeIndexes: number[] = [];
  page = 0;
  perPage = 5;

  /* PUBLIC METHODS */
  constructor(opts = {}) {
    super();
    this.deserialize(opts);
  }

  serialize() {
    return Promise.resolve({
      mnemonic: this.mnemonic,
      activeIndexes: this.activeIndexes,
      hdPath: this.hdPath,
    });
  }

  deserialize(opts: DeserializeOption = {}) {
    this.wallets = [];
    this.mnemonic = null;
    this.root = null;
    this.hdPath = opts.hdPath || hdPathString;

    if (opts.mnemonic) {
      this.initFromMnemonic(opts.mnemonic);
    }

    if (opts.activeIndexes) {
      return this.activeAccounts(opts.activeIndexes);
    }

    return Promise.resolve([]);
  }

  initFromMnemonic(mnemonic) {
    this.mnemonic = mnemonic;
    this._index2wallet = {};
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    this.hdWallet = hdkey.fromMasterSeed(seed);
    this.root = this.hdWallet!.derivePath(this.hdPath);
  }

  addAccounts(numberOfAccounts = 1) {
    if (!this.root) {
      this.initFromMnemonic(bip39.generateMnemonic());
    }

    let count = numberOfAccounts;
    let currentIdx = 0;
    const newWallets: Wallet[] = [];

    while (count) {
      const [, wallet] = this._addressFromIndex(currentIdx);
      if (this.wallets.includes(wallet)) {
        currentIdx++;
      } else {
        this.wallets.push(wallet);
        newWallets.push(wallet);
        this.activeIndexes.push(currentIdx);
        count--;
      }
    }

    const hexWallets = newWallets.map((w) => {
      return sigUtil.normalize(w.getAddress().toString('hex'));
    });

    return Promise.resolve(hexWallets);
  }

  activeAccounts(indexes: number[]) {
    const accounts: string[] = [];
    for (const index of indexes) {
      const [address, wallet] = this._addressFromIndex(index);
      this.wallets.push(wallet);
      this.activeIndexes.push(index);

      accounts.push(address);
    }

    return accounts;
  }

  getFirstPage() {
    this.page = 0;
    return this.__getPage(1);
  }

  getNextPage() {
    return this.__getPage(1);
  }

  getPreviousPage() {
    return this.__getPage(-1);
  }

  async __getPage(
    increment: number
  ): Promise<
    Array<{
      address: string;
      index: string;
    }>
  > {
    this.page += increment;

    if (!this.page || this.page <= 0) {
      this.page = 1;
    }

    const from = (this.page - 1) * this.perPage;
    const to = from + this.perPage;

    const accounts: any[] = [];

    for (let i = from; i < to; i++) {
      const [address] = this._addressFromIndex(i);
      accounts.push({
        address,
        index: i,
      });
    }

    return accounts;
  }

  getAccounts() {
    return Promise.resolve(
      this.wallets.map((w) => {
        return sigUtil.normalize(w.getAddress().toString('hex'));
      })
    );
  }

  /* PRIVATE METHODS */

  _addressFromIndex(i: number): [string, Wallet] {
    if (!this._index2wallet[i]) {
      const child = this.root!.deriveChild(i);
      const wallet = child.getWallet();
      const address = sigUtil.normalize(wallet.getAddress().toString('hex'));
      this._index2wallet[i] = [address, wallet];
    }

    return this._index2wallet[i];
  }
}

export default HdKeyring;
