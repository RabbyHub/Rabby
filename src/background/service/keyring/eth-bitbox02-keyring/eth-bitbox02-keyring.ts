import 'regenerator-runtime/runtime';
import EventEmitter from 'events';
import * as ethUtil from 'ethereumjs-util';
import * as sigUtil from '@metamask/eth-sig-util';
import {
  TypedTransaction,
  FeeMarketEIP1559Transaction,
  Transaction,
  JsonTx,
  TransactionFactory,
  AccessListEIP2930Transaction,
} from '@ethereumjs/tx';
import { EVENTS } from '@/constant';
import { SignHelper } from '../helper';
import { BitBox02BridgeInterface } from './bitbox02-bridge-interface';

const hdPathString = "m/44'/60'/0'/0";
const keyringType = 'BitBox02 Hardware';
const pathBase = 'm';
const MAX_INDEX = 100;

class BitBox02Keyring extends EventEmitter {
  static type = keyringType;
  type = keyringType;
  accounts: string[] = [];
  page = 0;
  perPage = 5;
  unlockedAccount = 0;
  paths = {};
  hdPath = '';
  signHelper = new SignHelper({
    errorEventName: EVENTS.COMMON_HARDWARE.REJECTED,
  });

  bridge!: BitBox02BridgeInterface;

  constructor(
    opts: any & {
      bridge: BitBox02BridgeInterface;
    } = {}
  ) {
    super();
    if (!opts.bridge) {
      throw new Error('Bridge is required');
    }
    this.bridge = opts.bridge;
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
    this.perPage = 5;
    return Promise.resolve();
  }

  resend() {
    this.signHelper.resend();
  }

  async init() {
    await this.bridge.init(this.hdPath);
  }

  isUnlocked(): boolean {
    return Boolean(this.bridge.isDeviceConnected);
  }

  setAccountToUnlock(index: string): void {
    this.unlockedAccount = parseInt(index, 10);
  }

  async addAccounts(n = 1) {
    await this.init();

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

    await this.init();
    const from = (this.page - 1) * this.perPage;
    const to = from + this.perPage;

    const accounts: any[] = [];

    for (let i = from; i < to; i++) {
      if (i >= MAX_INDEX) {
        return accounts;
      }

      const address = this._addressFromIndex(pathBase, i);
      accounts.push({
        address,
        balance: null,
        index: i + 1,
      });
      this.paths[ethUtil.toChecksumAddress(address)] = i;
    }
    return accounts;
  }
  async getAddresses(start: number, end: number) {
    const from = start;
    const to = end;
    const accounts: any[] = [];
    await this.init();

    for (let i = from; i < to; i++) {
      if (i >= MAX_INDEX) {
        return accounts;
      }

      const address = this._addressFromIndex(pathBase, i);
      accounts.push({
        address,
        balance: null,
        index: i + 1,
      });
      this.paths[ethUtil.toChecksumAddress(address)] = i;
    }
    return accounts;
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
  async signTransaction(address, tx: TypedTransaction) {
    return this.signHelper.invoke(async () => {
      await this.init();

      let result;
      const txData: JsonTx = {
        to: tx.to!.toString(),
        value: `0x${tx.value.toString('hex')}`,
        data: this._normalize(tx.data),
        nonce: `0x${tx.nonce.toString('hex')}`,
        gasLimit: `0x${tx.gasLimit.toString('hex')}`,
      };

      if (tx instanceof FeeMarketEIP1559Transaction) {
        result = await this.bridge.ethSign1559Transaction(
          this._pathFromAddress(address),
          tx.toJSON()
        );
        txData.type = '0x02';
        txData.maxPriorityFeePerGas = `0x${tx.maxPriorityFeePerGas.toString(
          'hex'
        )}`;
        txData.maxFeePerGas = `0x${tx.maxFeePerGas.toString('hex')}`;
      } else if (
        tx instanceof Transaction ||
        tx instanceof AccessListEIP2930Transaction
      ) {
        result = await this.bridge.ethSignTransaction(
          tx.common.chainIdBN().toNumber(),
          this._pathFromAddress(address),
          tx.toJSON()
        );
        txData.gasPrice = `0x${tx.gasPrice.toString('hex')}`;
      }
      txData.r = result.r;
      txData.s = result.s;
      txData.v = result.v;
      const signedTx = TransactionFactory.fromTxData(txData);
      const addressSignedWith = ethUtil.toChecksumAddress(
        signedTx.getSenderAddress().toString()
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
    return this.signHelper.invoke(async () => {
      await this.init();

      const result = await this.bridge.ethSignMessage(
        1,
        this._pathFromAddress(withAccount),
        message
      );
      const sig = Buffer.concat([
        Buffer.from(result.r),
        Buffer.from(result.s),
        Buffer.from(result.v),
      ]);

      const sigHex = `0x${sig.toString('hex')}`;
      return sigHex;
    });
  }

  async signTypedData(withAccount, data, options: any = {}) {
    if (options.version !== 'V4') {
      throw new Error(
        `Only version 4 of typed data signing is supported. Provided version: ${options.version}`
      );
    }
    return this.signHelper.invoke(async () => {
      await this.init();
      const result = await this.bridge.ethSignTypedMessage(
        data.domain.chainId || 1,
        this._pathFromAddress(withAccount),
        data
      );
      const sig = Buffer.concat([
        Buffer.from(result.r),
        Buffer.from(result.s),
        Buffer.from(result.v),
      ]);
      const sigHex = `0x${sig.toString('hex')}`;
      const addressSignedWith = sigUtil.recoverTypedSignature({
        data,
        signature: sigHex,
        version: options.version,
      });
      if (
        ethUtil.toChecksumAddress(addressSignedWith) !==
        ethUtil.toChecksumAddress(withAccount)
      ) {
        throw new Error('The signature doesnt match the right address');
      }
      return sigHex;
    });
  }

  exportAccount(): Promise<any> {
    return Promise.reject(new Error('Not supported on this device'));
  }

  forgetDevice(): void {
    this.accounts = [];
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
    const dkey = this.bridge.hdk.derive(`${pathBase}/${i}`);
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

  async getCurrentAccounts() {
    await this.init();
    const addrs = await this.getAccounts();

    return addrs.map((address) => {
      const checksummedAddress = ethUtil.toChecksumAddress(address);
      return {
        address,
        index: this.paths[checksummedAddress] + 1,
      };
    });
  }
}

export default BitBox02Keyring;
