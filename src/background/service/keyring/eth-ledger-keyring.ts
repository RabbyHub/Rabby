import {
  recoverPersonalSignature,
  recoverTypedSignature,
  SignTypedDataVersion,
} from '@metamask/eth-sig-util';
import {
  toChecksumAddress,
  addHexPrefix,
  stripHexPrefix,
  bytesToHex,
} from '@ethereumjs/util';
import { RLP, utils } from '@ethereumjs/rlp';
import {
  CloseAppCommand,
  DeviceActionStatus,
  DeviceSessionStateType,
  DeviceStatus,
  DeviceManagementKitBuilder,
  GetAppAndVersionCommand,
  OpenAppDeviceAction,
  UserInteractionRequired,
  isSuccessCommandResult,
} from '@ledgerhq/device-management-kit';

import type {
  DeviceManagementKit,
  DeviceSessionState,
  DeviceSessionId,
  ExecuteDeviceActionReturnType,
} from '@ledgerhq/device-management-kit';
import {
  webHidIdentifier,
  webHidTransportFactory,
} from '@ledgerhq/device-transport-kit-web-hid';
import { SignerEthBuilder } from '@ledgerhq/device-signer-kit-ethereum';
import {
  ContextModuleBuilder,
  ContextModuleChainID,
} from '@ledgerhq/context-module';

import type {
  Signature,
  SignerEth,
} from '@ledgerhq/device-signer-kit-ethereum';
import type {
  BlindSigningReporter,
  TypedDataContextLoader,
} from '@ledgerhq/context-module';
import { firstValueFrom, filter, map, take, timeout } from 'rxjs';
import { is1559Tx } from '@/utils/transaction';
import {
  TransactionFactory,
  FeeMarketEIP1559Transaction,
} from '@ethereumjs/tx';
import { isSameAddress } from '@/background/utils';
import { LedgerHDPathType } from './helper';

const type = 'Ledger Hardware';

import HDPathType = LedgerHDPathType;
import Browser from 'webextension-polyfill';
import {
  LedgerAction,
  OffscreenCommunicationTarget,
} from '@/constant/offscreen-communication';
import { isManifestV3 } from '@/utils/env';

const HD_PATH_BASE = {
  [HDPathType.BIP44]: "m/44'/60'/0'/0",
  [HDPathType.Legacy]: "m/44'/60'/0'",
  [HDPathType.LedgerLive]: "m/44'/60'/0'/0/0",
};

const HD_PATH_TYPE = {
  [HD_PATH_BASE['Legacy']]: HDPathType.Legacy,
  [HD_PATH_BASE['BIP44']]: HDPathType.BIP44,
  [HD_PATH_BASE['LedgerLive']]: HDPathType.LedgerLive,
};

const ETH_APP_NAME = 'Ethereum';
const LEDGER_DISCOVERY_TIMEOUT = 15000;
const LEDGER_BUSY_RECHECK_TIMEOUT = 10000;
const LEDGER_APP_OPEN_TIMEOUT = 30000;
const LEDGER_DEVICE_ACTION_TIMEOUT = 60000;
const LEDGER_ERROR_KEYS = [
  '_tag',
  'name',
  'message',
  'statusCode',
  'statusText',
  'errorCode',
  'reason',
  'code',
  'originalError',
  'cause',
];

let dmk: DeviceManagementKit | null = null;
let sessionId: DeviceSessionId | null = null;
let ethSigner: SignerEth | null = null;
let makeAppPromise: Promise<void> | null = null;

const ledgerClearSigningDisabledTypedDataLoader: TypedDataContextLoader = {
  load: async () => ({
    type: 'error',
    error: new Error('Ledger clear signing disabled'),
  }),
};

const noOpBlindSigningReporter = ({
  report: async () => undefined,
} as unknown) as BlindSigningReporter;

const getBasicEthContextModule = () =>
  new ContextModuleBuilder({})
    .setChain(ContextModuleChainID.Ethereum)
    .setBlindSigningReporter(noOpBlindSigningReporter)
    .removeDefaultLoaders()
    .addTypedDataLoader(ledgerClearSigningDisabledTypedDataLoader)
    .build();

const stringifyLedgerErrorValue = (value: unknown, key?: string): string => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') {
    return key?.toLowerCase().includes('code')
      ? `0x${value.toString(16)}`
      : String(value);
  }
  if (typeof value === 'boolean') return String(value);
  if (value instanceof Error) return value.message || value.name;
  if (Array.isArray(value)) {
    return value
      .map((item) => stringifyLedgerErrorValue(item))
      .filter(Boolean)
      .join(' ');
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const parts = LEDGER_ERROR_KEYS.map((item) =>
      stringifyLedgerErrorValue(record[item], item)
    ).filter(Boolean);
    if (parts.length) return [...new Set(parts)].join(' ');
    const message = String(value);
    if (message && message !== '[object Object]') return message;
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }
  return String(value);
};

const isLedgerConnectionOpeningError = (value: unknown) =>
  /connectionopeningerror/iu.test(stringifyLedgerErrorValue(value));

const normalizeLedgerStatusWord = (value: unknown) => {
  if (typeof value === 'number') return value.toString(16);
  if (typeof value === 'string')
    return value.replace(/^0x/iu, '').toLowerCase();
  return '';
};

const getLedgerStatusWord = (err: unknown) => {
  const value = err as any;
  const code = normalizeLedgerStatusWord(
    value?.statusCode ??
      value?.errorCode ??
      value?.originalError?.statusCode ??
      value?.originalError?.errorCode
  );

  if (code) return code;
  return value?._tag === 'RefusedByUserDAError' ? '6985' : '';
};

export const getLedgerErrorMessage = (err: unknown, fallback: string) =>
  [stringifyLedgerErrorValue(err) || fallback, getLedgerStatusWord(err)]
    .filter(Boolean)
    .reduce((message, statusWord) => {
      const normalizedStatus = `0x${statusWord}`;
      return message.toLowerCase().includes(normalizedStatus)
        ? message
        : `${message} ${normalizedStatus}`;
    });

const toLedgerError = (err: unknown, fallback: string) =>
  new Error(getLedgerErrorMessage(err, fallback));

const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const getDmk = () => {
  if (!dmk) {
    dmk = new DeviceManagementKitBuilder()
      .addTransport(webHidTransportFactory)
      .build();
  }

  return dmk;
};

const runDeviceAction = async <Output>(
  action: ExecuteDeviceActionReturnType<Output, any, any>,
  timeoutMs = LEDGER_DEVICE_ACTION_TIMEOUT
): Promise<Output> => {
  try {
    return await firstValueFrom(
      action.observable.pipe(
        filter((state) => {
          if (
            state.status === DeviceActionStatus.Pending &&
            state.intermediateValue?.requiredUserInteraction ===
              UserInteractionRequired.UnlockDevice
          ) {
            throw new Error('Ledger: Device is locked 0x5515');
          }

          return (
            state.status === DeviceActionStatus.Completed ||
            state.status === DeviceActionStatus.Error ||
            state.status === DeviceActionStatus.Stopped
          );
        }),
        timeout({ first: timeoutMs }),
        take(1),
        map((state) => {
          switch (state.status) {
            case DeviceActionStatus.Completed:
              return state.output;
            case DeviceActionStatus.Error:
              throw toLedgerError(
                state.error,
                'Ledger: Unknown device action error'
              );
            case DeviceActionStatus.Stopped:
              throw new Error('Ledger: Operation stopped');
            default:
              throw new Error('Ledger: Unexpected device action state');
          }
        })
      )
    );
  } catch (e: any) {
    if (e.name === 'TimeoutError') {
      try {
        action.cancel();
      } catch {
        // Preserve the timeout as the actionable error.
      }
      throw new Error('Ledger: Operation timed out');
    }
    throw e;
  }
};

const toLegacySignaturePayload = (signature: Signature) => {
  const v = signature.v.toString(16).padStart(2, '0');

  return {
    r: stripHexPrefix(signature.r),
    s: stripHexPrefix(signature.s),
    v,
  };
};

const toSignatureHex = (signature: Signature) => {
  const payload = toLegacySignaturePayload(signature);

  return `0x${payload.r}${payload.s}${payload.v}`;
};

interface Account {
  address: string;
  balance: number | null;
  index: number;
}

interface AccountDetail {
  hdPath: string;
  hdPathBasePublicKey?: string;
  hdPathType?: HDPathType;
}

class LedgerBridgeKeyring {
  accountDetails: Record<string, AccountDetail>;
  static type = type;
  type = type;
  page: number;
  perPage: number;
  unlockedAccount: number;
  paths: Record<string, number>;
  hdPath: any;
  accounts: any;
  hasHIDPermission: null | boolean;
  usedHDPathTypeList: Record<string, HDPathType> = {};
  private unlockPromise: Promise<string> | null = null;

  constructor(opts = {}) {
    this.accountDetails = {};
    this.page = 0;
    this.perPage = 5;
    this.unlockedAccount = 0;
    this.paths = {};
    this.hasHIDPermission = null;
    this.usedHDPathTypeList = {};
    this.deserialize(opts);

    if (isManifestV3) {
      Browser.runtime.onMessage.addListener((request) => {
        if (
          request.target === OffscreenCommunicationTarget.extension &&
          request.event === LedgerAction.ledgerDeviceDisconnect
        ) {
          this.cleanUp();
        }
      });
    }
  }

  serialize() {
    return Promise.resolve({
      hdPath: this.hdPath,
      accounts: this.accounts,
      accountDetails: this.accountDetails,
      hasHIDPermission: this.hasHIDPermission,
      usedHDPathTypeList: this.usedHDPathTypeList,
    });
  }

  deserialize(opts: any = {}) {
    this.hdPath = opts.hdPath || HD_PATH_BASE['Legacy'];
    this.accounts = opts.accounts || [];
    this.accountDetails = opts.accountDetails || {};
    if (opts.hasHIDPermission !== undefined) {
      this.hasHIDPermission = opts.hasHIDPermission;
    }

    if (!opts.accountDetails) {
      this._migrateAccountDetails(opts);
    }

    if (opts.usedHDPathTypeList) {
      this.usedHDPathTypeList = opts.usedHDPathTypeList;
    }

    // Remove accounts that don't have corresponding account details
    this.accounts = this.accounts.filter((account) =>
      Object.keys(this.accountDetails).includes(toChecksumAddress(account))
    );

    return Promise.resolve();
  }

  _migrateAccountDetails(opts) {
    if (opts.accountIndexes) {
      for (const account of Object.keys(opts.accountIndexes)) {
        this.accountDetails[account] = {
          hdPath: this._getPathForIndex(opts.accountIndexes[account]),
        };
      }
    }
  }

  isUnlocked() {
    return !!ethSigner && !!sessionId;
  }

  setAccountToUnlock(index) {
    this.unlockedAccount = parseInt(index, 10);
  }

  setHdPath(hdPath) {
    this.hdPath = hdPath;
  }

  private async getCurrentSessionState() {
    if (!sessionId || !dmk) {
      return null;
    }

    try {
      return await firstValueFrom(
        dmk.getDeviceSessionState({ sessionId }).pipe(take(1))
      );
    } catch {
      await this.cleanUp();
      return null;
    }
  }

  private buildSigner() {
    if (!dmk || !sessionId) {
      return;
    }
    ethSigner = new SignerEthBuilder({
      dmk,
      sessionId,
    })
      .withContextModule(getBasicEthContextModule())
      .build();
  }

  private async hasActiveSession() {
    const state = await this.getCurrentSessionState();

    if (!state) {
      return false;
    }

    if (state.deviceStatus === DeviceStatus.NOT_CONNECTED) {
      await this.cleanUp();
      return false;
    }

    if (!ethSigner) {
      this.buildSigner();
    }

    return !!ethSigner;
  }

  async makeApp() {
    if (await this.hasActiveSession()) {
      return;
    }

    if (makeAppPromise) {
      await makeAppPromise;
      return;
    }

    makeAppPromise = (async () => {
      if (await this.hasActiveSession()) {
        return;
      }

      const kit = getDmk();
      let devices;
      try {
        devices = await firstValueFrom(
          kit.listenToAvailableDevices({ transport: webHidIdentifier }).pipe(
            filter((availableDevices) => availableDevices.length > 0),
            take(1),
            timeout({ first: LEDGER_DISCOVERY_TIMEOUT })
          )
        );
      } catch (e: any) {
        if (e.name === 'TimeoutError') {
          throw new Error('Ledger: No connected Ledger device found');
        }

        throw e;
      }

      if (devices.length > 1) {
        throw new Error('Ledger: Multiple Ledger devices detected');
      }

      const nextSessionId = await kit.connect({
        device: devices[0],
        sessionRefresherOptions: {
          isRefresherDisabled: false,
        },
      });
      sessionId = nextSessionId;
      this.buildSigner();
      await this.ensureDeviceReady();
    })();

    try {
      await makeAppPromise;
    } finally {
      makeAppPromise = null;
    }
  }

  private async ensureDeviceReady() {
    const state = await this.getCurrentSessionState();
    console.log('Ledger: Current device state ensureDeviceReady', state);

    if (!state) {
      throw new Error('Ledger: Device disconnected');
    }

    if (state.deviceStatus === DeviceStatus.CONNECTED) {
      return state;
    }

    if (state.deviceStatus === DeviceStatus.BUSY) {
      await delay(LEDGER_BUSY_RECHECK_TIMEOUT);
      const nextState = await this.getCurrentSessionState();
      if (nextState?.deviceStatus !== DeviceStatus.BUSY) {
        if (!nextState) {
          throw new Error('Ledger: Device disconnected');
        }
        return this.assertDeviceReady(nextState);
      }
      throw new Error('Ledger: Device busy');
    }

    return this.assertDeviceReady(state);
  }

  private assertDeviceReady(state: DeviceSessionState) {
    switch (state.deviceStatus) {
      case DeviceStatus.CONNECTED:
        return state;
      case DeviceStatus.LOCKED:
        throw new Error('Ledger: Device is locked 0x5515');
      case DeviceStatus.NOT_CONNECTED:
        throw new Error('Ledger: Device disconnected');
      case DeviceStatus.BUSY:
        throw new Error('Ledger: Device busy');
      default:
        throw new Error('Ledger: Unexpected device state');
    }
  }

  private async ensureEthApp(recoverConnectionOpening = true): Promise<void> {
    await this.makeApp();
    const state = await this.ensureDeviceReady();
    console.log('Ledger: Current device state', state);

    if (
      state.sessionStateType !== DeviceSessionStateType.Connected &&
      state.currentApp.name === ETH_APP_NAME
    ) {
      return;
    }

    try {
      await runDeviceAction(
        getDmk().executeDeviceAction({
          sessionId: sessionId!,
          deviceAction: new OpenAppDeviceAction({
            input: {
              appName: ETH_APP_NAME,
            },
          }),
        }),
        LEDGER_APP_OPEN_TIMEOUT
      );
    } catch (e) {
      if (!recoverConnectionOpening || !isLedgerConnectionOpeningError(e)) {
        if (!recoverConnectionOpening && isLedgerConnectionOpeningError(e)) {
          if (typeof e === 'object' && e !== null) {
            (e as {
              ledgerConnectionRecoveryAttempted?: boolean;
            }).ledgerConnectionRecoveryAttempted = true;
          }
        }
        throw e;
      }

      await this.cleanUp();
      await this.ensureEthApp(false);
    }
  }

  async cleanUp() {
    const currentSessionId = sessionId;
    ethSigner = null;
    sessionId = null;

    if (currentSessionId && dmk) {
      await dmk.disconnect({ sessionId: currentSessionId }).catch(() => {
        // The device may already be gone or closed by the OS app command.
      });
    }
  }

  async unlock(
    hdPath?,
    force?: boolean,
    retryConnectionOpening = true
  ): Promise<string> {
    if (this.unlockPromise) {
      return this.unlockPromise;
    }

    const promise = this.unlockInternal(hdPath, force, retryConnectionOpening);
    this.unlockPromise = promise;
    try {
      return await promise;
    } finally {
      if (this.unlockPromise === promise) {
        this.unlockPromise = null;
      }
    }
  }

  private async unlockInternal(
    hdPath?,
    force?: boolean,
    retryConnectionOpening = true
  ): Promise<string> {
    if (force) {
      hdPath = this.hdPath;
    }
    if (this.isUnlocked() && !hdPath) {
      return 'already unlocked';
    }
    const path = hdPath ? this._toLedgerPath(hdPath) : this.hdPath;

    let res: { address: string };
    try {
      res = await this.getLedgerAddress(path);
    } catch (e: any) {
      const message = e?.message || '';
      const isDisconnected =
        e.name === 'DisconnectedDeviceDuringOperation' ||
        e.name === 'DeviceDisconnectedWhileSendingError' ||
        /DisconnectedDeviceDuringOperation|DeviceDisconnectedWhileSendingError/i.test(
          message
        );
      const isConnectionOpening =
        retryConnectionOpening &&
        !e?.ledgerConnectionRecoveryAttempted &&
        isLedgerConnectionOpeningError(e);
      if (isDisconnected || isConnectionOpening) {
        await this.cleanUp();
        return this.unlockInternal(hdPath, force, false);
      } else {
        throw e;
      }
    }

    return res?.address;
  }

  addAccounts(n = 1) {
    return new Promise((resolve, reject) => {
      this.unlock()
        .then(async (_) => {
          const from = this.unlockedAccount;
          const to = from + n;
          for (let i = from; i < to; i++) {
            const path = this._getPathForIndex(i);
            let address: string;
            address = await this.unlock(path);

            const hdPathType = this.getHDPathType(path);
            this.accountDetails[toChecksumAddress(address)] = {
              hdPath: path,
              hdPathBasePublicKey: await this.getPathBasePublicKey(hdPathType),
              hdPathType,
            };

            address = address.toLowerCase();

            if (!this.accounts.includes(address)) {
              this.accounts.push(address);
            }
            this.page = 0;
          }
          resolve(this.accounts);
        })
        .catch(reject);
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
    const checksummedAddress = toChecksumAddress(address);
    delete this.accountDetails[checksummedAddress];
    delete this.paths[checksummedAddress];
  }

  // tx is an instance of the ethereumjs-transaction class.
  signTransaction(address, tx) {
    // make sure the previous transaction is cleaned up

    // transactions built with older versions of ethereumjs-tx have a
    // getChainId method that newer versions do not. Older versions are mutable
    // while newer versions default to being immutable. Expected shape and type
    // of data for v, r and s differ (Buffer (old) vs BN (new))
    if (typeof tx.getChainId === 'function') {
      // In this version of ethereumjs-tx we must add the chainId in hex format
      // to the initial v value. The chainId must be included in the serialized
      // transaction which is only communicated to ethereumjs-tx in this
      // value. In newer versions the chainId is communicated via the 'Common'
      // object.
      tx.v = bytesToHex(tx.getChainId());
      tx.r = '0x00';
      tx.s = '0x00';

      const rawTxHex = tx.serialize().toString('hex');

      return this._signTransaction(address, rawTxHex, (payload) => {
        tx.v = Buffer.from(payload.v, 'hex');
        tx.r = Buffer.from(payload.r, 'hex');
        tx.s = Buffer.from(payload.s, 'hex');
        return tx;
      });
    }
    // For transactions created by newer versions of @ethereumjs/tx
    // Note: https://github.com/ethereumjs/ethereumjs-monorepo/issues/1188
    // It is not strictly necessary to do this additional setting of the v
    // value. We should be able to get the correct v value in serialization
    // if the above issue is resolved. Until then this must be set before
    // calling .serialize(). Note we are creating a temporarily mutable object
    // forfeiting the benefit of immutability until this happens. We do still
    // return a Transaction that is frozen if the originally provided
    // transaction was also frozen.
    const messageToSign = tx.getMessageToSign(false);
    let rawTxHex = Buffer.isBuffer(messageToSign)
      ? messageToSign.toString('hex')
      : stripHexPrefix(utils.bytesToHex(RLP.encode(messageToSign)));

    // FIXME: This is a temporary fix for the issue with the Ledger device, waiting for a fix from Ledger
    if (!Array.isArray(RLP.decode(Buffer.from(rawTxHex, 'hex')))) {
      console.log('rlpTx not an array');
      rawTxHex = Buffer.from(messageToSign).toString('hex');
    }

    return this._signTransaction(address, rawTxHex, (payload) => {
      // Because tx will be immutable, first get a plain javascript object that
      // represents the transaction. Using txData here as it aligns with the
      // nomenclature of ethereumjs/tx.
      const txData = tx.toJSON();
      // The fromTxData utility expects v,r and s to be hex prefixed
      txData.v = addHexPrefix(payload.v);
      txData.r = addHexPrefix(payload.r);
      txData.s = addHexPrefix(payload.s);
      // Adopt the 'common' option from the original transaction and set the
      // returned object to be frozen if the original is frozen.
      if (is1559Tx(txData)) {
        return FeeMarketEIP1559Transaction.fromTxData(txData);
      } else {
        return TransactionFactory.fromTxData(txData, {
          common: tx.common,
          freeze: Object.isFrozen(tx),
        });
      }
    });
  }

  async _signTransaction(address, rawTxHex, handleSigning) {
    const hdPath = await this.unlockAccountByAddress(address);
    await this.ensureEthApp();
    try {
      const res = toLegacySignaturePayload(
        await runDeviceAction(
          ethSigner!.signTransaction(
            this._toLedgerPath(hdPath),
            Buffer.from(rawTxHex, 'hex'),
            { skipOpenApp: true }
          )
        )
      );
      const newOrMutatedTx = handleSigning(res);
      const valid = newOrMutatedTx.verifySignature();
      if (valid) {
        return newOrMutatedTx;
      } else {
        throw new Error('Ledger: The transaction signature is not valid');
      }
    } catch (err: any) {
      throw toLedgerError(
        err,
        'Ledger: Unknown error while signing transaction'
      );
    }
  }

  signMessage(withAccount, data) {
    return this.signPersonalMessage(withAccount, data);
  }

  // For personal_sign, we need to prefix the message:
  async signPersonalMessage(withAccount, message) {
    try {
      const hdPath = await this.unlockAccountByAddress(withAccount);
      await this.ensureEthApp();
      const signature = toSignatureHex(
        await runDeviceAction(
          ethSigner!.signMessage(
            this._toLedgerPath(hdPath),
            Buffer.from(stripHexPrefix(message), 'hex'),
            { skipOpenApp: true }
          )
        )
      );
      const addressSignedWith = recoverPersonalSignature({
        data: message,
        signature,
      });
      if (
        toChecksumAddress(addressSignedWith) !== toChecksumAddress(withAccount)
      ) {
        throw new Error(
          "Ledger: The signature doesn't match the right address"
        );
      }
      return signature;
    } catch (e: any) {
      throw toLedgerError(e, 'Ledger: Unknown error while signing message');
    }
  }

  async unlockAccountByAddress(address) {
    const checksummedAddress = toChecksumAddress(address);
    if (!Object.keys(this.accountDetails).includes(checksummedAddress)) {
      throw new Error(
        `Ledger: Account for address '${checksummedAddress}' not found`
      );
    }
    const { hdPath } = this.accountDetails[checksummedAddress];
    const unlockedAddress: string = await this.unlock(hdPath);

    // unlock resolves to the address for the given hdPath as reported by the ledger device
    // if that address is not the requested address, then this account belongs to a different device or seed
    if (unlockedAddress.toLowerCase() !== address.toLowerCase()) {
      throw new Error(
        `Ledger: Account ${address} does not belong to the connected device`
      );
    }
    return hdPath;
  }

  async signTypedData(withAccount, data, options: any = {}) {
    const isV4 = options.version === 'V4';
    if (!isV4) {
      throw new Error(
        'Ledger: Only version 4 of typed data signing is supported'
      );
    }
    if (!data?.domain || !data?.types || !data?.message) {
      throw new Error('Ledger: Typed data payload is incomplete');
    }

    const hdPath = await this.unlockAccountByAddress(withAccount);
    try {
      await this.ensureEthApp();
      const signature = toSignatureHex(
        await runDeviceAction(
          ethSigner!.signTypedData(this._toLedgerPath(hdPath), data, {
            skipOpenApp: true,
          })
        )
      );
      const addressSignedWith = recoverTypedSignature({
        data,
        signature,
        version: SignTypedDataVersion.V4,
      });
      if (
        toChecksumAddress(addressSignedWith) !== toChecksumAddress(withAccount)
      ) {
        throw new Error('Ledger: The signature doesnt match the right address');
      }
      return signature;
    } catch (e: any) {
      throw toLedgerError(e, 'Ledger: Unknown error while signing message');
    }
  }

  exportAccount() {
    throw new Error('Not supported on this device');
  }

  forgetDevice() {
    this.accounts = [];
    this.page = 0;
    this.unlockedAccount = 0;
    this.paths = {};
    this.accountDetails = {};
  }

  /* PRIVATE METHODS */

  async __getPage(increment) {
    this.page += increment;

    if (this.page <= 0) {
      this.page = 1;
    }
    const from = (this.page - 1) * this.perPage;
    const to = from + this.perPage;

    await this.unlock();
    const accounts = await this._getAccountsBIP44(from, to);

    return accounts;
  }
  async getAddresses(start: number, end: number) {
    const from = start;
    const to = end;
    await this.unlock();
    const accounts = await this._getAccountsBIP44(from, to);

    return accounts;
  }

  getIndexFromAddress(address: string) {
    const checksummedAddress = toChecksumAddress(address);
    if (!this.accountDetails[checksummedAddress]) {
      throw new Error(`Address ${address} not found`);
    }
    let index: null | number = null;
    const { hdPath } = this.accountDetails[checksummedAddress];
    if (/m\/44'\/60'\/(\d+)'\/0\/0/.test(hdPath)) {
      const res = hdPath.match(/m\/44'\/60'\/(\d+)'\/0\/0/);
      if (res && res[1]) {
        index = parseInt(res[1], 10);
      }
    } else {
      const checksummedAddress = toChecksumAddress(address);
      const arr = this.accountDetails[checksummedAddress].hdPath.split('/');
      index = Number(arr[arr.length - 1]);
    }
    return index;
  }

  authorizeHIDPermission() {
    this.hasHIDPermission = true;
  }

  async _getAccountsBIP44(from, to) {
    const accounts: Account[] = [];

    for (let i = from; i < to; i++) {
      const path = this._getPathForIndex(i);
      const address = await this.unlock(path);

      accounts.push({
        address,
        balance: null,
        index: i + 1,
      });
    }
    return accounts;
  }

  _getPathForIndex(index) {
    // Check if the path is BIP 44 (Ledger Live)
    return this._isLedgerLiveHdPath()
      ? `m/44'/60'/${index}'/0/0`
      : `${this.hdPath}/${index}`;
  }

  _isLedgerLiveHdPath() {
    return this.hdPath === "m/44'/60'/0'/0/0";
  }

  _toLedgerPath(path) {
    return path.toString().replace('m/', '');
  }

  private getHDPathType(path: string) {
    if (/^m\/44'\/60'\/(\d+)'\/0\/0$/.test(path)) {
      return HDPathType.LedgerLive;
    } else if (/^m\/44'\/60'\/0'\/0\/(\d+)$/.test(path)) {
      return HDPathType.BIP44;
    } else if (/^m\/44'\/60'\/0'\/(\d+)$/.test(path)) {
      return HDPathType.Legacy;
    }
    throw new Error('Invalid path');
  }
  private async getPathBasePublicKey(hdPathType: HDPathType) {
    const pathBase = this.getHDPathBase(hdPathType);
    const res = await this.getLedgerAddress(pathBase);

    return res.publicKey;
  }

  private getHDPathBase(hdPathType: HDPathType) {
    return HD_PATH_BASE[hdPathType];
  }

  private getHDPathTypeFromPath(hdPath: string) {
    return HD_PATH_TYPE[hdPath];
  }

  private async _fixAccountDetail(address: string) {
    const checksummedAddress = toChecksumAddress(address);
    const detail = this.accountDetails[checksummedAddress];

    // The detail is already fixed
    if (detail.hdPathBasePublicKey) {
      return;
    }
    // Check if the account is of the device
    // so we get address from the device by the hdPath
    const hdPathType = this.getHDPathType(detail.hdPath);

    // Account
    const res = await this.getLedgerAddress(detail.hdPath);
    const addressInDevice = res.address;

    // The address is not the same, so we don't need to fix
    if (!isSameAddress(addressInDevice, address)) {
      return;
    }

    // Right, we need to fix the account detail
    detail.hdPathType = hdPathType;
    detail.hdPathBasePublicKey = await this.getPathBasePublicKey(hdPathType);
  }

  // return top 3 accounts for each path type
  async getInitialAccounts() {
    await this.unlock();
    const defaultHDPath = this.hdPath;
    this.setHdPath(this.getHDPathBase(HDPathType.LedgerLive));
    const LedgerLiveAccounts = await this.getAddresses(0, 3);
    this.setHdPath(this.getHDPathBase(HDPathType.BIP44));
    const BIP44Accounts = await this.getAddresses(0, 3);
    this.setHdPath(this.getHDPathBase(HDPathType.Legacy));
    const LegacyAccounts = await this.getAddresses(0, 3);
    this.setHdPath(defaultHDPath);

    return {
      [HDPathType.LedgerLive]: LedgerLiveAccounts,
      [HDPathType.BIP44]: BIP44Accounts,
      [HDPathType.Legacy]: LegacyAccounts,
    };
  }

  async getCurrentAccounts() {
    await this.unlock();
    const addresses = await this.getAccounts();
    const pathBase = this.hdPath;
    const { publicKey: currentPublicKey } = await this.getLedgerAddress(
      pathBase
    );
    const hdPathType = this.getHDPathTypeFromPath(pathBase);
    const accounts: Account[] = [];
    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];
      await this._fixAccountDetail(address);

      const detail = this.accountDetails[toChecksumAddress(address)];

      if (detail.hdPathBasePublicKey === currentPublicKey) {
        const info = this.getAccountInfo(address);
        if (info) {
          accounts.push(info);
        }
        continue;
      }

      // Live and BIP44 first account is the same
      // we need to check the first account when the path type is LedgerLive or BIP44
      if (
        hdPathType !== HDPathType.Legacy &&
        (detail.hdPathType === HDPathType.LedgerLive ||
          detail.hdPathType === HDPathType.BIP44)
      ) {
        const info = this.getAccountInfo(address);
        if (info?.index === 1) {
          const res = await this.getLedgerAddress(detail.hdPath);
          if (isSameAddress(res.address, address)) {
            accounts.push(info);
          }
        }
      }
    }

    return accounts;
  }

  getAccountInfo(address: string) {
    const detail = this.accountDetails[toChecksumAddress(address)];
    if (detail) {
      const { hdPath, hdPathType, hdPathBasePublicKey } = detail;
      return {
        address,
        index: this.getIndexFromPath(hdPath, hdPathType) + 1,
        balance: null,
        hdPathType,
        hdPathBasePublicKey,
      };
    }
  }

  private getIndexFromPath(path: string, hdPathType?: HDPathType) {
    switch (hdPathType) {
      case HDPathType.BIP44:
        return parseInt(path.split('/')[5]);
      case HDPathType.Legacy:
        return parseInt(path.split('/')[4]);
      case HDPathType.LedgerLive:
        return parseInt(path.split('/')[3]);
      default:
        throw new Error('Invalid path');
    }
  }

  async setHDPathType(hdPathType: HDPathType) {
    const hdPath = this.getHDPathBase(hdPathType);
    this.setHdPath(hdPath);
  }

  async setCurrentUsedHDPathType() {
    const key = await this.getPathBasePublicKey(HDPathType.Legacy);
    this.usedHDPathTypeList[key] = this.getHDPathTypeFromPath(this.hdPath);
  }

  async getCurrentUsedHDPathType() {
    const key = await this.getPathBasePublicKey(HDPathType.Legacy);
    return this.usedHDPathTypeList[key];
  }

  private async getLedgerAddress(path: string) {
    await this.ensureEthApp();

    return runDeviceAction(
      ethSigner!.getAddress(this._toLedgerPath(path), {
        checkOnDevice: false,
        returnChainCode: true,
        skipOpenApp: true,
      })
    );
  }

  openEthApp = async (): Promise<void> => {
    await this.ensureEthApp();
  };

  quitApp = async (): Promise<void> => {
    await this.makeApp();
    await this.ensureDeviceReady();

    const result = await getDmk().sendCommand({
      sessionId: sessionId!,
      command: new CloseAppCommand(),
    });

    if (!isSuccessCommandResult(result)) {
      throw result.error;
    }

    await this.cleanUp();
  };

  getAppAndVersion = async (): Promise<{
    appName: string;
    version: string;
  }> => {
    await this.makeApp();
    await this.ensureDeviceReady();

    const result = await getDmk().sendCommand({
      sessionId: sessionId!,
      command: new GetAppAndVersionCommand(),
    });

    if (!isSuccessCommandResult(result)) {
      throw result.error;
    }

    const { name: appName, version } = result.data;
    return {
      appName,
      version,
    };
  };
}

export default LedgerBridgeKeyring;
