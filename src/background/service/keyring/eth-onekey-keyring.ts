import EventEmitter from 'events';
import OneKeyConnect from '@onekeyfe/js-sdk';
import transformTypedData from '@onekeyfe/js-sdk/lib/plugins/ethereum/typedData';
import * as ethUtil from 'ethereumjs-util';
import Transaction from 'ethereumjs-tx';
import HDKey from 'hdkey';

const keyringType = 'Onekey Hardware';
const hdPathString = "m/44'/60'/0'/0";
const pathBase = 'm';
const MAX_INDEX = 1000;
const DELAY_BETWEEN_POPUPS = 1000;
const ONEKEY_CONNECT_MANIFEST = {
  email: 'support@debank.com/',
  appUrl: 'https://debank.com/',
};

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class OneKeyKeyring extends EventEmitter {
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
    OneKeyConnect.manifest(ONEKEY_CONNECT_MANIFEST);
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

  isUnlocked(): boolean {
    return Boolean(this.hdk && this.hdk.publicKey);
  }

  unlock(): Promise<string> {
    if (this.isUnlocked()) {
      return Promise.resolve('already unlocked');
    }
    return new Promise((resolve, reject) => {
      OneKeyConnect.getPublicKey({
        path: this.hdPath,
        coin: 'ETH',
      })
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

  setAccountToUnlock(index: string): void {
    this.unlockedAccount = parseInt(index, 10);
  }

  addAccounts(n = 1): Promise<any> {
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
  }

  // tx is an instance of the ethereumjs-transaction class.
  signTransaction(address: string, tx: Transaction): Promise<any> {
    return new Promise((resolve, reject) => {
      this.unlock()
        .then((status) => {
          setTimeout(
            (_) => {
              OneKeyConnect.ethereumSignTransaction({
                path: this._pathFromAddress(address),
                transaction: {
                  to: this._normalize(tx.to),
                  value: this._normalize(tx.value),
                  data: this._normalize(tx.data),
                  chainId: tx._chainId,
                  nonce: this._normalize(tx.nonce),
                  gasLimit: this._normalize(tx.gasLimit),
                  gasPrice: this._normalize(tx.gasPrice),
                },
              })
                .then((response: any) => {
                  if (response.success) {
                    tx.v = response.payload.v;
                    tx.r = response.payload.r;
                    tx.s = response.payload.s;

                    const signedTx = new Transaction(tx);

                    const addressSignedWith = ethUtil.toChecksumAddress(
                      `0x${signedTx.from.toString('hex')}`
                    );
                    const correctAddress = ethUtil.toChecksumAddress(address);
                    if (addressSignedWith !== correctAddress) {
                      reject(
                        new Error('signature doesnt match the right address')
                      );
                    }

                    resolve(signedTx);
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

  signMessage(withAccount: string, data: string): Promise<any> {
    return this.signPersonalMessage(withAccount, data);
  }

  // For personal_sign, we need to prefix the message:
  signPersonalMessage(withAccount: string, message: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.unlock()
        .then((status) => {
          setTimeout(
            (_) => {
              OneKeyConnect.ethereumSignMessage({
                path: this._pathFromAddress(withAccount),
                message: ethUtil.stripHexPrefix(message),
                hex: true,
              })
                .then((response: any) => {
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
  }

  async signTypedData(address, data, { version }) {
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

    const response = await OneKeyConnect.ethereumSignTypedData(params);

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

export default OneKeyKeyring;
