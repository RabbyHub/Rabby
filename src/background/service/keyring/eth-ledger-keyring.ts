import {
  recoverPersonalSignature,
  recoverTypedSignature,
  SignTypedDataVersion,
  TypedDataUtils,
} from '@metamask/eth-sig-util';
import {
  toChecksumAddress,
  addHexPrefix,
  stripHexPrefix,
  bytesToHex,
} from '@ethereumjs/util';
import { RLP, utils } from '@ethereumjs/rlp';
import {
  ApduBuilder,
  ApduParser,
  CloseAppCommand,
  CommandResultFactory,
  DeviceActionStatus,
  DeviceSessionStateType,
  DeviceStatus,
  DeviceManagementKitBuilder,
  GetAppAndVersionCommand,
  InvalidStatusWordError,
  OpenAppDeviceAction,
  UserInteractionRequired,
  isSuccessCommandResult,
} from '@ledgerhq/device-management-kit';

import type {
  Apdu,
  ApduResponse,
  Command,
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
import type { BlindSigningReporter } from '@ledgerhq/context-module';
import {
  firstValueFrom,
  filter,
  map,
  merge,
  skip,
  Subject,
  take,
  tap,
} from 'rxjs';
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
const LEDGER_BUSY_RECHECK_TIMEOUT = 10000;
const LEDGER_CLEAR_SIGNING_NETWORK_TIMEOUT = 5000;
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
let sessionReleaseTimer: ReturnType<typeof setTimeout> | null = null;
let activeLedgerOperationCount = 0;
const ledgerSessionClosed$ = new Subject<void>();

const cancelScheduledLedgerSessionRelease = () => {
  if (sessionReleaseTimer !== null) {
    clearTimeout(sessionReleaseTimer);
    sessionReleaseTimer = null;
  }
};

const cleanUpLedgerSession = async () => {
  cancelScheduledLedgerSessionRelease();
  const currentSessionId = sessionId;
  ledgerSessionClosed$.next();
  ethSigner = null;
  sessionId = null;

  if (currentSessionId && dmk) {
    await dmk.disconnect({ sessionId: currentSessionId }).catch(() => {
      // The device may already be gone or closed by the OS app command.
    });
  }
};

const releaseLedgerSessionWhenIdle = () => {
  cancelScheduledLedgerSessionRelease();
  if (!sessionId || activeLedgerOperationCount > 0) {
    return;
  }

  // Promise continuations can reuse this session, but an idle Rabby must not
  // keep polling a Ledger that another browser may be using.
  sessionReleaseTimer = setTimeout(() => {
    sessionReleaseTimer = null;
    void cleanUpLedgerSession();
  }, 0);
};

const beginLedgerOperation = () => {
  cancelScheduledLedgerSessionRelease();
  activeLedgerOperationCount += 1;
};

const endLedgerOperation = () => {
  activeLedgerOperationCount -= 1;
  releaseLedgerSessionWhenIdle();
};

if (isManifestV3) {
  Browser.runtime.onMessage.addListener((request) => {
    if (
      request.target === OffscreenCommunicationTarget.extension &&
      request.event === LedgerAction.ledgerDeviceDisconnect
    ) {
      void cleanUpLedgerSession();
    }
  });
}

const noOpBlindSigningReporter = ({
  report: async () => undefined,
} as unknown) as BlindSigningReporter;

const getEthContextModule = () =>
  new ContextModuleBuilder({
    networkTimeoutMs: LEDGER_CLEAR_SIGNING_NETWORK_TIMEOUT,
  })
    .setChain(ContextModuleChainID.Ethereum)
    .setBlindSigningReporter(noOpBlindSigningReporter)
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

const isLedgerSignatureResponseCorrupted = (value: unknown) => {
  const message = stringifyLedgerErrorValue(value);
  return (
    /invalidstatusworderror/iu.test(message) &&
    /\b[vrs] is missing\b/iu.test(message)
  );
};

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
  action: ExecuteDeviceActionReturnType<Output, any, any>
): Promise<Output> => {
  beginLedgerOperation();
  let previousStep: unknown;
  const cancelAction = () => {
    try {
      action.cancel();
    } catch {
      // Preserve the error that caused the cancellation.
    }
  };

  try {
    const observable = merge(
      action.observable,
      ledgerSessionClosed$.pipe(
        map(() => {
          throw new Error('Ledger: Device disconnected');
        })
      )
    );

    return await firstValueFrom(
      observable.pipe(
        tap((state) => {
          const step =
            'intermediateValue' in state
              ? state.intermediateValue?.step
              : undefined;
          if (step && step !== previousStep) {
            console.debug('[Ledger DMK][stage]', {
              step,
              timestamp: Date.now(),
            });
            previousStep = step;
          }
        }),
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
    cancelAction();
    if (isLedgerSignatureResponseCorrupted(e)) {
      await cleanUpLedgerSession();
      throw new Error(
        'Ledger: Device communication was interrupted. Close other apps using Ledger and try again.'
      );
    }
    throw e;
  } finally {
    endLedgerOperation();
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

const HARDENED_PATH_FLAG = 0x80000000;

const splitHdPath = (hdPath: string) =>
  hdPath
    .split('/')
    .filter((segment) => segment !== '' && segment !== 'm')
    .map((segment) => {
      const isHardened = segment.endsWith("'");
      const index = parseInt(isHardened ? segment.slice(0, -1) : segment, 10);
      return isHardened ? HARDENED_PATH_FLAG + index : index;
    });

const EIP712_HASH_BYTE_LENGTH = 32;

type SignEIP712HashedMessageCommandArgs = {
  derivationPath: string;
  domainHash: string;
  messageHash: string;
};

// Sign-EIP712 APDU in legacy (v0) mode: the device signs
// keccak256("\x19\x01" ‖ domainHash ‖ messageHash) without streaming the
// typed struct, so it works regardless of payload size. Same wire format as
// hw-app-eth's signEIP712HashedMessage, which this keyring used before the
// DMK migration. Requires Blind signing to be enabled in the Ethereum app.
// https://github.com/LedgerHQ/app-ethereum/blob/develop/doc/ethapp.adoc#sign-eth-eip-712
class SignEIP712HashedMessageCommand implements Command<Signature, void, void> {
  readonly name = 'signEIP712HashedMessage';

  constructor(private readonly args: SignEIP712HashedMessageCommandArgs) {}

  getApdu(): Apdu {
    const { derivationPath, domainHash, messageHash } = this.args;
    const builder = new ApduBuilder({
      cla: 0xe0,
      ins: 0x0c,
      p1: 0x00,
      p2: 0x00,
    });
    const paths = splitHdPath(derivationPath);
    builder.add8BitUIntToData(paths.length);
    for (const path of paths) {
      builder.add32BitUIntToData(path);
    }
    builder.addHexaStringToData(domainHash);
    builder.addHexaStringToData(messageHash);
    return builder.build();
  }

  parseResponse(apduResponse: ApduResponse) {
    const statusWord = Array.from(apduResponse.statusCode)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    if (statusWord !== '9000') {
      return CommandResultFactory<Signature, void>({
        error: new InvalidStatusWordError(
          statusWord === '6985'
            ? 'Ledger: Signing was denied on the device, or Blind signing is disabled in the Ethereum app settings 0x6985'
            : `0x${statusWord}`
        ),
      });
    }

    const parser = new ApduParser(apduResponse);
    const v = parser.extract8BitUInt();
    if (v === undefined) {
      return CommandResultFactory<Signature, void>({
        error: new InvalidStatusWordError('V is missing'),
      });
    }
    const r = parser.encodeToHexaString(
      parser.extractFieldByLength(EIP712_HASH_BYTE_LENGTH),
      true
    );
    if (!r) {
      return CommandResultFactory<Signature, void>({
        error: new InvalidStatusWordError('R is missing'),
      });
    }
    const s = parser.encodeToHexaString(
      parser.extractFieldByLength(EIP712_HASH_BYTE_LENGTH),
      true
    );
    if (!s) {
      return CommandResultFactory<Signature, void>({
        error: new InvalidStatusWordError('S is missing'),
      });
    }

    return CommandResultFactory<Signature, void>({ data: { v, r, s } });
  }
}

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
    // The Clear Signing network deadline is scoped to this Context Module.
    ethSigner = new SignerEthBuilder({
      dmk,
      sessionId,
    })
      .withContextModule(getEthContextModule())
      .build();
    return ethSigner;
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
    cancelScheduledLedgerSessionRelease();

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
      const devices = await firstValueFrom(
        merge(
          kit.listenToAvailableDevices({ transport: webHidIdentifier }).pipe(
            // WebHID first emits its cached list, then the result of getDevices().
            // Only the refreshed list can prove that no authorized device exists.
            skip(1),
            take(1)
          ),
          ledgerSessionClosed$.pipe(
            map(() => {
              throw new Error('Ledger: Device disconnected');
            })
          )
        ).pipe(take(1))
      );

      if (devices.length === 0) {
        throw new Error('Ledger: No connected Ledger device found');
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
    beginLedgerOperation();
    try {
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
          })
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
    } finally {
      endLedgerOperation();
    }
  }

  async cleanUp() {
    await cleanUpLedgerSession();
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
      const signer = this.buildSigner();
      if (!signer) {
        throw new Error('Ledger: Device disconnected');
      }
      const res = toLegacySignaturePayload(
        await runDeviceAction(
          signer.signTransaction(
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
    let signature: string;
    try {
      await this.ensureEthApp();
      const signer = this.buildSigner();
      if (!signer) {
        throw new Error('Ledger: Device disconnected');
      }
      signature = toSignatureHex(
        await runDeviceAction(
          signer.signTypedData(this._toLedgerPath(hdPath), data, {
            skipOpenApp: true,
          })
        )
      );
    } catch (e: any) {
      if (getLedgerStatusWord(e) === '6985' || !sessionId) {
        throw toLedgerError(e, 'Ledger: Unknown error while signing message');
      }
      // Clear signing failed for a reason other than an explicit refusal on
      // the device — typically an EIP-712 payload too large for the Ethereum
      // app to stream (large Safe transactions), or a transport error while
      // streaming it. Fall back to signing the EIP-712 hashes, which yields
      // the same signature over the same digest. The pre-DMK keyring did the
      // same via hw-app-eth's signEIP712HashedMessage, and the DMK signer
      // itself falls back this way for the failure paths it catches.
      try {
        signature = await this.signTypedDataAsHashes(hdPath, data);
      } catch (fallbackError: any) {
        throw toLedgerError(
          fallbackError,
          'Ledger: Unknown error while signing message'
        );
      }
    }
    try {
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

  private async signTypedDataAsHashes(hdPath: string, data) {
    const domainHash = bytesToHex(
      TypedDataUtils.hashStruct(
        'EIP712Domain',
        data.domain,
        data.types,
        SignTypedDataVersion.V4
      )
    );
    const { EIP712Domain: _domainType, ...messageTypes } = data.types;
    const messageHash = bytesToHex(
      TypedDataUtils.hashStruct(
        data.primaryType,
        data.message,
        messageTypes,
        SignTypedDataVersion.V4
      )
    );

    beginLedgerOperation();
    try {
      const result = await getDmk().sendCommand({
        sessionId: sessionId!,
        command: new SignEIP712HashedMessageCommand({
          derivationPath: this._toLedgerPath(hdPath),
          domainHash,
          messageHash,
        }),
      });

      if (!isSuccessCommandResult(result)) {
        throw result.error;
      }

      return toSignatureHex(result.data);
    } finally {
      endLedgerOperation();
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

  openEthApp = (): Promise<void> => this.ensureEthApp();

  quitApp = async (): Promise<void> => {
    beginLedgerOperation();
    try {
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
    } finally {
      endLedgerOperation();
    }
  };

  getAppAndVersion = async (): Promise<{
    appName: string;
    version: string;
  }> => {
    beginLedgerOperation();
    try {
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
    } finally {
      endLedgerOperation();
    }
  };
}

export default LedgerBridgeKeyring;
