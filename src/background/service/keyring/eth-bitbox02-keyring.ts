import 'regenerator-runtime/runtime';
import EventEmitter from 'events';
import Transaction from 'ethereumjs-tx';

import { browser } from 'webextension-polyfill-ts';

import { BitBox02API, getDevicePath, constants } from 'bitbox02-api';

import * as ethUtil from 'ethereumjs-util';
import * as HDKey from 'hdkey';

const hdPathString = "m/44'/60'/0'/0";
const keyringType = 'BitBox02 Hardware';
const pathBase = 'm';
const MAX_INDEX = 100;

class BitBox02Keyring extends EventEmitter {
  static type = keyringType;
  type = keyringType;
  accounts: string[] = [];
  hdk = new HDKey();
  page = 0;
  perPage = 5;
  unlockedAccount = 0;
  paths = {};
  hdPath = '';

  constructor(opts = {}) {
    super();
    this.deserialize(opts);
  }

  serialize(): Promise<any> {
    return Promise.resolve({
      hdPath: this.hdPath,
      accounts: this.accounts,
      page: this.page,
      paths: this.paths,
      perPage: this.perPage,
      unlockedAccount: this.unlockedAccount,
    });
  }

  deserialize(opts: any = {}): Promise<void> {
    this.hdPath = opts.hdPath || hdPathString;
    this.accounts = opts.accounts || [];
    this.page = opts.page || 0;
    this.perPage = opts.perPage || 5;
    return Promise.resolve();
  }

  async openPopup(url) {
    await browser.windows.create({
      url,
      type: 'popup',
      width: 320,
      height: 175,
    });
  }

  maybeClosePopup() {
    browser.runtime.sendMessage({ type: 'bitbox02', action: 'popup-close' });
  }

  async withDevice(f) {
    const devicePath = await getDevicePath({ forceBridge: true });
    const bitbox02 = new BitBox02API(devicePath);
    try {
      await bitbox02.connect(
        (pairingCode) => {
          this.openPopup(
            `vendor/bitbox02/bitbox02-pairing.html?code=${encodeURIComponent(
              pairingCode
            )}`
          );
        },
        async () => {
          this.maybeClosePopup();
        },
        (attestationResult) => {
          console.info(attestationResult);
        },
        () => {
          this.maybeClosePopup();
        },
        (status) => {
          if (status === constants.Status.PairingFailed) {
            this.maybeClosePopup();
          }
        }
      );

      if (bitbox02.firmware().Product() !== constants.Product.BitBox02Multi) {
        throw new Error('Unsupported device');
      }

      const rootPub = await bitbox02.ethGetRootPubKey(this.hdPath);
      const hdk = HDKey.fromExtendedKey(rootPub);
      this.hdk = hdk;
      const result = await f(bitbox02);
      bitbox02.close();
      return result;
    } catch (err) {
      console.error(err);
      bitbox02.close();
      throw err;
    }
  }

  isUnlocked(): boolean {
    return Boolean(this.hdk && this.hdk.publicKey);
  }

  setAccountToUnlock(index: string): void {
    this.unlockedAccount = parseInt(index, 10);
  }

  async addAccounts(n = 1) {
    return await this.withDevice(async () => {
      const from = this.unlockedAccount;
      const to = from + n;

      for (let i = from; i < to; i++) {
        const address = this._addressFromIndex(pathBase, i);
        if (!this.accounts.includes(address)) {
          this.accounts.push(address);
        }
        this.page = 0;
      }
      return this.accounts;
    });
  }

  getFirstPage(): Promise<any> {
    this.page = 0;
    return this.__getPage(1);
  }

  getNextPage(): Promise<any> {
    return this.__getPage(1);
  }

  getPreviousPage(): Promise<any> {
    return this.__getPage(-1);
  }

  async __getPage(increment) {
    this.page += increment;

    if (this.page <= 0) {
      this.page = 1;
    }

    return await this.withDevice(async () => {
      const from = (this.page - 1) * this.perPage;
      const to = from + this.perPage;

      const accounts: any[] = [];

      for (let i = from; i < to; i++) {
        const address = this._addressFromIndex(pathBase, i);
        accounts.push({
          address,
          balance: null,
          index: i,
        });
        this.paths[ethUtil.toChecksumAddress(address)] = i;
      }
      return accounts;
    });
  }

  getAccounts(): Promise<string[]> {
    return Promise.resolve(this.accounts.slice());
  }

  removeAccount(address: string): void {
    if (
      !this.accounts.map((a) => a.toLowerCase()).includes(address.toLowerCase())
    ) {
      throw new Error(`Address ${address} not found in this keyring`);
    }
    this.accounts = this.accounts.filter(
      (a) => a.toLowerCase() !== address.toLowerCase()
    );
  }

  // tx is an instance of the ethereumjs-transaction class.
  async signTransaction(address, tx) {
    return await this.withDevice(async (bitbox02) => {
      const result = await bitbox02.ethSignTransaction({
        keypath: this._pathFromAddress(address),
        chainId: tx._chainId,
        tx: {
          nonce: tx.nonce,
          gasPrice: tx.gasPrice,
          gasLimit: tx.gasLimit,
          to: tx.to,
          value: tx.value,
          data: tx.data,
        },
      });
      tx.r = Buffer.from(result.r);
      tx.s = Buffer.from(result.s);
      tx.v = Buffer.from(result.v);
      const signedTx = new Transaction(tx);
      const addressSignedWith = ethUtil.toChecksumAddress(
        `0x${signedTx.from.toString('hex')}`
      );
      const correctAddress = ethUtil.toChecksumAddress(address);
      if (addressSignedWith !== correctAddress) {
        throw new Error('signature doesnt match the right address');
      }
      return signedTx;
    });
  }

  signMessage(withAccount: string, data: string): Promise<any> {
    return this.signPersonalMessage(withAccount, data);
  }

  async signPersonalMessage(withAccount, message) {
    return await this.withDevice(async (bitbox02) => {
      const result = await bitbox02.ethSignMessage({
        keypath: this._pathFromAddress(withAccount),
        message: ethUtil.toBuffer(message),
      });
      const sig = Buffer.concat([
        Buffer.from(result.r),
        Buffer.from(result.s),
        Buffer.from(result.v),
      ]);
      const sigHex = `0x${sig.toString('hex')}`;
      return sigHex;
    });
  }

  signTypedData(): Promise<any> {
    // Waiting on bitbox02 to enable this
    return Promise.reject(new Error('Not supported on this device'));
  }

  exportAccount(): Promise<any> {
    return Promise.reject(new Error('Not supported on this device'));
  }

  forgetDevice(): void {
    this.accounts = [];
    this.hdk = new HDKey();
    this.page = 0;
    this.unlockedAccount = 0;
    this.paths = {};
  }

  /* PRIVATE METHODS */

  _normalize(buf: Buffer): string {
    return ethUtil.bufferToHex(buf).toString();
  }

  // eslint-disable-next-line no-shadow
  _addressFromIndex(pathBase: string, i: number): string {
    const dkey = this.hdk.derive(`${pathBase}/${i}`);
    const address = ethUtil
      .publicToAddress(dkey.publicKey, true)
      .toString('hex');
    return ethUtil.toChecksumAddress(`0x${address}`);
  }

  _pathFromAddress(address: string): string {
    const checksummedAddress = ethUtil.toChecksumAddress(address);
    let index = this.paths[checksummedAddress];
    if (typeof index === 'undefined') {
      for (let i = 0; i < MAX_INDEX; i++) {
        if (checksummedAddress === this._addressFromIndex(pathBase, i)) {
          index = i;
          break;
        }
      }
    }

    if (typeof index === 'undefined') {
      throw new Error('Unknown address');
    }
    return `${this.hdPath}/${index}`;
  }
}

export default BitBox02Keyring;
