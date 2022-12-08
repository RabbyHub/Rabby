// fork from https://github.com/MetaMask/eth-trezor-keyring/blob/main/index.js

import { EventEmitter } from 'events';
import * as ethUtil from 'ethereumjs-util';
import { TransactionFactory } from '@ethereumjs/tx';
import HDKey from 'hdkey';
import transformTypedData from 'trezor-connect/lib/plugins/ethereum/typedData';
import { initHDKeyring, invokeHDKeyring } from './hd-proxy';

const hdPathString = "m/44'/60'/0'/0";
const SLIP0044TestnetPath = `m/44'/1'/0'/0`;
const keyringType = 'Trezor Hardware';
const pathBase = 'm';
const MAX_INDEX = 1000;
const DELAY_BETWEEN_POPUPS = 1000;
const TREZOR_CONNECT_MANIFEST = {
  email: 'support@debank.com/',
  appUrl: 'https://debank.com/',
};

const ALLOWED_HD_PATHS = {
  [hdPathString]: true,
  [SLIP0044TestnetPath]: true,
};

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @typedef {import('@ethereumjs/tx').TypedTransaction} TypedTransaction
 * @typedef {InstanceType<import("ethereumjs-tx")>} OldEthJsTransaction
 */

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

class TrezorKeyring extends EventEmitter {
  static type = keyringType;
  type = keyringType;
  accounts: string[] = [];
  hdk = new HDKey();
  page = 0;
  perPage = 5;
  unlockedAccount = 0;
  paths = {};
  hdPath = '';
  model: string = '';

  constructor(opts = {}) {
    super();
    this.deserialize(opts);
    this.init();
  }

  private async init() {
    await initHDKeyring('TREZOR');
  }

  /**
   * Gets the model, if known.
   * This may be `undefined` if the model hasn't been loaded yet.
   *
   * @returns {"T" | "1" | undefined}
   */
  getModel() {
    return this.model;
  }

  dispose() {
    // TrezorConnect.dispose();
    invokeHDKeyring('TREZOR', 'close');
  }

  serialize() {
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

  isUnlocked() {
    return Boolean(this.hdk && this.hdk.publicKey);
  }

  unlock() {
    if (this.isUnlocked()) {
      return Promise.resolve('already unlocked');
    }
    return new Promise((resolve, reject) => {
      // TrezorConnect.getPublicKey({
      invokeHDKeyring('TREZOR', 'getPublicKey', [
        {
          path: this.hdPath,
          coin: 'ETH',
        },
      ])
        .then((response) => {
          if (response.success) {
            this.hdk.publicKey = Buffer.from(response.payload.publicKey, 'hex');
            this.hdk.chainCode = Buffer.from(response.payload.chainCode, 'hex');
            resolve('just unlocked');
          } else {
            reject(
              new Error(
                (response.payload && response.payload.error) || 'Unknown error'
              )
            );
          }
        })
        .catch((e) => {
          reject(new Error((e && e.toString()) || 'Unknown error'));
        });
    });
  }

  setAccountToUnlock(index) {
    this.unlockedAccount = parseInt(index, 10);
  }

  addAccounts(n = 1) {
    return new Promise((resolve, reject) => {
      this.unlock()
        .then((_) => {
          const from = this.unlockedAccount;
          const to = from + n;

          for (let i = from; i < to; i++) {
            const address = this._addressFromIndex(pathBase, i);
            if (!this.accounts.includes(address)) {
              this.accounts.push(address);
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

  getAddresses(start: number, end: number): Promise<any> {
    return new Promise((resolve, reject) => {
      this.unlock()
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

  getAccounts() {
    return Promise.resolve(this.accounts.slice());
  }

  removeAccount(address) {
    if (
      !this.accounts.map((a) => a.toLowerCase()).includes(address.toLowerCase())
    ) {
      throw new Error(`Address ${address} not found in this keyring`);
    }

    this.accounts = this.accounts.filter(
      (a) => a.toLowerCase() !== address.toLowerCase()
    );
  }

  /**
   * Signs a transaction using Trezor.
   *
   * Accepts either an ethereumjs-tx or @ethereumjs/tx transaction, and returns
   * the same type.
   *
   * @template {TypedTransaction | OldEthJsTransaction} Transaction
   * @param {string} address - Hex string address.
   * @param {Transaction} tx - Instance of either new-style or old-style ethereumjs transaction.
   * @returns {Promise<Transaction>} The signed transaction, an instance of either new-style or old-style
   * ethereumjs transaction.
   */
  signTransaction(address, tx) {
    if (isOldStyleEthereumjsTx(tx)) {
      // In this version of ethereumjs-tx we must add the chainId in hex format
      // to the initial v value. The chainId must be included in the serialized
      // transaction which is only communicated to ethereumjs-tx in this
      // value. In newer versions the chainId is communicated via the 'Common'
      // object.
      return this._signTransaction(address, tx.getChainId(), tx, (payload) => {
        tx.v = Buffer.from(payload.v, 'hex');
        tx.r = Buffer.from(payload.r, 'hex');
        tx.s = Buffer.from(payload.s, 'hex');
        return tx;
      });
    }
    return this._signTransaction(
      address,
      tx.common.chainIdBN().toNumber(),
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
    );
  }

  /**
   *
   * @template {TypedTransaction | OldEthJsTransaction} Transaction
   * @param {string} address - Hex string address.
   * @param {number} chainId - Chain ID
   * @param {Transaction} tx - Instance of either new-style or old-style ethereumjs transaction.
   * @param {(import('trezor-connect').EthereumSignedTx) => Transaction} handleSigning - Converts signed transaction
   * to the same new-style or old-style ethereumjs-tx.
   * @returns {Promise<Transaction>} The signed transaction, an instance of either new-style or old-style
   * ethereumjs transaction.
   */
  async _signTransaction(address, chainId, tx, handleSigning) {
    let transaction;
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

    try {
      const status = await this.unlock();
      await wait(status === 'just unlocked' ? DELAY_BETWEEN_POPUPS : 0);
      // const response = await TrezorConnect.ethereumSignTransaction({
      const response = await invokeHDKeyring(
        'TREZOR',
        'ethereumSignTransaction',
        [
          {
            path: this._pathFromAddress(address),
            transaction,
          },
        ]
      );
      if (response.success) {
        const newOrMutatedTx = handleSigning(response.payload);

        const addressSignedWith = ethUtil.toChecksumAddress(
          ethUtil.addHexPrefix(
            newOrMutatedTx.getSenderAddress().toString('hex')
          )
        );
        const correctAddress = ethUtil.toChecksumAddress(address);
        if (addressSignedWith !== correctAddress) {
          throw new Error("signature doesn't match the right address");
        }

        return newOrMutatedTx;
      }
      throw new Error(
        (response.payload && response.payload.error) || 'Unknown error'
      );
    } catch (e: any) {
      throw new Error((e && e.toString()) || 'Unknown error');
    }
  }

  signMessage(withAccount, data) {
    return this.signPersonalMessage(withAccount, data);
  }

  // For personal_sign, we need to prefix the message:
  signPersonalMessage(withAccount, message) {
    return new Promise((resolve, reject) => {
      this.unlock()
        .then((status) => {
          setTimeout(
            (_) => {
              // TrezorConnect.ethereumSignMessage({
              invokeHDKeyring('TREZOR', 'ethereumSignMessage', [
                {
                  path: this._pathFromAddress(withAccount),
                  message: ethUtil.stripHexPrefix(message),
                  hex: true,
                },
              ])
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
                  reject(new Error((e && e.toString()) || 'Unknown error'));
                });
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
  }

  /**
   * EIP-712 Sign Typed Data
   */
  async signTypedData(address, data, { version }) {
    await wait(500);
    const dataWithHashes = transformTypedData(data, version === 'V4');

    // set default values for signTypedData
    // Trezor is stricter than @metamask/eth-sig-util in what it accepts
    const {
      types: { EIP712Domain = [], ...otherTypes } = {},
      message = {},
      domain = {},
      primaryType,
      // snake_case since Trezor uses Protobuf naming conventions here
      domain_separator_hash, // eslint-disable-line camelcase
      message_hash, // eslint-disable-line camelcase
    } = dataWithHashes;

    // This is necessary to avoid popup collision
    // between the unlock & sign trezor popups
    const status = await this.unlock();
    await wait(status === 'just unlocked' ? DELAY_BETWEEN_POPUPS : 0);
    const params = {
      path: this._pathFromAddress(address),
      data: {
        types: { EIP712Domain, ...otherTypes },
        message,
        domain,
        primaryType,
      },
      metamask_v4_compat: true,
      // Trezor 1 only supports blindly signing hashes
      domain_separator_hash,
      message_hash,
    };
    // const response = await TrezorConnect.ethereumSignTypedData(params);
    const response = await invokeHDKeyring('TREZOR', 'ethereumSignTypedData', [
      params,
    ]);

    if (response.success) {
      if (ethUtil.toChecksumAddress(address) !== response.payload.address) {
        throw new Error('signature doesnt match the right address');
      }
      return response.payload.signature;
    }

    throw new Error(
      (response.payload && response.payload.error) || 'Unknown error'
    );
  }

  exportAccount() {
    return Promise.reject(new Error('Not supported on this device'));
  }

  forgetDevice() {
    this.accounts = [];
    this.hdk = new HDKey();
    this.page = 0;
    this.unlockedAccount = 0;
    this.paths = {};
  }

  /**
   * Set the HD path to be used by the keyring. Only known supported HD paths are allowed.
   *
   * If the given HD path is already the current HD path, nothing happens. Otherwise the new HD
   * path is set, and the wallet state is completely reset.
   *
   * @throws {Error} Throws if the HD path is not supported.
   *
   * @param {string} hdPath - The HD path to set.
   */
  // setHdPath(hdPath) {
  //   if (!ALLOWED_HD_PATHS[hdPath]) {
  //     throw new Error(
  //       `The setHdPath method does not support setting HD Path to ${hdPath}`,
  //     );
  //   }

  //   // Reset HDKey if the path changes
  //   if (this.hdPath !== hdPath) {
  //     this.hdk = new HDKey();
  //     this.accounts = [];
  //     this.page = 0;
  //     this.perPage = 5;
  //     this.unlockedAccount = 0;
  //     this.paths = {};
  //   }
  //   this.hdPath = hdPath;
  // }

  /* PRIVATE METHODS */

  _normalize(buf) {
    return ethUtil.bufferToHex(buf).toString();
  }

  // eslint-disable-next-line no-shadow
  _addressFromIndex(pathBase, i) {
    const dkey = this.hdk.derive(`${pathBase}/${i}`);
    const address = ethUtil
      .publicToAddress(dkey.publicKey, true)
      .toString('hex');
    return ethUtil.toChecksumAddress(`0x${address}`);
  }

  _pathFromAddress(address) {
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

export default TrezorKeyring;
