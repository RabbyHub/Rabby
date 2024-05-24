import EventEmitter from 'events';
import * as ethUtil from 'ethereumjs-util';
import { FeeMarketEIP1559Transaction, Transaction } from '@ethereumjs/tx';
import { SignHelper } from '../helper';
import { EVENTS } from '@/constant';
import { is1559Tx } from '@/utils/transaction';
import { bytesToHex } from 'web3-utils';
import { ImKeyBridgeInterface } from './imkey-bridge-interface';
import { signHashHex } from './utils';

const keyringType = 'imKey Hardware';
const MAX_INDEX = 1000;

const convertToBigint = (value: any) => {
  return typeof value === 'bigint'
    ? `0x${value.toString(16)}`
    : `0x${value.toString('hex')}`;
};

const getChainId = (common) => {
  if (typeof common.chainIdBN !== 'undefined') {
    return common.chainIdBN().toNumber();
  } else {
    return parseInt(common.chainId());
  }
};

export enum LedgerHDPathType {
  LedgerLive = 'LedgerLive',
  Legacy = 'Legacy',
  BIP44 = 'BIP44',
}

import HDPathType = LedgerHDPathType;
const HD_PATH_BASE = {
  [HDPathType.BIP44]: "m/44'/60'/0'/0",
  [HDPathType.Legacy]: "m/44'/60'/0'",
  [HDPathType.LedgerLive]: "m/44'/60'/0'/0/0",
};

interface Account {
  address: string;
  index: number;
}

interface AccountDetail {
  hdPathBasePublicKey?: string;
  hdPath: string;
  hdPathType: HDPathType;
  index: number;
}

export class EthImKeyKeyring extends EventEmitter {
  static type = keyringType;
  type = keyringType;
  accounts: string[] = [];
  page = 0;
  perPage = 5;
  unlockedAccount = 0;
  paths = {};
  hdPathType: HDPathType = HDPathType.BIP44;
  accountDetails: Record<string, AccountDetail>;
  usedHDPathTypeList: Record<string, HDPathType> = {};

  bridge!: ImKeyBridgeInterface;

  signHelper = new SignHelper({
    errorEventName: EVENTS.COMMON_HARDWARE.REJECTED,
  });

  hasHIDPermission = false;

  constructor(
    opts: any & {
      bridge: ImKeyBridgeInterface;
    } = {}
  ) {
    super();
    if (!opts.bridge) {
      throw new Error('Bridge is required');
    }

    this.bridge = opts.bridge;
    this.accountDetails = {};
    this.usedHDPathTypeList = {};
    this.deserialize(opts);
  }

  serialize(): Promise<any> {
    return Promise.resolve({
      hdPathType: this.hdPathType,
      accounts: this.accounts,
      page: this.page,
      paths: this.paths,
      perPage: this.perPage,
      unlockedAccount: this.unlockedAccount,
      accountDetails: this.accountDetails,
    });
  }

  deserialize(opts: any = {}): Promise<void> {
    this.hdPathType = opts.hdPathType ?? HDPathType.BIP44;
    this.accounts = opts.accounts || [];
    this.page = opts.page || 0;
    this.perPage = 5;
    this.paths = opts.paths || {};
    this.accountDetails = opts.accountDetails || {};
    return Promise.resolve();
  }

  authorizeHIDPermission() {
    this.hasHIDPermission = true;
  }

  async cleanUp() {
    return await this.bridge.cleanUp();
  }

  invokeApp: ImKeyBridgeInterface['invokeApp'] = (method, params) => {
    return this.bridge.invokeApp(method, params);
  };

  resend() {
    this.signHelper.resend();
  }

  resetResend() {
    this.signHelper.resetResend();
  }

  async unlock() {
    return await this.bridge.unlock();
  }

  setAccountToUnlock(index: string): void {
    this.unlockedAccount = parseInt(index, 10);
  }

  addAccounts(n = 1): Promise<any> {
    return new Promise((resolve, reject) => {
      this.unlock()
        .then(async (_) => {
          const from = this.unlockedAccount;
          const to = from + n;

          for (let i = from; i < to; i++) {
            const address = await this.addressFromIndex(i);
            if (!this.accounts.includes(address)) {
              this.accounts.push(address);
              this.accountDetails[ethUtil.toChecksumAddress(address)] = {
                hdPath: this.getPathForIndex(i),
                hdPathType: this.hdPathType,
                hdPathBasePublicKey: await this.getPathBasePublicKey(
                  this.hdPathType
                ),
                index: i,
              };
            }
            this.page = 0;
          }
          resolve(this.accounts);
        })
        .catch((e) => {
          reject(e);
        });
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
  getAddresses(start: number, end: number): Promise<any> {
    return new Promise((resolve, reject) => {
      this.unlock()
        .then(async (_) => {
          const from = start;
          const to = end;

          const accounts: any[] = [];

          for (let i = from; i < to; i++) {
            const address = await this.addressFromIndex(i);
            accounts.push({
              address,
              balance: null,
              index: i + 1,
            });
            this.paths[ethUtil.toChecksumAddress(address)] = i;
          }
          resolve(accounts);
        })
        .catch((e) => {
          reject(e);
        });
    });
  }
  __getPage(increment: number): Promise<any> {
    this.page += increment;

    if (this.page <= 0) {
      this.page = 1;
    }

    return new Promise((resolve, reject) => {
      this.unlock()
        .then(async (_) => {
          const from = (this.page - 1) * this.perPage;
          const to = from + this.perPage;

          const accounts: any[] = [];

          for (let i = from; i < to; i++) {
            const address = await this.addressFromIndex(i);
            accounts.push({
              address,
              balance: null,
              index: i + 1,
            });
            this.paths[ethUtil.toChecksumAddress(address)] = i;
          }
          resolve(accounts);
        })
        .catch((e) => {
          reject(e);
        });
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
    const checksummedAddress = ethUtil.toChecksumAddress(address);
    delete this.accountDetails[checksummedAddress];
    delete this.paths[checksummedAddress];
  }

  // tx is an instance of the ethereumjs-transaction class.
  signTransaction(address: string, transaction) {
    return this.signHelper.invoke(async () => {
      await this.unlock();
      const checksummedAddress = ethUtil.toChecksumAddress(address);
      const accountDetail = this.accountDetails[checksummedAddress];

      const txChainId = getChainId(transaction.common);
      const dataHex = transaction.data.toString('hex');

      const txJSON = transaction.toJSON();
      const is1559 = is1559Tx(txJSON);

      const txData = is1559
        ? {
            data: dataHex === '' ? '' : `0x${dataHex}`,
            gasLimit: convertToBigint(transaction.gasLimit),
            type: convertToBigint(transaction.type.toString()),
            accessList: transaction.accessList,
            maxFeePerGas: convertToBigint(transaction.maxFeePerGas),
            maxPriorityFeePerGas: convertToBigint(
              transaction.maxPriorityFeePerGas
            ),
            nonce: convertToBigint(transaction.nonce),
            to: transaction.to!.toString(),
            value: convertToBigint(transaction.value),
            chainId: txChainId,
            path: accountDetail.hdPath,
          }
        : {
            to: transaction.to!.toString(),
            value: convertToBigint(transaction.value),
            data: dataHex === '' ? '' : `0x${dataHex}`,
            nonce: convertToBigint(transaction.nonce),
            gasLimit: convertToBigint(transaction.gasLimit),
            gasPrice:
              typeof (transaction as Transaction).gasPrice !== 'undefined'
                ? convertToBigint((transaction as Transaction).gasPrice)
                : convertToBigint(
                    (transaction as FeeMarketEIP1559Transaction).maxFeePerGas
                  ),
            chainId: txChainId,
            path: accountDetail.hdPath,
          };

      const { signature, txHash } = await this.invokeApp('signTransaction', [
        txData,
      ]);
      let decoded;

      if (is1559) {
        decoded = ethUtil.rlp.decode('0x' + signature.substring(4), true);

        txJSON.r = bytesToHex(decoded.data[10]);
        txJSON.s = bytesToHex(decoded.data[11]);
        txJSON.v = bytesToHex(decoded.data[9]);
        txJSON.hash = txHash;
        return FeeMarketEIP1559Transaction.fromTxData(txJSON);
      } else {
        decoded = ethUtil.rlp.decode(signature, true);

        txJSON.r = bytesToHex(decoded.data[7]);
        txJSON.s = bytesToHex(decoded.data[8]);
        txJSON.v = bytesToHex(decoded.data[6]);
        txJSON.hash = txHash;
        return Transaction.fromTxData(txJSON);
      }
    });
  }

  signMessage(withAccount: string, data: string) {
    return this.signPersonalMessage(withAccount, data);
  }

  // For personal_sign, we need to prefix the message:
  signPersonalMessage(address: string, message: string) {
    return this.signHelper.invoke(async () => {
      await this.unlock();
      const checksummedAddress = ethUtil.toChecksumAddress(address);
      const accountDetail = this.accountDetails[checksummedAddress];

      const res = await this.invokeApp('signMessage', [
        accountDetail.hdPath,
        message,
        checksummedAddress,
        true,
      ]);
      return res?.signature;
    });
  }

  async signTypedData(address, data, opts) {
    return this.signHelper.invoke(async () => {
      await this.unlock();
      const checksummedAddress = ethUtil.toChecksumAddress(address);
      const accountDetail = this.accountDetails[checksummedAddress];
      const isV4 = opts.version === 'V4';

      if (opts.version !== 'V4' && opts.version !== 'V3') {
        throw new Error('ImKey only supports V3 and V4 of typed data');
      }

      const eip712HashHexWithoutSha3 = signHashHex(data, isV4);

      const res = await this.invokeApp('signMessage', [
        accountDetail.hdPath,
        eip712HashHexWithoutSha3,
        checksummedAddress,
        false,
      ]);
      return res?.signature;
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

  private getPathForIndex(i: number) {
    let htPath = this.getHDPathBase(this.hdPathType);
    if (this.hdPathType === HDPathType.LedgerLive) {
      htPath = `m/44'/60'/${i}'/0/0`;
    } else {
      htPath = `${htPath}/${i}`;
    }
    return htPath;
  }

  private async addressFromIndex(i: number) {
    const htPath = this.getPathForIndex(i);
    const { address } = await this.invokeApp('getAddress', [htPath]);
    return address;
  }

  private async pathFromAddress(address: string) {
    const i = await this.indexFromAddress(address);
    const htPath = this.getPathForIndex(i);

    return htPath;
  }

  async indexFromAddress(address: string): Promise<number> {
    const checksummedAddress = ethUtil.toChecksumAddress(address);
    let index =
      this.paths[checksummedAddress] ||
      this.accountDetails[checksummedAddress]?.index;

    if (typeof index === 'undefined') {
      for (let i = 0; i < MAX_INDEX; i++) {
        if (checksummedAddress === (await this.addressFromIndex(i))) {
          index = i;
          break;
        }
      }
    }

    if (typeof index === 'undefined') {
      throw new Error('Unknown address');
    }
    return index;
  }

  async getCurrentAccounts() {
    await this.unlock();
    const addresses = await this.getAccounts();
    const currentPublicKey = await this.getPathBasePublicKey(this.hdPathType);
    const accounts: Account[] = [];

    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];

      const detail = this.accountDetails[ethUtil.toChecksumAddress(address)];

      if (detail?.hdPathBasePublicKey !== currentPublicKey) {
        continue;
      }

      try {
        const account = {
          address,
          index: (await this.indexFromAddress(address)) + 1,
        };
        accounts.push(account);
      } catch (e) {
        console.log('address not found', address);
      }
    }

    return accounts;
  }

  private async getPathBasePublicKey(hdPathType: HDPathType) {
    const pathBase = this.getHDPathBase(hdPathType);
    return (await this.invokeApp('getAddress', [pathBase])).pubkey;
  }

  private getHDPathBase(hdPathType: HDPathType) {
    return HD_PATH_BASE[hdPathType];
  }

  async setHDPathType(hdPathType: HDPathType) {
    if (hdPathType) this.hdPathType = hdPathType;
  }

  async setCurrentUsedHDPathType() {
    const key = await this.getPathBasePublicKey(HDPathType.Legacy);
    this.usedHDPathTypeList[key] = this.hdPathType;
  }

  async getCurrentUsedHDPathType() {
    await this.unlock();
    const key = await this.getPathBasePublicKey(HDPathType.Legacy);
    return this.usedHDPathTypeList[key];
  }

  getMaxAccountLimit() {
    return 1;
  }
}
