import EventEmitter from 'events';
import {
  toChecksumAddress,
  stripHexPrefix,
  addHexPrefix,
  bytesToHex,
  publicToAddress,
} from '@ethereumjs/util';
import {
  SignTypedDataVersion,
  TypedDataUtils,
  recoverPersonalSignature,
  recoverTypedSignature,
} from '@metamask/eth-sig-util';
import { TransactionFactory, TypedTransaction } from '@ethereumjs/tx';
import HDKey from 'hdkey';
import { isSameAddress } from '@/background/utils';
import { OneKeyBridgeInterface } from './onekey-bridge-interface';
import { isManifestV3 } from '@/utils/env';
import browser from 'webextension-polyfill';
import { HardwareErrorCode } from '@onekeyfe/hd-shared';
import type { HardwareConnectProtocol } from '@onekeyfe/hd-shared';
import type {
  DeviceState,
  KnownDevice,
  Response,
  SearchDevice,
} from '@onekeyfe/hd-core';
import {
  checkOperation,
  deviceCancelled,
  whileActive,
  readDevice,
  selectWallet,
  passphraseDisabled,
  protocolMismatch,
  OneKeyError,
} from './device-session';
import type {
  HardwareSigningMetadata,
  SigningAttempt,
} from '../signing-diagnostics';

const keyringType = 'Onekey Hardware';
const hdPathString = "m/44'/60'/0'/0";
const pathBase = 'm';
const MAX_INDEX = 1000;
const DELAY_BETWEEN_POPUPS = 1000;
const ONEKEY_SESSION_STATE_KEY = 'onekeySessionState';
// All saved and temporary OneKey keyrings share this MV3 session entry.
let sessionWrites = Promise.resolve();

// Match the SDK's protocol lookup. Device operations still use the raw USB id.
const protocolKey = (connectId: string) => connectId.trim().toLowerCase();

function discoveredDeviceState(device: SearchDevice): DeviceState | undefined {
  // WebUSB returns a KnownDevice snapshot; other transports can omit it.
  const { state, status } = device as Partial<KnownDevice>;
  if (
    state?.identity?.deviceId &&
    (!device.deviceId || device.deviceId === state.identity.deviceId) &&
    state.status &&
    (state.protocol === 'V1' || state.protocol === 'V2') &&
    status !== 'occupied' &&
    status !== 'used'
  ) {
    return state;
  }
}

interface OneKeySessionState {
  passphraseState?: string;
  deviceId: string;
  connectId: string;
  publicKey: string;
  chainCode: string;
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

/**
 * Version 1:
 * - hdPathBasePublicKey
 * - hdPath
 * - hdPathType
 * - index
 *
 * Version 2:
 * added:
 * - passphraseState
 */
interface AccountDetail {
  version?: number;
  hdPathBasePublicKey?: string;
  hdPath: string;
  hdPathType: HDPathType;
  passphraseState?: string;
  connectId?: string;
  deviceId?: string;
  index: number;
}

interface DevicePair {
  connectId: string;
  deviceId: string;
}

function devicePair(
  connectId: unknown,
  deviceId: unknown
): DevicePair | undefined {
  if (
    typeof connectId === 'string' &&
    connectId.trim() &&
    typeof deviceId === 'string' &&
    deviceId.trim()
  )
    return { connectId, deviceId };
}

interface SigningTarget extends DevicePair {
  path: string;
  passphraseState?: string;
  useEmptyPassphrase: boolean;
}

class OneKeyKeyring extends EventEmitter {
  static type = keyringType;
  type = keyringType;
  signingDiagnosticsProvider = 'onekey';
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
  private hardwareSigningMetadata: HardwareSigningMetadata = {};

  bridge!: OneKeyBridgeInterface;

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
  }

  private operations = new AbortController();
  private pendingUnlock?: {
    controller: AbortController;
    result: Promise<string>;
  };
  private activeSignatures = 0;
  private pendingDevice?: string;
  private restored?: Promise<void>;
  private sessionGeneration = 0;
  private repairedAccount = false;
  private deviceProtocols = new Map<string, HardwareConnectProtocol>();
  // The service persists protocols and per-account device IDs together.
  private deviceProtocolsChanged = false;
  private verifiedWallet?: Pick<
    DeviceState['status'],
    'passphraseProtection' | 'unlockedAttachPin'
  > & { importConfirmed?: boolean };

  async init(signal = this.operations.signal) {
    await whileActive(signal, () => this.bridge.init());
    // A restarted offscreen document has a fresh SDK, even when the first
    // operation only enumerates devices and never reads an individual state.
    for (const [connectId, protocol] of this.deviceProtocols) {
      await this.bindDeviceProtocol(signal, connectId, protocol);
    }
    checkOperation(signal);
    if (!isManifestV3) return;
    if (!this.restored) {
      const generation = this.sessionGeneration;
      this.restored = sessionWrites
        .then(() => browser.storage.session.get(ONEKEY_SESSION_STATE_KEY))
        .then((items) => {
          const state: OneKeySessionState | undefined =
            items[ONEKEY_SESSION_STATE_KEY];
          if (state && generation === this.sessionGeneration)
            this.applySession(state, this.sessionKey(state));
        })
        .catch((error) => {
          if (generation === this.sessionGeneration) this.restored = undefined;
          throw error;
        });
    }
    await this.restored;
  }

  private sessionKey(state: OneKeySessionState) {
    const hdk = new HDKey();
    hdk.publicKey = Buffer.from(state.publicKey, 'hex');
    hdk.chainCode = Buffer.from(state.chainCode, 'hex');
    return hdk;
  }

  private applySession(state: OneKeySessionState, hdk: HDKey) {
    this.hdk = hdk;
    this.deviceId = state.deviceId;
    this.connectId = state.connectId;
    this.passphraseState = state.passphraseState;
  }

  // Serialize updates so cleanup follows any already-issued MV3 write.
  private updateSessionStorage(update: () => Promise<void>) {
    if (!isManifestV3) return Promise.resolve();
    const write = sessionWrites.then(update);
    sessionWrites = write.catch(() => undefined);
    return write;
  }

  private storeSession(state: OneKeySessionState, signal: AbortSignal) {
    return this.updateSessionStorage(async () => {
      checkOperation(signal);
      await browser.storage.session.set({ [ONEKEY_SESSION_STATE_KEY]: state });
      if (signal.aborted)
        await browser.storage.session.remove(ONEKEY_SESSION_STATE_KEY);
    });
  }

  private clearSession() {
    this.sessionGeneration++;
    this.verifiedWallet = undefined;
    this.restored = Promise.resolve();
    this.hdk = new HDKey();
    this.connectId = null;
    this.deviceId = null;
    this.pendingDevice = undefined;
    this.passphraseState = undefined;
    this.hardwareSigningMetadata = {};
    return this.updateSessionStorage(() =>
      browser.storage.session.remove(ONEKEY_SESSION_STATE_KEY)
    );
  }

  async searchDevices() {
    await this.init();
    return this.bridge.searchDevices();
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
      deviceProtocols: Object.fromEntries(this.deviceProtocols),
    });
  }

  deserialize(opts: any = {}): Promise<void> {
    this.hdPath = opts.hdPath || hdPathString;
    this.accounts = opts.accounts || [];
    this.page = opts.page || 0;
    this.perPage = 5;
    this.paths = opts.paths || {};
    this.accountDetails = opts.accountDetails || {};
    this.deviceProtocols.clear();
    const saved = opts.deviceProtocols;
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      for (const [id, protocol] of Object.entries(saved)) {
        const key = protocolKey(id);
        if (key && (protocol === 'V1' || protocol === 'V2')) {
          this.deviceProtocols.set(key, protocol);
        }
      }
    }
    this.deviceProtocolsChanged = false;
    return Promise.resolve();
  }

  // A new import may select another hidden wallet on the very same USB device.
  // Keep the previous snapshot for signing, but verify the device's current
  // wallet before deriving the first address in this import or after SW restart.
  beginImport() {
    this.abortUnlock();
    this.verifiedWallet = undefined;
  }

  isUnlocked(): boolean {
    return Boolean(this.verifiedWallet && this.hdk.publicKey);
  }

  private abortUnlock() {
    if (!this.pendingUnlock) return;
    this.pendingUnlock.controller.abort();
    this.pendingUnlock = undefined;
    if (!this.activeSignatures) this.pendingDevice = undefined;
  }

  private invalidateOperations() {
    this.operations.abort();
    this.operations = new AbortController();
    this.abortUnlock();
    this.pendingDevice = undefined;
  }

  cancel() {
    const connectId = this.pendingDevice;
    this.invalidateOperations();
    // SDK cancel() without an id also cancels work on other connected devices.
    return connectId ? this.bridge.cancel(connectId) : Promise.resolve();
  }

  cancelPendingWork() {
    if (this.pendingUnlock || this.activeSignatures) return this.cancel();
    this.invalidateOperations();
  }

  async cleanUp(cancelPending = false) {
    // Import and manager pages can share a keyring with a signing approval.
    if (cancelPending && this.activeSignatures) return;
    let cancellation: Promise<void> | undefined;
    if (this.pendingUnlock && !this.activeSignatures) {
      if (cancelPending) cancellation = this.cancel();
      else this.invalidateOperations();
    }
    await Promise.all([cancellation, this.clearSession()]);
  }

  consumePassphraseStateCleared() {
    const repaired = this.repairedAccount;
    this.repairedAccount = false;
    return repaired;
  }

  consumeDeviceProtocolsChanged() {
    const changed = this.deviceProtocolsChanged;
    this.deviceProtocolsChanged = false;
    return changed;
  }

  private async bindDeviceProtocol(
    signal: AbortSignal,
    connectId: string,
    protocol?: HardwareConnectProtocol
  ) {
    const bind = this.bridge.setDeviceConnectProtocol;
    if (bind) {
      await whileActive(signal, () =>
        Promise.resolve(bind.call(this.bridge, connectId, protocol))
      );
    }
  }

  private async readProtocolState(signal: AbortSignal, connectId: string) {
    const key = protocolKey(connectId);
    const remembered = this.deviceProtocols.get(key);
    if (remembered) {
      await this.bindDeviceProtocol(signal, connectId, remembered);
    }
    try {
      return await readDevice(signal, () =>
        this.bridge.getDeviceState(connectId)
      );
    } catch (error) {
      checkOperation(signal);
      if (!remembered || !protocolMismatch(error)) throw error;
      await this.forgetDeviceProtocol(signal, connectId, remembered);
      return readDevice(signal, () =>
        this.bridge.getDeviceState(connectId, { forceProtocolDetection: true })
      );
    }
  }

  private async discoverDevice(
    signal: AbortSignal,
    preferred?: { connectId?: string; deviceId?: string }
  ) {
    const devices = await readDevice(signal, () => this.bridge.searchDevices());
    const device =
      (preferred?.deviceId &&
        devices.find(
          (d) =>
            (d.deviceId || discoveredDeviceState(d)?.identity.deviceId) ===
            preferred.deviceId
        )) ||
      (preferred?.connectId &&
        devices.find((d) => d.connectId === preferred.connectId)) ||
      devices.find((d) => d.connectId === this.connectId) ||
      devices[0];
    const connectId = device?.connectId;
    if (!connectId?.trim()) {
      // The state call reports permission and transport errors when discovery is empty.
      await readDevice(signal, () => this.bridge.getDeviceState());
      throw new OneKeyError(
        HardwareErrorCode.DeviceNotFound,
        'No OneKey device found'
      );
    }
    return { ...device, connectId };
  }

  private async readConnectedDevice(
    signal: AbortSignal,
    device: SearchDevice & { connectId: string }
  ) {
    checkOperation(signal);
    const { connectId } = device;
    if (this.connectId && this.connectId !== connectId) {
      await this.clearSession();
      checkOperation(signal);
    }
    this.pendingDevice = connectId;
    const state =
      discoveredDeviceState(device) ||
      (await this.readProtocolState(signal, connectId));
    checkOperation(signal);
    const { protocol } = state;
    if (protocol === 'V1' || protocol === 'V2') {
      await this.bindDeviceProtocol(signal, connectId, protocol);
      checkOperation(signal);
      const key = protocolKey(connectId);
      if (this.deviceProtocols.get(key) !== protocol) {
        this.deviceProtocols.set(key, protocol);
        this.deviceProtocolsChanged = true;
      }
    }
    const deviceId = state.identity?.deviceId;
    if (!deviceId)
      throw new OneKeyError(
        HardwareErrorCode.DeviceNotFound,
        'Missing OneKey device identity'
      );
    const sameDevice =
      connectId === this.connectId && deviceId === this.deviceId;
    if (!sameDevice && (this.connectId || this.deviceId || this.isUnlocked())) {
      await this.clearSession();
      checkOperation(signal);
      this.pendingDevice = connectId;
    }
    this._readHardwareSigningMetadata(device);
    if (!this.hardwareSigningMetadata.device_model) {
      this.hardwareSigningMetadata.device_model = state.identity.deviceType;
    }
    return { connectId, deviceId, state, sameDevice };
  }

  unlock(): Promise<string> {
    if (this.pendingUnlock) return this.pendingUnlock.result;
    if (this.connectId && this.deviceId && this.isUnlocked()) {
      return Promise.resolve('already unlocked');
    }
    const controller = new AbortController();
    const result = this.unlockDevice(controller.signal).finally(() => {
      if (this.pendingUnlock?.controller === controller) {
        this.pendingUnlock = undefined;
        if (!this.activeSignatures) this.pendingDevice = undefined;
      }
    });
    this.pendingUnlock = { controller, result };
    return result;
  }

  private async unlockDevice(signal: AbortSignal) {
    await whileActive(signal, () => this.init(signal));
    const device = await this.discoverDevice(signal);
    checkOperation(signal);
    if (
      device.connectId === this.connectId &&
      device.deviceId &&
      device.deviceId === this.deviceId &&
      this.isUnlocked()
    ) {
      return 'already unlocked';
    }
    const {
      connectId,
      deviceId,
      state,
      sameDevice,
    } = await this.readConnectedDevice(signal, device);
    if (
      sameDevice &&
      this.isUnlocked() &&
      state.status?.unlocked !== false &&
      this.verifiedWallet?.passphraseProtection ===
        state.status?.passphraseProtection &&
      this.verifiedWallet?.unlockedAttachPin === state.status?.unlockedAttachPin
    ) {
      return 'already unlocked';
    }
    this.verifiedWallet = undefined;
    const passphraseState = await selectWallet(
      this.bridge,
      connectId,
      state,
      signal
    );
    const key = await this.readImportKey(
      signal,
      connectId,
      deviceId,
      passphraseState
    );
    const session: OneKeySessionState = {
      publicKey: key.pub,
      chainCode: key.node.chain_code,
      passphraseState,
      connectId,
      deviceId,
    };
    checkOperation(signal);
    // Opening a wallet can itself change the unlock mode (e.g. attach-PIN).
    // getDeviceState reads status without prompting for a PIN.
    const current =
      state.protocol === 'V2'
        ? await readDevice(signal, () => this.bridge.getDeviceState(connectId))
        : state;
    if (current.identity?.deviceId !== deviceId) {
      await this.clearSession();
      throw new OneKeyError(
        HardwareErrorCode.DeviceNotFound,
        'OneKey device changed'
      );
    }
    const hdk = this.sessionKey(session);
    await this.storeSession(session, signal);
    checkOperation(signal);
    this.applySession(session, hdk);
    this.verifiedWallet = {
      passphraseProtection: current.status?.passphraseProtection,
      unlockedAttachPin: current.status?.unlockedAttachPin,
    };
    return 'just unlocked';
  }

  setAccountToUnlock(index: string): void {
    this.unlockedAccount = parseInt(index, 10);
  }

  private readImportKey(
    signal: AbortSignal,
    connectId: string,
    deviceId: string,
    passphraseState?: string
  ) {
    return readDevice(signal, () =>
      this.bridge.evmGetPublicKey(connectId, deviceId, {
        path: this.hdPath,
        chainId: 1,
        showOnOneKey: false,
        passphraseState,
        useEmptyPassphrase: !passphraseState,
      })
    );
  }

  async addAccounts(n = 1) {
    const first = this.unlockedAccount;
    const signal = this.operations.signal;
    const preview = this.verifiedWallet;
    const unlocked = await this.unlock();
    checkOperation(signal);
    const wallet = this.verifiedWallet;
    const { connectId, deviceId } = this;
    if (!wallet || !connectId || !deviceId || (preview && wallet !== preview)) {
      throw new Error('OneKey import session changed');
    }
    // The USB device or hidden wallet can change while the user chooses
    // addresses. Confirm the displayed xpub once before saving that selection.
    if (unlocked === 'already unlocked' && !wallet.importConfirmed) {
      const key = await this.readImportKey(
        signal,
        connectId,
        deviceId,
        this.passphraseState
      );
      checkOperation(signal);
      if (this.verifiedWallet !== wallet)
        throw new Error('OneKey import session changed');
      if (
        !this.hdk.publicKey.equals(Buffer.from(key.pub, 'hex')) ||
        !this.hdk.chainCode.equals(Buffer.from(key.node.chain_code, 'hex'))
      ) {
        await this.clearSession();
        throw new Error('OneKey import wallet changed');
      }
    }
    wallet.importConfirmed = true;
    for (let i = first; i < first + n; i++) {
      const address = this._addressFromIndex(pathBase, i);
      if (!this.accounts.some((existing) => isSameAddress(existing, address))) {
        this.accounts.push(address);
      }
      this.paths[address] = i;
      this.accountDetails[address] = {
        version: 2,
        hdPath: `${this.hdPath}/${i}`,
        hdPathType: LedgerHDPathType.BIP44,
        hdPathBasePublicKey: this.getPathBasePublicKey(),
        passphraseState: this.passphraseState,
        connectId,
        deviceId,
        index: i,
      };
    }
    this.page = 0;
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
            this.paths[toChecksumAddress(address)] = i;
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
            this.paths[toChecksumAddress(address)] = i;
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
    const checksummedAddress = toChecksumAddress(address);
    delete this.accountDetails[checksummedAddress];
    delete this.paths[checksummedAddress];
  }

  private cachedSigningDevice(detail: AccountDetail) {
    const imported = devicePair(detail.connectId, detail.deviceId);
    if (imported) return imported;

    // Older accounts may only have an xpub. Reuse the active session only
    // when its xpub belongs to this account and neither saved id contradicts it.
    const session = devicePair(this.connectId, this.deviceId);
    if (
      session &&
      detail.hdPathBasePublicKey &&
      detail.hdPathBasePublicKey === this.hdk.publicKey?.toString('hex') &&
      (!detail.connectId || detail.connectId === session.connectId) &&
      (!detail.deviceId || detail.deviceId === session.deviceId)
    ) {
      return session;
    }
  }

  private async forgetDeviceProtocol(
    signal: AbortSignal,
    connectId: string,
    remembered = this.deviceProtocols.get(protocolKey(connectId))
  ) {
    const key = protocolKey(connectId);
    await this.bindDeviceProtocol(signal, connectId);
    checkOperation(signal);
    if (remembered && this.deviceProtocols.get(key) === remembered) {
      this.deviceProtocols.delete(key);
      this.deviceProtocolsChanged = true;
    }
  }

  private async deviceOwnsAddress(
    signal: AbortSignal,
    address: string,
    { connectId, deviceId, ...wallet }: SigningTarget
  ) {
    const key = await readDevice(signal, () =>
      this.bridge.evmGetPublicKey(connectId, deviceId, {
        ...wallet,
        chainId: 1,
        showOnOneKey: false,
      })
    );
    return isSameAddress(
      bytesToHex(publicToAddress(Buffer.from(key.pub, 'hex'), true)),
      address
    );
  }

  private async repairSigningWallet(
    signal: AbortSignal,
    address: string,
    detail: AccountDetail,
    target: SigningTarget,
    originalError: Error
  ) {
    // A saved hidden-wallet id can represent the standard wallet. Only its
    // exact child public key can authorize repairing this account's metadata.
    const standard = {
      ...target,
      passphraseState: undefined,
      useEmptyPassphrase: true,
    };
    let matches = false;
    try {
      matches = await this.deviceOwnsAddress(signal, address, standard);
    } catch (error) {
      checkOperation(signal);
      if (deviceCancelled(error)) throw error;
    }
    checkOperation(signal);
    if (!matches) throw originalError;
    if (detail.passphraseState === target.passphraseState) {
      detail.passphraseState = undefined;
      this.repairedAccount = true;
    }
    if (
      this.deviceId === target.deviceId &&
      this.passphraseState === target.passphraseState
    ) {
      await this.clearSession();
    } else {
      await this.updateSessionStorage(async () => {
        const stored = (
          await browser.storage.session.get(ONEKEY_SESSION_STATE_KEY)
        )[ONEKEY_SESSION_STATE_KEY] as OneKeySessionState | undefined;
        checkOperation(signal);
        if (
          stored?.deviceId === target.deviceId &&
          stored.passphraseState === target.passphraseState
        ) {
          await browser.storage.session.remove(ONEKEY_SESSION_STATE_KEY);
        }
      });
    }
    return standard;
  }

  private async sign<T, Signed>(
    address: string,
    request: (target: SigningTarget) => Response<T>,
    verify: (payload: T) => Promise<Signed>
  ): Promise<Signed> {
    const signal = this.operations.signal;
    this.activeSignatures++;
    try {
      const detail = this._accountDetailsFromAddress(address);
      let pair: DevicePair | undefined;
      let passphraseState: string | undefined;
      let canRediscover = false;
      if (detail.version === 2) {
        await whileActive(signal, () => this.init());
        pair = this.cachedSigningDevice(detail);
        canRediscover = Boolean(pair);
        passphraseState = detail.passphraseState;
        if (pair) {
          if (
            pair.deviceId !== this.deviceId ||
            pair.connectId !== this.connectId
          ) {
            // No fresh discovery metadata is available for this cached target.
            this.hardwareSigningMetadata = {};
          }
          const protocol = this.deviceProtocols.get(
            protocolKey(pair.connectId)
          );
          if (protocol)
            await this.bindDeviceProtocol(signal, pair.connectId, protocol);
        }
      } else {
        const unlocked = await this.unlock();
        checkOperation(signal);
        pair = devicePair(this.connectId, this.deviceId);
        if (!pair) throw new Error('Missing OneKey device identity');
        passphraseState = this.passphraseState;
        if (unlocked === 'just unlocked') {
          await whileActive(
            signal,
            () =>
              new Promise<void>((resolve) =>
                setTimeout(resolve, DELAY_BETWEEN_POPUPS)
              )
          );
        }
      }

      const wallet = {
        path: this._pathFromAddress(address),
        passphraseState,
        useEmptyPassphrase: !passphraseState,
      };
      const discover = async (previous: Partial<DevicePair>) => {
        const device = await this.discoverDevice(signal, previous);
        const { connectId, deviceId } = await this.readConnectedDevice(
          signal,
          device
        );
        const next = { connectId, deviceId, ...wallet };
        if (
          previous.deviceId &&
          previous.deviceId !== deviceId &&
          !(await this.deviceOwnsAddress(signal, address, next))
        ) {
          throw new OneKeyError(
            HardwareErrorCode.DeviceCheckDeviceIdError,
            'OneKey device does not own this account'
          );
        }
        return next;
      };
      let target = pair ? { ...pair, ...wallet } : await discover(detail);
      let payload: T;
      for (;;) {
        checkOperation(signal);
        this.pendingDevice = target.connectId;
        try {
          payload = await readDevice(signal, () => request(target));
          break;
        } catch (error) {
          checkOperation(signal);
          const code =
            error instanceof OneKeyError ? Number(error.code) : undefined;
          // A disconnect during signing (817) is ambiguous. A permission error
          // (901) already initiated the WebUSB permission flow.
          if (
            deviceCancelled(error) ||
            code === HardwareErrorCode.WebDeviceNotFoundOrNeedsPermission ||
            code === HardwareErrorCode.BridgeDeviceDisconnected
          )
            throw error;
          if (target.passphraseState && passphraseDisabled(error)) {
            canRediscover = false;
            target = await this.repairSigningWallet(
              signal,
              address,
              detail,
              target,
              error
            );
            continue;
          }
          const staleId =
            code === HardwareErrorCode.DeviceNotFound ||
            code === HardwareErrorCode.DeviceCheckDeviceIdError ||
            code === HardwareErrorCode.TransportNotFound;
          const staleProtocol = protocolMismatch(error);
          if (!canRediscover || (!staleId && !staleProtocol)) throw error;
          canRediscover = false;
          if (staleProtocol)
            await this.forgetDeviceProtocol(signal, target.connectId);
          target = await discover(target);
        }
      }

      checkOperation(signal);
      const signed = await verify(payload);
      checkOperation(signal);
      if (this._accountDetailsFromAddress(address) !== detail) {
        throw new Error('OneKey account changed during signing');
      }
      if (
        detail.version === 2 &&
        (detail.connectId !== target.connectId ||
          detail.deviceId !== target.deviceId)
      ) {
        detail.connectId = target.connectId;
        detail.deviceId = target.deviceId;
        this.deviceProtocolsChanged = true;
      }
      // A successful signature identifies its signer, but cannot replace the
      // device associated with an open import wallet's xpub.
      if (!this.hdk.publicKey) {
        this.connectId = target.connectId;
        this.deviceId = target.deviceId;
      }
      return signed;
    } finally {
      this.activeSignatures--;
      if (!this.activeSignatures && !this.pendingUnlock)
        this.pendingDevice = undefined;
    }
  }

  private async verifySigner(address: string, recover: () => string) {
    try {
      if (isSameAddress(recover(), address)) return;
    } catch {
      // Malformed signatures cannot identify a signer.
    }
    await this.clearSession();
    throw new Error('signature doesnt match the right address');
  }

  async signTransaction(address: string, tx: TypedTransaction) {
    return this.sign(
      address,
      ({ connectId, deviceId, ...wallet }) =>
        this.bridge.evmSignTransaction(connectId, deviceId, {
          ...wallet,
          transaction: {
            ...tx.toJSON(),
            chainId: Number(tx.common.chainId()),
            to: tx.to?.toString(),
          } as any,
        }),
      async (payload) => {
        const signed = TransactionFactory.fromTxData(
          {
            ...tx.toJSON(),
            type: `0x${tx.type.toString(16)}`,
            v: addHexPrefix(payload.v),
            r: addHexPrefix(payload.r),
            s: addHexPrefix(payload.s),
          },
          { common: tx.common, freeze: Object.isFrozen(tx) }
        );
        await this.verifySigner(address, () =>
          signed.getSenderAddress().toString()
        );
        return signed;
      }
    );
  }

  signMessage(address: string, data: string) {
    return this.signPersonalMessage(address, data);
  }

  async signPersonalMessage(address: string, message: string) {
    const messageHex = stripHexPrefix(message);
    return this.sign(
      address,
      ({ connectId, deviceId, ...wallet }) =>
        this.bridge.evmSignMessage(connectId, deviceId, {
          ...wallet,
          messageHex,
        }),
      async (payload) => {
        const signature = addHexPrefix(payload.signature);
        await this.verifySigner(address, () =>
          recoverPersonalSignature({
            data: addHexPrefix(messageHex),
            signature,
          })
        );
        return signature;
      }
    );
  }

  async signTypedData(address, data, opts) {
    if (opts.version !== 'V3' && opts.version !== 'V4') {
      throw new Error('Not supported on this device');
    }
    const version =
      opts.version === 'V4' ? SignTypedDataVersion.V4 : SignTypedDataVersion.V3;
    const { domain, types, primaryType, message } = TypedDataUtils.sanitizeData(
      data
    );
    const domainHash = TypedDataUtils.hashStruct(
      'EIP712Domain',
      domain,
      types,
      version
    ).toString('hex');
    const messageHash = TypedDataUtils.hashStruct(
      primaryType as string,
      message,
      types,
      version
    ).toString('hex');
    try {
      return await this.sign(
        address,
        ({ connectId, deviceId, ...wallet }) =>
          this.bridge.evmSignTypedData(connectId, deviceId, {
            ...wallet,
            data,
            domainHash,
            messageHash,
            metamaskV4Compat: version === SignTypedDataVersion.V4,
            chainId: domain.chainId ? Number(domain.chainId) : undefined,
          }),
        async (payload) => {
          const signature = addHexPrefix(payload.signature);
          await this.verifySigner(address, () =>
            recoverTypedSignature({ data, signature, version })
          );
          return signature;
        }
      );
    } catch (error) {
      if (!(error instanceof OneKeyError)) throw error;
      let code: string;
      let errorMsg = error.message;
      if (error.code === 'Failure_UnexpectedMessage') {
        code = 'EIP712_FIRMWARE_NOT_SUPPORT';
        errorMsg = 'Not supported on this device';
      } else if (error.detail.includes('EIP712Domain')) {
        code = 'EIP712_DOMAIN_NOT_SUPPORT';
      } else if (error.detail.includes('EIP712')) {
        code = 'EIP712_BLIND_SIGN_DISABLED';
      } else {
        throw error;
      }
      throw Object.assign(new Error(JSON.stringify({ code, errorMsg })), {
        code: error.code,
      });
    }
  }

  exportAccount(): Promise<any> {
    return Promise.reject(new Error('Not supported on this device'));
  }

  async forgetDevice() {
    const cancellation = this.cancelPendingWork();
    this.accounts = [];
    this.accountDetails = {};
    this.repairedAccount = false;
    this.page = 0;
    this.unlockedAccount = 0;
    this.paths = {};
    await Promise.all([cancellation, this.clearSession()]);
  }

  /* PRIVATE METHODS */

  _normalize(buf: Buffer): string {
    return bytesToHex(buf);
  }

  // eslint-disable-next-line no-shadow
  _addressFromIndex(pathBase: string, i: number): string {
    const dkey = this.hdk.derive(`${pathBase}/${i}`);
    const address = bytesToHex(publicToAddress(dkey.publicKey, true));
    return toChecksumAddress(address);
  }

  _pathFromAddress(address: string): string {
    return `${this.hdPath}/${this.indexFromAddress(address)}`;
  }

  indexFromAddress(address: string) {
    const checksummedAddress = toChecksumAddress(address);
    let index =
      this.paths[checksummedAddress] ??
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
    await this.unlock();
    const addresses = await this.getAccounts();
    const currentPublicKey = this.getPathBasePublicKey();
    const accounts: Account[] = [];

    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];
      await this._fixAccountDetail(address);

      const detail = this.accountDetails[toChecksumAddress(address)];

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
    const checksummedAddress = toChecksumAddress(address);
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

  // searchDevices returns Device.toMessageObject(), which carries the full
  // features even though the SearchDevice type does not declare them.
  // Deliberately excluded: label, name, bleName, deviceId, uuid, connectId and
  // features.onekey_serial* all identify the user or the device.
  private _readHardwareSigningMetadata(device: unknown) {
    const known = device as Partial<KnownDevice> | undefined;
    const features = known?.features;

    this.hardwareSigningMetadata = {
      device_model:
        features?.onekey_device_type || known?.deviceType || undefined,
      firmware_version:
        features?.onekey_firmware_version || known?.firmwareVersion?.join('.'),
      device_mode: known?.mode,
    };
  }

  getHardwareSigningMetadata() {
    return this.hardwareSigningMetadata;
  }

  getSigningDiagnostics(_error?: unknown, _attempt?: SigningAttempt) {
    return {
      wallet_provider: 'onekey' as const,
      transport: 'usb' as const,
      error_category: 'unknown' as const,
      provider_metadata: this.hardwareSigningMetadata,
    };
  }

  private _accountDetailsFromAddress(address: string) {
    const checksummedAddress = toChecksumAddress(address);
    const accountDetails = this.accountDetails[checksummedAddress];
    if (typeof accountDetails === 'undefined') {
      throw new Error('Unknown address');
    }
    return accountDetails;
  }
}

export default OneKeyKeyring;
