import EventEmitter from 'events';
import * as ethUtil from 'ethereumjs-util';
import * as sigUtil from 'eth-sig-util';
import {
  TransactionFactory,
  TypedTransaction,
  Transaction,
  FeeMarketEIP1559Transaction,
} from '@ethereumjs/tx';
import HDKey from 'hdkey';
import { isSameAddress } from '@/background/utils';
import { SignHelper } from './helper';
import { EVENTS } from '@/constant';
import HardwareSDK from '@onekeyfe/hd-web-sdk';
import { UI_RESPONSE, UI_EVENT, UI_REQUEST } from '@onekeyfe/hd-core';

const { HardwareWebSdk } = HardwareSDK;

const keyringType = 'Onekey Hardware';
const hdPathString = "m/44'/60'/0'/0";
const pathBase = 'm';
const MAX_INDEX = 1000;
const DELAY_BETWEEN_POPUPS = 1000;

interface Account {
  address: string;
  index: number;
}

interface AccountDetail {
  hdPathBasePublicKey?: string;
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
  deviceId: string | null = null;
  connectId: string | null = null;
  passphraseState: string | undefined = undefined;
  accountDetails: Record<string, AccountDetail>;

  signHelper = new SignHelper({
    errorEventName: EVENTS.COMMON_HARDWARE.REJECTED,
  });

  constructor(opts = {}) {
    super();
    this.accountDetails = {};
    this.deserialize(opts);
    HardwareWebSdk.init({
      debug: false,
      // The official iframe page deployed by OneKey
      // of course you can also deploy it yourself
      connectSrc: 'https://jssdk.onekey.so/0.3.27/',
    });
    HardwareWebSdk.on(UI_EVENT, (e) => {
      switch (e.type) {
        case UI_REQUEST.REQUEST_PIN:
          HardwareWebSdk.uiResponse({
            type: UI_RESPONSE.RECEIVE_PIN,
            payload: '@@ONEKEY_INPUT_PIN_IN_DEVICE',
          });
          break;
        case UI_REQUEST.REQUEST_PASSPHRASE:
          HardwareWebSdk.uiResponse({
            type: UI_RESPONSE.RECEIVE_PASSPHRASE,
            payload: {
              value: '',
              passphraseOnDevice: true,
              save: true,
            },
          });
          break;
        default:
        // NOTHING
      }
    });
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
    this.hdPath = opts.hdPath || hdPathString;
    this.accounts = opts.accounts || [];
    this.page = opts.page || 0;
    this.perPage = 5;
    this.paths = opts.paths || {};
    this.accountDetails = opts.accountDetails || {};
    return Promise.resolve();
  }

  isUnlocked(): boolean {
    return Boolean(this.hdk && this.hdk.publicKey);
  }

  cleanUp() {
    this.hdk = new HDKey();
  }

  resend() {
    this.signHelper.resend();
  }

  resetResend() {
    this.signHelper.resetResend();
  }

  unlock(): Promise<string> {
    // if (this.isUnlocked()) {
    //   return Promise.resolve('already unlocked');
    // }
    return new Promise((resolve, reject) => {
      HardwareWebSdk.searchDevices()
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
            const passphraseState = await HardwareWebSdk.getPassphraseState(
              connectId
            );
            if (!passphraseState.success) {
              reject('getPassphraseState failed');
              return;
            }
            this.passphraseState = passphraseState.payload;
            HardwareWebSdk.evmGetPublicKey(connectId, deviceId, {
              showOnOneKey: false,
              chainId: 1,
              path: hdPathString,
              passphraseState: passphraseState.payload,
            }).then((res) => {
              if (res.success) {
                this.hdk.publicKey = Buffer.from(res.payload.publicKey, 'hex');
                this.hdk.chainCode = Buffer.from(
                  res.payload.node.chain_code,
                  'hex'
                );
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
    const checksummedAddress = ethUtil.toChecksumAddress(address);
    delete this.accountDetails[checksummedAddress];
    delete this.paths[checksummedAddress];
  }

  // tx is an instance of the ethereumjs-transaction class.
  signTransaction(address: string, tx: TypedTransaction): Promise<any> {
    return this.signHelper.invoke(async () => {
      return new Promise((resolve, reject) => {
        this.unlock()
          .then((status) => {
            setTimeout(
              (_) => {
                HardwareWebSdk.evmSignTransaction(
                  this.connectId!,
                  this.deviceId!,
                  {
                    path: this._pathFromAddress(address),
                    passphraseState: this.passphraseState,
                    transaction: {
                      to: tx.to!.toString(),
                      value: `0x${tx.value.toString('hex')}`,
                      data: this._normalize(tx.data),
                      chainId: tx.common.chainIdBN().toNumber(),
                      nonce: `0x${tx.nonce.toString('hex')}`,
                      gasLimit: `0x${tx.gasLimit.toString('hex')}`,
                      gasPrice: `0x${
                        (tx as Transaction).gasPrice
                          ? (tx as Transaction).gasPrice.toString('hex')
                          : (tx as FeeMarketEIP1559Transaction).maxFeePerGas.toString(
                              'hex'
                            )
                      }`,
                    },
                  }
                ).then((res) => {
                  if (res.success) {
                    const txData = tx.toJSON();
                    txData.v = res.payload.v;
                    txData.r = res.payload.r;
                    txData.s = res.payload.s;

                    const signedTx = TransactionFactory.fromTxData(txData);

                    const addressSignedWith = ethUtil.toChecksumAddress(
                      address
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
                        (res.payload && res.payload.error) || 'Unknown error'
                      )
                    );
                  }
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
              (_) => {
                HardwareWebSdk.evmSignMessage(this.connectId!, this.deviceId!, {
                  path: this._pathFromAddress(withAccount),
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
              (_) => {
                try {
                  HardwareWebSdk.evmSignTypedData(
                    this.connectId!,
                    this.deviceId!,
                    {
                      path: this._pathFromAddress(address),
                      data: typedData,
                      passphraseState: this.passphraseState,
                      metamaskV4Compat: isV4,
                      domainHash: domainSeparatorHex,
                      messageHash: hashStructMessageHex,
                      chainId: domain.chainId
                        ? Number(domain.chainId)
                        : undefined,
                    }
                  )
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
    return `${this.hdPath}/${this.indexFromAddress(address)}`;
  }

  indexFromAddress(address: string) {
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
    return index;
  }

  async getCurrentAccounts() {
    await this.unlock();
    const addresses = await this.getAccounts();
    const currentPublicKey = this.getPathBasePublicKey();
    const accounts: Account[] = [];

    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];
      await this._fixAccountDetail(address);

      const detail = this.accountDetails[ethUtil.toChecksumAddress(address)];

      if (detail?.hdPathBasePublicKey !== currentPublicKey) {
        continue;
      }

      try {
        const account = {
          address,
          index: this.indexFromAddress(address) + 1,
        };
        accounts.push(account);
      } catch (e) {
        console.log('address not found', address);
      }
    }

    return accounts;
  }

  private getPathBasePublicKey() {
    return this.hdk.publicKey.toString('hex');
  }

  private async _fixAccountDetail(address: string) {
    const checksummedAddress = ethUtil.toChecksumAddress(address);
    const detail = this.accountDetails[checksummedAddress];

    // The detail is already fixed
    if (detail?.hdPathBasePublicKey) {
      return;
    }

    let addressInDevice;

    try {
      const index = this.indexFromAddress(address);
      addressInDevice = this._addressFromIndex(pathBase, index);
    } catch (e) {
      console.log('address not found', address);
    }

    if (!addressInDevice || !isSameAddress(address, addressInDevice)) {
      return;
    }

    this.accountDetails[checksummedAddress] = {
      ...detail,
      hdPathBasePublicKey: this.getPathBasePublicKey(),
    };
  }
}

export default OneKeyKeyring;
