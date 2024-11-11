import EventEmitter from 'events';
import * as ethUtil from 'ethereumjs-util';
import * as sigUtil from 'eth-sig-util';
import { TransactionFactory } from '@ethereumjs/tx';
import HDKey from 'hdkey';
import { isSameAddress } from '@/background/utils';
import { SignHelper } from '../helper';
import { EVENTS } from '@/constant';
import type { EVMTransaction, EVMTransactionEIP1559 } from '@onekeyfe/hd-core';
import { OneKeyBridgeInterface } from './onekey-bridge-interface';
import { isManifestV3 } from '@/utils/env';
import browser from 'webextension-polyfill';

const keyringType = 'Onekey Hardware';
const hdPathString = "m/44'/60'/0'/0";
const pathBase = 'm';
const MAX_INDEX = 1000;
const DELAY_BETWEEN_POPUPS = 1000;
const ONEKEY_SESSION_STATE_KEY = 'onekeySessionState';

interface OneKeySessionState {
  passphraseState: string;
  deviceId: string;
  connectId: string;
  hdkMap: {
    [key: string]: {
      publicKey: string;
      chainCode: string;
    };
  };
}

export enum LedgerHDPathType {
  LedgerLive = 'LedgerLive',
  Legacy = 'Legacy',
  BIP44 = 'BIP44',
}

type HDPathType = LedgerHDPathType;

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

/**
 * Check if the given transaction is made with ethereumjs-tx or @ethereumjs/tx
 *
 * Transactions built with older versions of ethereumjs-tx have a
 * getChainId method that newer versions do not.
 * Older versions are mutable
 * while newer versions default to being immutable.
 * Expected shape and type
 * of data for v, r and s differ (Buffer (old) vs BN (new)).
 *
 * @param {TypedTransaction | OldEthJsTransaction} tx
 * @returns {tx is OldEthJsTransaction} Returns `true` if tx is an old-style ethereumjs-tx transaction.
 */
function isOldStyleEthereumjsTx(tx) {
  return typeof tx.getChainId === 'function';
}

const HD_PATH_BASE = {
  [LedgerHDPathType.BIP44]: "m/44'/60'/0'/0",
  [LedgerHDPathType.Legacy]: "m/44'/60'/0'",
  [LedgerHDPathType.LedgerLive]: "m/44'/60'/0'/0/0",
};

const ALLOWED_HD_PATHS = {
  [HD_PATH_BASE.BIP44]: true,
  [HD_PATH_BASE.Legacy]: true,
  [HD_PATH_BASE.LedgerLive]: true,
};

const HD_PATH_TYPE = {
  [HD_PATH_BASE['Legacy']]: LedgerHDPathType.Legacy,
  [HD_PATH_BASE['BIP44']]: LedgerHDPathType.BIP44,
  [HD_PATH_BASE['LedgerLive']]: LedgerHDPathType.LedgerLive,
};

class OneKeyKeyring extends EventEmitter {
  static type = keyringType;
  type = keyringType;
  accounts: string[] = [];
  page = 0;
  perPage = 5;
  unlockedAccount = 0;
  paths = {};
  hdPath = '';
  deviceId: string | null = null;
  connectId: string | null = null;
  passphraseState: string | undefined = undefined;
  accountDetails: Record<string, AccountDetail>;
  hdkMap: Map<string, HDKey> = new Map();

  bridge!: OneKeyBridgeInterface;

  signHelper = new SignHelper({
    errorEventName: EVENTS.COMMON_HARDWARE.REJECTED,
  });

  constructor(
    opts: any & {
      bridge: OneKeyBridgeInterface;
    } = {}
  ) {
    super();
    if (!opts.bridge) {
      throw new Error('Bridge is required');
    }
    this.bridge = opts.bridge;
    this.accountDetails = {};
    this.deserialize(opts);
    this.init();
  }

  async init() {
    this.bridge.init();
    if (isManifestV3) {
      // resume passphrase state from session after sw inactive
      const value = await browser.storage.session.get(ONEKEY_SESSION_STATE_KEY);
      const state: OneKeySessionState = value[ONEKEY_SESSION_STATE_KEY];
      if (state) {
        this.passphraseState = state.passphraseState;
        this.deviceId = state.deviceId;
        this.connectId = state.connectId;
        for (const key in state.hdkMap) {
          const hdk = new HDKey();
          hdk.publicKey = Buffer.from(state.hdkMap[key].publicKey, 'hex');
          hdk.chainCode = Buffer.from(state.hdkMap[key].chainCode, 'hex');
          this.hdkMap.set(key, hdk);
        }
      }
    }
  }

  serialize(): Promise<any> {
    return Promise.resolve({
      hdPath: this.hdPath,
      accounts: this.accounts,
      page: this.page,
      paths: this.paths,
      perPage: this.perPage,
      unlockedAccount: this.unlockedAccount,
      accountDetails: this.accountDetails,
    });
  }

  deserialize(opts: any = {}): Promise<void> {
    this.hdPath = opts.hdPath || HD_PATH_BASE.BIP44;
    this.accounts = opts.accounts || [];
    this.page = opts.page || 0;
    this.perPage = 5;
    this.paths = opts.paths || {};
    this.accountDetails = opts.accountDetails || {};
    return Promise.resolve();
  }

  setHdPath(hdPath) {
    if (!ALLOWED_HD_PATHS[hdPath]) {
      throw new Error(
        `The setHdPath method does not support setting HD Path to ${hdPath}`
      );
    }

    // Reset HDKey if the path changes
    if (this.hdPath !== hdPath) {
      this.hdkMap = new Map();
      this.page = 0;
      this.perPage = 5;
      this.unlockedAccount = 0;
    }
    this.hdPath = hdPath;
  }

  isUnlocked(start?: number, len = 1): boolean {
    if (!this.hdkMap) {
      return false;
    }

    if (this.hdPath !== HD_PATH_BASE.LedgerLive) {
      return !!this.hdkMap.get(this.hdPath);
    }

    if (start === null || start === undefined) {
      return !!this.hdkMap.size;
    }

    for (let i = start; i < start + len; i++) {
      const path = this._getPathForIndex(i);
      if (!this.hdkMap.get(path)?.publicKey) {
        return false;
      }
    }

    return true;
  }

  cleanUp() {
    if (!this.hdkMap.size) {
      return;
    }
    this.hdkMap = new Map();
  }

  resend() {
    this.signHelper.resend();
  }

  resetResend() {
    this.signHelper.resetResend();
  }

  unlock(start?: number, len?: number): Promise<string> {
    // if (this.isUnlocked()) {
    //   return Promise.resolve('already unlocked');
    // }
    return new Promise((resolve, reject) => {
      const hdPaths: string[] = [];
      hdPaths.push(this.hdPath);
      if (
        typeof start === 'number' &&
        typeof len === 'number' &&
        this.hdPath === HD_PATH_BASE.LedgerLive
      ) {
        for (let i = start; i < start + len; i++) {
          hdPaths.push(this._getPathForIndex(i));
        }
      }
      this.bridge
        .searchDevices()
        .then(async (result) => {
          if (!result.success) {
            reject('searchDevices failed');
            return;
          } else {
            if (result.payload.length <= 0) {
              reject('No OneKey Device found');
            }
            const device = result.payload[0];
            const { deviceId, connectId } = device;
            if (!deviceId || !connectId) {
              reject('no deviceId or connectId');
              return;
            }
            if (
              this.deviceId &&
              this.connectId &&
              this.isUnlocked() &&
              this.deviceId === deviceId &&
              this.connectId === connectId
            ) {
              resolve('already unlocked');
              return;
            }
            this.deviceId = deviceId;
            this.connectId = connectId;
            const passphraseState = await this.bridge.getPassphraseState(
              connectId
            );
            if (!passphraseState.success) {
              reject('getPassphraseState failed');
              return;
            }
            const bundle = hdPaths.map((path) => ({
              path,
              chainId: 1,
              showOnOneKey: false,
            }));
            this.passphraseState = passphraseState.payload;
            this.bridge
              .evmGetPublicKey(connectId, deviceId, {
                passphraseState: passphraseState.payload,
                bundle,
              })
              .then(async (res) => {
                if (res.success) {
                  res.payload.forEach((item) => {
                    console.log('item', item);
                    const hdk = new HDKey();
                    hdk.publicKey = Buffer.from(item.publicKey, 'hex');
                    hdk.chainCode = Buffer.from(item.node.chain_code, 'hex');
                    this.hdkMap.set(item.path, hdk);
                  });
                  if (isManifestV3) {
                    const hdkObject = {};
                    for (const [key, value] of this.hdkMap.entries()) {
                      hdkObject[key] = {
                        publicKey: ethUtil.bufferToHex(value.publicKey),
                        chainCode: ethUtil.bufferToHex(value.chainCode),
                      };
                    }
                    const sessionState: OneKeySessionState = {
                      passphraseState: passphraseState.payload,
                      hdkMap: hdkObject,
                      deviceId,
                      connectId,
                    };
                    await browser.storage.session.set({
                      [ONEKEY_SESSION_STATE_KEY]: sessionState,
                    });
                  }
                  resolve('just unlocked');
                } else {
                  reject('getPublicKey failed');
                }
              });
          }
        })
        .catch((e) => {
          reject(new Error((e && e.toString()) || 'Unknown error'));
        });
    });
  }

  setAccountToUnlock(index: string): void {
    this.unlockedAccount = parseInt(index, 10);
  }

  addAccounts(n = 1): Promise<any> {
    return new Promise((resolve, reject) => {
      this.unlock(this.unlockedAccount, n)
        .then((_) => {
          const from = this.unlockedAccount;
          const to = from + n;

          for (let i = from; i < to; i++) {
            const address = this._addressFromIndex(pathBase, i);
            if (!this.accounts.includes(address)) {
              this.accounts.push(address);
              this.accountDetails[ethUtil.toChecksumAddress(address)] = {
                hdPath: this._getPathForIndex(i),
                hdPathType: this.getCurrentUsedHDPathType(),
                hdPathBasePublicKey: this.getPathBasePublicKey(),
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
      this.unlock(start, end - start + 1)
        .then((_) => {
          const from = start;
          const to = end;

          const accounts: any[] = [];

          for (let i = from; i < to; i++) {
            const address = this._addressFromIndex(pathBase, i);
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
        .then((_) => {
          const from = (this.page - 1) * this.perPage;
          const to = from + this.perPage;

          const accounts: any[] = [];

          for (let i = from; i < to; i++) {
            const address = this._addressFromIndex(pathBase, i);
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
  signTransaction(address: string, tx): Promise<any> {
    return this.signHelper.invoke(async () => {
      return new Promise((resolve, reject) => {
        this.unlock()
          .then((status) => {
            setTimeout(
              (_) => {
                if (isOldStyleEthereumjsTx(tx)) {
                  // In this version of ethereumjs-tx we must add the chainId in hex format
                  // to the initial v value. The chainId must be included in the serialized
                  // transaction which is only communicated to ethereumjs-tx in this
                  // value. In newer versions the chainId is communicated via the 'Common'
                  // object.
                  this._signTransaction(
                    address,
                    tx.getChainId(),
                    tx,
                    (payload) => {
                      tx.v = Buffer.from(payload.v, 'hex');
                      tx.r = Buffer.from(payload.r, 'hex');
                      tx.s = Buffer.from(payload.s, 'hex');
                      return tx;
                    }
                  )
                    .then(resolve)
                    .catch(reject);
                } else {
                  this._signTransaction(
                    address,
                    Number(tx.common.chainId()),
                    tx,
                    (payload) => {
                      // Because tx will be immutable, first get a plain javascript object that
                      // represents the transaction. Using txData here as it aligns with the
                      // nomenclature of ethereumjs/tx.
                      const txData = tx.toJSON();
                      // The fromTxData utility expects a type to support transactions with a type other than 0
                      txData.type = tx.type;
                      // The fromTxData utility expects v,r and s to be hex prefixed
                      txData.v = ethUtil.addHexPrefix(payload.v);
                      txData.r = ethUtil.addHexPrefix(payload.r);
                      txData.s = ethUtil.addHexPrefix(payload.s);
                      // Adopt the 'common' option from the original transaction and set the
                      // returned object to be frozen if the original is frozen.
                      return TransactionFactory.fromTxData(txData, {
                        common: tx.common,
                        freeze: Object.isFrozen(tx),
                      });
                    }
                  )
                    .then(resolve)
                    .catch(reject);
                }
                // This is necessary to avoid popup collision
                // between the unlock & sign trezor popups
              },
              status === 'just unlocked' ? DELAY_BETWEEN_POPUPS : 0
            );
          })
          .catch((e) => {
            reject(new Error((e && e.toString()) || 'Unknown error'));
          });
      });
    });
  }

  async _signTransaction(address, chainId, tx, handleSigning) {
    let transaction: EVMTransaction | EVMTransactionEIP1559;
    if (isOldStyleEthereumjsTx(tx)) {
      // legacy transaction from ethereumjs-tx package has no .toJSON() function,
      // so we need to convert to hex-strings manually manually
      transaction = {
        to: this._normalize(tx.to),
        value: this._normalize(tx.value),
        data: this._normalize(tx.data),
        chainId,
        nonce: this._normalize(tx.nonce),
        gasLimit: this._normalize(tx.gasLimit),
        gasPrice: this._normalize(tx.gasPrice),
      };
    } else {
      // new-style transaction from @ethereumjs/tx package
      // we can just copy tx.toJSON() for everything except chainId, which must be a number
      transaction = {
        ...tx.toJSON(),
        chainId,
        to: this._normalize(tx.to),
      };
    }
    return this.bridge
      .evmSignTransaction(this.connectId!, this.deviceId!, {
        path: await this.getHdPath(address),
        passphraseState: this.passphraseState,
        transaction,
      })
      .then((res) => {
        if (res.success) {
          const newOrMutatedTx = handleSigning(res.payload);
          const addressSignedWith = ethUtil.toChecksumAddress(
            ethUtil.addHexPrefix(
              newOrMutatedTx.getSenderAddress().toString('hex')
            )
          );
          const correctAddress = ethUtil.toChecksumAddress(address);
          if (addressSignedWith !== correctAddress) {
            throw new Error('signature doesnt match the right address');
          }

          return newOrMutatedTx;
        } else {
          throw new Error(
            (res.payload && res.payload.error) || 'Unknown error'
          );
        }
      });
  }

  signMessage(withAccount: string, data: string): Promise<any> {
    return this.signPersonalMessage(withAccount, data);
  }

  // For personal_sign, we need to prefix the message:
  signPersonalMessage(withAccount: string, message: string): Promise<any> {
    return this.signHelper.invoke(async () => {
      return new Promise((resolve, reject) => {
        this.unlock()
          .then((status) => {
            setTimeout(
              async (_) => {
                this.bridge
                  .evmSignMessage(this.connectId!, this.deviceId!, {
                    path: await this.getHdPath(withAccount),
                    messageHex: ethUtil.stripHexPrefix(message),
                    passphraseState: this.passphraseState,
                  })
                  .then((response) => {
                    if (response.success) {
                      if (
                        response.payload.address !==
                        ethUtil.toChecksumAddress(withAccount)
                      ) {
                        reject(
                          new Error('signature doesnt match the right address')
                        );
                      }
                      const signature = `0x${response.payload.signature}`;
                      resolve(signature);
                    } else {
                      reject(
                        new Error(
                          (response.payload && response.payload.error) ||
                            'Unknown error'
                        )
                      );
                    }
                  })
                  .catch((e) => {
                    console.log('Error while trying to sign a message ', e);
                    reject(new Error((e && e.toString()) || 'Unknown error'));
                  });
                // This is necessary to avoid popup collision
                // between the unlock & sign trezor popups
              },
              status === 'just unlocked' ? DELAY_BETWEEN_POPUPS : 0
            );
          })
          .catch((e) => {
            console.log('Error while trying to sign a message ', e);
            reject(new Error((e && e.toString()) || 'Unknown error'));
          });
      });
    });
  }

  async signTypedData(address, data, opts) {
    switch (opts.version) {
      case 'V1':
        return this.signTypedData_v1(address, data, opts);
      case 'V3':
        return this.signTypedData_v3_v4(address, data, opts);
      case 'V4':
        return this.signTypedData_v3_v4(address, data, opts);
      default:
        return this.signTypedData_v1(address, data, opts);
    }
  }

  signTypedData_v1(address, typedData, opts = {}) {
    // Waiting on trezor to enable this
    return this.signHelper.invoke(async () => {
      throw new Error('Not supported on this device');
    });
  }

  // personal_signTypedData, signs data along with the schema
  signTypedData_v3_v4(
    address,
    typedData,
    opts: { version?: 'V3' | 'V4' } = {}
  ) {
    return this.signHelper.invoke(async () => {
      return new Promise((resolve, reject) => {
        const isV4 = opts.version === 'V4';
        const {
          domain,
          types,
          primaryType,
          message,
        } = sigUtil.TypedDataUtils.sanitizeData(typedData);
        const domainSeparatorHex = sigUtil.TypedDataUtils.hashStruct(
          'EIP712Domain',
          domain,
          types,
          isV4
        ).toString('hex');
        const hashStructMessageHex = sigUtil.TypedDataUtils.hashStruct(
          primaryType as string,
          message,
          types,
          isV4
        ).toString('hex');
        this.unlock()
          .then((status) => {
            setTimeout(
              async (_) => {
                try {
                  this.bridge
                    .evmSignTypedData(this.connectId!, this.deviceId!, {
                      path: await this.getHdPath(address),
                      data: typedData,
                      passphraseState: this.passphraseState,
                      metamaskV4Compat: isV4,
                      domainHash: domainSeparatorHex,
                      messageHash: hashStructMessageHex,
                      chainId: domain.chainId
                        ? Number(domain.chainId)
                        : undefined,
                    })
                    .then((response) => {
                      if (response.success) {
                        if (
                          response.payload.address !==
                          ethUtil.toChecksumAddress(address)
                        ) {
                          reject(
                            new Error(
                              'signature doesnt match the right address'
                            )
                          );
                        }
                        const signature = `0x${response.payload.signature}`;
                        resolve(signature);
                      } else {
                        let code =
                          (response.payload && response.payload.code) || '';
                        const message =
                          (response.payload && response.payload.error) || '';
                        let errorMsg =
                          (response.payload && response.payload.error) ||
                          'Unknown error';

                        let errorUrl = '';
                        if (message.includes('EIP712Domain')) {
                          code = 'EIP712_DOMAIN_NOT_SUPPORT';
                        } else if (message.includes('EIP712')) {
                          code = 'EIP712_BLIND_SIGN_DISABLED';
                          errorUrl =
                            'https://help.onekey.so/hc/zh-cn/articles/4406637762959';
                        }
                        if (code === 'Failure_UnexpectedMessage') {
                          code = 'EIP712_FIRMWARE_NOT_SUPPORT';
                          errorMsg = 'Not supported on this device';
                        }

                        const error = new Error(
                          JSON.stringify({
                            code,
                            errorMsg,
                          })
                        );
                        reject(error);
                      }
                    })
                    .catch((e) => {
                      console.log('Error while trying to sign a message ', e);
                      reject(new Error((e && e.toString()) || 'Unknown error'));
                    });
                } catch (e) {
                  reject(new Error((e && e.toString()) || 'Unknown error'));
                }
                // This is necessary to avoid popup collision
                // between the unlock & sign trezor popups
              },
              status === 'just unlocked' ? DELAY_BETWEEN_POPUPS : 0
            );
          })
          .catch((e) => {
            console.log('Error while trying to sign a message ', e);
            reject(new Error((e && e.toString()) || 'Unknown error'));
          });
      });
    });
  }

  exportAccount(): Promise<any> {
    return Promise.reject(new Error('Not supported on this device'));
  }

  forgetDevice(): void {
    this.accounts = [];
    this.hdkMap = new Map();
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
    let dkey: HDKey;
    if (this.hdPath === HD_PATH_BASE.LedgerLive) {
      const path = this._getPathForIndex(i);
      dkey = this.hdkMap.get(path);
      console.log('dkey', dkey);
    } else {
      const hdk = this.hdkMap.get(this.hdPath);
      dkey = hdk.derive(`${pathBase}/${i}`);
    }
    const address = ethUtil
      .publicToAddress(dkey.publicKey, true)
      .toString('hex');
    return ethUtil.toChecksumAddress(`0x${address}`);
  }

  _pathFromAddress(address: string): string {
    return `${this.hdPath}/${this.indexFromAddress(address)}`;
  }

  indexFromAddress(address: string) {
    const checksummedAddress = ethUtil.toChecksumAddress(address);
    let index =
      this.paths[checksummedAddress] ||
      this.accountDetails[checksummedAddress]?.index;

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
    return index;
  }

  async getCurrentAccounts() {
    await this.unlock(0, 51);
    const addresses = await this.getAccounts();
    const currentPublicKey = this.getPathBasePublicKey();

    const accounts: Account[] = [];

    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];
      await this._fixAccountDetail(address);

      const detail = this.accountDetails[ethUtil.toChecksumAddress(address)];

      if (detail?.hdPathBasePublicKey === currentPublicKey) {
        try {
          const account = {
            address,
            index: this.indexFromAddress(address) + 1,
          };
          accounts.push(account);
        } catch (e) {
          console.log('address not found', address);
        }
        continue;
      }

      // Live and BIP44 first account is the same
      // we need to check the first account when the path type is LedgerLive or BIP44
      const hdPathType = this.getCurrentUsedHDPathType();
      if (
        hdPathType !== LedgerHDPathType.Legacy &&
        (detail.hdPathType === LedgerHDPathType.LedgerLive ||
          detail.hdPathType === LedgerHDPathType.BIP44)
      ) {
        const info = this.getAccountInfo(address);
        if (info?.index === 1) {
          const firstAddress = this._addressFromIndex(pathBase, 0);

          if (isSameAddress(firstAddress, address)) {
            accounts.push(info);
          }
        }
      }
    }

    return accounts;
  }

  private getPathBasePublicKey() {
    let hdk: HDKey;
    if (this.hdPath === HD_PATH_BASE.LedgerLive) {
      const path = this._getPathForIndex(0);
      hdk = this.hdkMap.get(path);
    } else {
      hdk = this.hdkMap.get(this.hdPath);
    }
    return hdk.publicKey.toString('hex');
  }

  private async _fixAccountDetail(address: string) {
    const checksummedAddress = ethUtil.toChecksumAddress(address);
    const detail = this.accountDetails[checksummedAddress];

    // The detail is already fixed
    if (detail?.hdPathBasePublicKey && detail.hdPath) {
      return;
    }

    let addressInDevice;
    let index;

    try {
      index = this.indexFromAddress(address);
      addressInDevice = this._addressFromIndex(pathBase, index);
    } catch (e) {
      console.log('address not found', address);
    }

    if (!addressInDevice || !isSameAddress(address, addressInDevice)) {
      return;
    }

    this.accountDetails[checksummedAddress] = {
      ...detail,
      index,
      hdPath: this._pathFromAddress(address),
      hdPathType: LedgerHDPathType.BIP44,
      hdPathBasePublicKey: this.getPathBasePublicKey(),
    };
  }

  private getHDPathBase(hdPathType: HDPathType) {
    return HD_PATH_BASE[hdPathType];
  }

  async setHDPathType(hdPathType: HDPathType) {
    const hdPath = this.getHDPathBase(hdPathType);
    this.setHdPath(hdPath);
  }

  getCurrentUsedHDPathType() {
    return HD_PATH_TYPE[this.hdPath];
  }

  getAccountInfo(address: string) {
    const detail = this.accountDetails[ethUtil.toChecksumAddress(address)];
    if (detail) {
      const { hdPath, hdPathType, hdPathBasePublicKey } = detail;
      return {
        address,
        index: this.indexFromAddress(address) + 1,
        balance: null,
        hdPathType,
        hdPathBasePublicKey,
      };
    }
  }

  async getHdPath(address: string) {
    const detail = this.accountDetails[ethUtil.toChecksumAddress(address)];
    if (detail) {
      return detail.hdPath;
    }

    const path = this._getPathForIndex(this.paths[address]);

    if (path) {
      return path;
    }

    // old accounts not stored in paths and only support bip44
    this.setHdPath(HD_PATH_BASE.BIP44);
    await this.unlock();
    return `${this.hdPath}/${this.indexFromAddress(address)}`;
  }

  _isLedgerLiveHdPath() {
    return this.hdPath === "m/44'/60'/0'/0/0";
  }

  _getPathForIndex(index: number) {
    if (index === undefined || index === null) {
      return '';
    }
    // Check if the path is BIP 44 (Ledger Live)
    return this._isLedgerLiveHdPath()
      ? `m/44'/60'/${index}'/0/0`
      : `${this.hdPath}/${index}`;
  }
}

export default OneKeyKeyring;
