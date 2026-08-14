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
  ClearSignContextType,
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
import type { HardwareSigningMetadata } from './hardware-wallet-sentry';

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

// Diagnostics only: nothing below changes what Rabby does, it only records
// what happened so a failure can name its own cause in Sentry.
// Sized so the rendered trace stays well inside the 4000 character ceiling
// redactSensitiveText applies on the way to Sentry: 40 SDK step names plus
// offsets, and the handful of cap-exempt entries, come to roughly 3k in the
// worst case seen. That ceiling truncates silently, unlike this cap, so
// raising this materially would need the exempt entries counted too.
const MAX_DEVICE_ACTION_TRACE_STEPS = 40;
const LEDGER_CLEAR_SIGNING_TIMEOUT_SUSPECT_MS = 4500;
// The device session outlives a single signing operation, so its age and use
// count are what tell a fresh-session failure apart from a stale-session one.
let sessionCreatedAt: number | null = null;
let sessionActionCount = 0;

type LedgerActionName = NonNullable<HardwareSigningMetadata['ledger_action']>;
type LedgerActionStatus = NonNullable<
  HardwareSigningMetadata['ledger_action_status']
>;

// Monotonic on purpose: these values are only ever subtracted from each other,
// and a system clock adjustment during a signing operation would otherwise
// produce a nonsensical or negative duration.
const monotonicNow = () => Math.round(performance.now());

// One per signing attempt rather than one module-wide, because attempts can
// overlap: the approval screen offers Resend while the device is still waiting
// on the first one, and that starts a second signing request without
// cancelling or awaiting the first. A single shared trace would let the second
// attempt reset the first's timing and reuse reading before the first has
// reported its failure.
type DeviceActionTrace = {
  entries: string[];
  startedAt: number;
  truncated: boolean;
  sessionReused: boolean;
  overlapDeclared: boolean;
  // How many Clear Signing descriptors came back as errors, and how many were
  // returned at all. Without this a context set that comes back fast but
  // incomplete is indistinguishable from a failure unrelated to Clear Signing.
  contextErrorCount?: number;
  contextCount?: number;
  lastAction?: LedgerActionName;
  lastActionStatus?: LedgerActionStatus;
  lastActionDurationMs?: number;
  web3ChecksOptInResult?: boolean;
  clearSigningTimeoutSuspected?: boolean;
  lastStepAt?: number;
};

const activeTraces = new Set<DeviceActionTrace>();
// Keyed by the thrown failure so each attempt reports the trace it actually
// produced, whatever has become current by the time the error is reported.
const traceByError = new WeakMap<object, DeviceActionTrace>();

const cloneSharedAttemptError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return error;
  }

  const clone = new Error(error.message);
  clone.name = error.name;
  for (const key of LEDGER_ERROR_KEYS) {
    if (key in error) {
      (clone as any)[key] = (error as any)[key];
    }
  }
  return clone;
};

const pushTraceEntry = (
  trace: DeviceActionTrace | null,
  entry: string,
  exemptFromCap = false,
  measuredAt?: number
) => {
  try {
    // No trace means no signing attempt is open — device actions run for
    // account discovery too, and those are not diagnosed here.
    if (!trace) {
      return;
    }

    if (
      !exemptFromCap &&
      trace.entries.length >= MAX_DEVICE_ACTION_TRACE_STEPS
    ) {
      // Marked exactly once, on the first entry actually dropped, so a
      // truncated trace is never read as a complete one and a trace that
      // merely fills the budget keeps all of its entries. Tracked in a flag
      // rather than inferred from the length, which an exempt push can carry
      // past the boundary. The head is what survives: the gaps between the
      // early steps are the Clear Signing timeout evidence, and overflowing a
      // budget this far above a normal operation means something looped.
      if (!trace.truncated) {
        trace.truncated = true;
        trace.entries.push('truncated');
      }
      return;
    }

    // Offsets from the start of the attempt: the gap between two steps is what
    // identifies a Clear Signing network timeout, and an offset leaks nothing
    // about when the user was signing.
    const now = measuredAt ?? monotonicNow();
    trace.entries.push(`${entry}@${now - trace.startedAt}ms`);
  } catch {
    // Diagnostic recording must never affect the device operation.
  }
};

const declareOverlap = (trace: DeviceActionTrace, exemptFromCap = false) => {
  if (trace.overlapDeclared) {
    return;
  }

  trace.overlapDeclared = true;
  pushTraceEntry(trace, 'overlappingAttempt', exemptFromCap);
};

// A signing attempt spans several device actions — getAddress, openApp and the
// sign itself each get their own runDeviceAction — so the trace covers the
// whole attempt, including the connection-opening recovery in ensureEthApp,
// which tears down and rebuilds the session midway.
const withDeviceActionTrace = async <T>(
  run: (trace: DeviceActionTrace | null) => Promise<T>
): Promise<T> => {
  let startedAt: number;
  try {
    startedAt = monotonicNow();
  } catch {
    return run(null);
  }

  const trace: DeviceActionTrace = {
    entries: [],
    startedAt,
    truncated: false,
    // Not merely "a session existed": the session is opened before the
    // approval screen, so that would be true of almost every signature. What
    // separates a stale-session failure from a fresh-session one is whether
    // this session had already done work when the attempt began.
    sessionReused: sessionActionCount > 0,
    overlapDeclared: false,
  };

  if (activeTraces.size > 0) {
    activeTraces.forEach((activeTrace) => declareOverlap(activeTrace, true));
    declareOverlap(trace);
  }
  activeTraces.add(trace);

  try {
    return await run(trace);
  } catch (error) {
    if (error && typeof error === 'object') {
      try {
        traceByError.set(error, trace);
      } catch {
        // Diagnostic attribution must never replace the signing error.
      }
    }
    throw error;
  } finally {
    activeTraces.delete(trace);
  }
};

// Both arguments are already stringified by the caller — see the tap in
// runDeviceAction. Steps arrive fully namespaced
// ("signer.eth.steps.provideContexts").
const recordDeviceActionStep = (
  trace: DeviceActionTrace | null,
  step: string,
  interaction?: string,
  result?: boolean
) => {
  const name = step.slice(step.lastIndexOf('.') + 1);
  const suffix =
    interaction && interaction !== UserInteractionRequired.None
      ? `(${interaction})`
      : '';
  const now = monotonicNow();

  if (trace) {
    const gap = trace.lastStepAt === undefined ? 0 : now - trace.lastStepAt;
    if (
      gap >= LEDGER_CLEAR_SIGNING_TIMEOUT_SUSPECT_MS &&
      name === 'provideContexts'
    ) {
      trace.clearSigningTimeoutSuspected = true;
    }
    trace.lastStepAt = now;
  }

  pushTraceEntry(trace, `${name}${suffix}`, false, now);
  if (
    trace &&
    name === 'web3ChecksOptInResult' &&
    typeof result === 'boolean'
  ) {
    trace.web3ChecksOptInResult = result;
  }
};

// Reconnecting resets the session counters, so without this the report would
// describe the session Rabby recovered onto and lose the age of the one that
// actually failed.
const recordSessionTeardown = (trace: DeviceActionTrace | null) => {
  const age = sessionCreatedAt === null ? 0 : monotonicNow() - sessionCreatedAt;

  // Exempt from the cap: this is the one entry the trace exists to preserve
  // across a mid-operation reconnect, and a filled trace must not drop it.
  pushTraceEntry(
    trace,
    `sessionClosed(age=${age}ms,actions=${sessionActionCount})`,
    true
  );
};

const cancelScheduledLedgerSessionRelease = () => {
  if (sessionReleaseTimer !== null) {
    clearTimeout(sessionReleaseTimer);
    sessionReleaseTimer = null;
  }
};

const cleanUpLedgerSession = async (
  // Passed by a caller that knows which attempt it is tearing down; otherwise
  // best effort, since a teardown can also come from the idle timer or the
  // offscreen disconnect event, which belong to no attempt.
  owningTrace: DeviceActionTrace | null = null
) => {
  cancelScheduledLedgerSessionRelease();
  const currentSessionId = sessionId;

  // Every teardown funnels through here, so this is the one place that sees
  // them all: the recovery paths, the offscreen disconnect event and the idle
  // release. Teardowns outside a signing attempt have no trace to land in and
  // are dropped.
  if (currentSessionId && owningTrace) {
    try {
      recordSessionTeardown(owningTrace);
    } catch {
      // Cleanup must continue even if diagnostics fail.
    }
  }

  ledgerSessionClosed$.next();
  ethSigner = null;
  sessionId = null;
  // Cleared so session_age_ms only ever describes a session that is actually
  // open. The reading for a session torn down mid-operation is preserved by
  // recordSessionTeardown above; keeping the timestamp alive here would
  // instead report a long-dead session's age on a failure that had no
  // session at all, contradicting session_reused.
  sessionCreatedAt = null;
  sessionActionCount = 0;

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

const getEthContextModule = (trace: DeviceActionTrace | null = null) => {
  const contextModule = new ContextModuleBuilder({
    networkTimeoutMs: LEDGER_CLEAR_SIGNING_NETWORK_TIMEOUT,
  })
    .setChain(ContextModuleChainID.Ethereum)
    .setBlindSigningReporter(noOpBlindSigningReporter)
    .build();

  // Counts only. The result is handed back untouched — same array, same
  // order, same length — so this cannot change what the device is sent. That
  // is what keeps it a side-channel reading rather than a behaviour change.
  const getContexts = contextModule.getContexts.bind(contextModule);
  contextModule.getContexts = async (input, expectedTypes) => {
    const contexts = await getContexts(input, expectedTypes);

    try {
      if (trace) {
        const errors = contexts.filter(
          (context) => context?.type === ClearSignContextType.ERROR
        ).length;
        trace.contextErrorCount = (trace.contextErrorCount ?? 0) + errors;
        trace.contextCount = (trace.contextCount ?? 0) + contexts.length;
      }
    } catch {
      // Observation must never affect the fetch.
    }

    return contexts;
  };

  // EIP-712 fetches through both this and getContexts, so counting only the
  // latter would under-report the typed-data path. Same rules: the result is
  // handed back untouched and counting cannot throw into the fetch.
  const getTypedDataFilters = contextModule.getTypedDataFilters.bind(
    contextModule
  );
  contextModule.getTypedDataFilters = async (typedData) => {
    const context = await getTypedDataFilters(typedData);

    try {
      if (trace) {
        trace.contextCount = (trace.contextCount ?? 0) + 1;
        // TypedDataClearSignContext is a discriminated union whose failure
        // arm is the string literal 'error', not a ClearSignContextType.
        if (context?.type === 'error') {
          trace.contextErrorCount = (trace.contextErrorCount ?? 0) + 1;
        }
      }
    } catch {
      // Observation must never affect the fetch.
    }

    return context;
  };

  return contextModule;
};

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

// Shape-checked because this value is reported as a Sentry tag and joins the
// fingerprint: the codes it is read from come off an SDK `any`, and anything
// unbounded landing in a fingerprint splits grouping without limit.
const LEDGER_STATUS_WORD_SHAPE = /^[\da-f]{1,4}$/u;

// The budget has to clear the wrappers, not just the error: a signing failure
// is wrapped by toLedgerError in runDeviceAction and again in the signing
// method, so the device's own error sits two levels down and its cause three.
// A limit that only just reaches it would silently drop the status word the
// moment anything on a signing path added a wrap. Still bounded, so a cyclic
// cause chain terminates.
const MAX_LEDGER_ERROR_CAUSE_DEPTH = 6;

// The reporting side must not re-derive the status word from message text:
// getLedgerErrorMessage flattens the whole error chain into one string, so any
// nested code is rendered in the same 0x-prefixed shape as the real one and no
// position rule can tell them apart. This walks the chain instead, because
// toLedgerError keeps the SDK failure as `cause`.
const findLedgerStatusWord = (err: unknown, depth = 0): string => {
  if (!err || depth > MAX_LEDGER_ERROR_CAUSE_DEPTH) {
    return '';
  }

  const word = getLedgerStatusWord(err);
  if (LEDGER_STATUS_WORD_SHAPE.test(word)) {
    return word;
  }

  return findLedgerStatusWord((err as any).cause, depth + 1);
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
  Object.assign(new Error(getLedgerErrorMessage(err, fallback)), {
    cause: err,
  });

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
  trace: DeviceActionTrace | null,
  ledgerAction: LedgerActionName
): Promise<Output> => {
  beginLedgerOperation();
  sessionActionCount += 1;
  let actionStartedAt: number | null = null;
  try {
    actionStartedAt = monotonicNow();
  } catch {
    // Diagnostic timing must never affect the device action.
  }
  let previousMarker: string | undefined;
  let actionStatusRecorded = false;
  const recordActionStatus = (status: LedgerActionStatus) => {
    try {
      if (!trace) {
        return;
      }
      trace.lastAction = ledgerAction;
      trace.lastActionStatus = status;
      actionStatusRecorded = true;
      trace.lastActionDurationMs =
        actionStartedAt === null ? undefined : monotonicNow() - actionStartedAt;
    } catch {
      // Diagnostic recording must never replace the signing error.
    }
  };
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
          try {
            const intermediate =
              'intermediateValue' in state
                ? state.intermediateValue
                : undefined;
            if (!intermediate?.step) {
              return;
            }

            const step = String(intermediate.step);
            const interaction =
              intermediate.requiredUserInteraction == null
                ? undefined
                : String(intermediate.requiredUserInteraction);
            const result =
              typeof intermediate.result === 'boolean'
                ? intermediate.result
                : undefined;
            const marker = `${step}:${interaction}:${result}`;

            if (marker !== previousMarker) {
              console.debug('[Ledger DMK][stage]', {
                step,
                interaction,
                timestamp: Date.now(),
              });
              recordDeviceActionStep(trace, step, interaction, result);
              previousMarker = marker;
            }
          } catch {
            // Diagnostics must never be able to fail a signature.
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
              recordActionStatus('completed');
              return state.output;
            case DeviceActionStatus.Error:
              recordActionStatus('error');
              throw toLedgerError(
                state.error,
                'Ledger: Unknown device action error'
              );
            case DeviceActionStatus.Stopped:
              recordActionStatus('stopped');
              throw new Error('Ledger: Operation stopped');
            default:
              recordActionStatus('unknown');
              throw new Error('Ledger: Unexpected device action state');
          }
        })
      )
    );
  } catch (e: any) {
    if (!actionStatusRecorded) {
      recordActionStatus('error');
    }
    cancelAction();
    if (isLedgerSignatureResponseCorrupted(e)) {
      await cleanUpLedgerSession(trace);
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
  private hardwareSigningMetadata: HardwareSigningMetadata = {};

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

  private async getCurrentSessionState(
    owningTrace: DeviceActionTrace | null = null
  ) {
    if (!sessionId || !dmk) {
      return null;
    }

    try {
      return await firstValueFrom(
        dmk.getDeviceSessionState({ sessionId }).pipe(take(1))
      );
    } catch {
      await this.cleanUp(owningTrace);
      return null;
    }
  }

  private buildSigner(trace: DeviceActionTrace | null = null) {
    if (!dmk || !sessionId) {
      return;
    }
    // The Clear Signing network deadline is scoped to this Context Module.
    ethSigner = new SignerEthBuilder({
      dmk,
      sessionId,
    })
      .withContextModule(getEthContextModule(trace))
      .build();
    return ethSigner;
  }

  private async hasActiveSession(owningTrace: DeviceActionTrace | null = null) {
    const state = await this.getCurrentSessionState(owningTrace);

    if (!state) {
      return false;
    }

    if (state.deviceStatus === DeviceStatus.NOT_CONNECTED) {
      await this.cleanUp(owningTrace);
      return false;
    }

    if (!ethSigner) {
      this.buildSigner();
    }

    return !!ethSigner;
  }

  async makeApp(owningTrace: DeviceActionTrace | null = null) {
    cancelScheduledLedgerSessionRelease();

    if (await this.hasActiveSession(owningTrace)) {
      return;
    }

    if (makeAppPromise) {
      try {
        await makeAppPromise;
      } catch (error) {
        // Same reason as the shared unlock below: every caller of a shared
        // session open must get its own failure object, or two attempts
        // overwrite each other in traceByError and one report carries the
        // other's trace.
        throw cloneSharedAttemptError(error);
      }
      return;
    }

    makeAppPromise = (async () => {
      if (await this.hasActiveSession(owningTrace)) {
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
      try {
        sessionCreatedAt = monotonicNow();
      } catch {
        sessionCreatedAt = null;
      }
      sessionActionCount = 0;
      this.buildSigner();
      await this.ensureDeviceReady(owningTrace);
    })();

    try {
      await makeAppPromise;
    } finally {
      makeAppPromise = null;
    }
  }

  private async ensureDeviceReady(
    owningTrace: DeviceActionTrace | null = null
  ) {
    const state = await this.getCurrentSessionState(owningTrace);
    console.log('Ledger: Current device state ensureDeviceReady', state);

    if (!state) {
      throw new Error('Ledger: Device disconnected');
    }

    this.hardwareSigningMetadata = {
      device_model: String(state.deviceModelId),
      firmware_version:
        'firmwareVersion' in state ? state.firmwareVersion?.os : undefined,
      app_name: 'currentApp' in state ? state.currentApp?.name : undefined,
      app_version:
        'currentApp' in state ? state.currentApp?.version : undefined,
    };

    if (state.deviceStatus === DeviceStatus.CONNECTED) {
      return state;
    }

    if (state.deviceStatus === DeviceStatus.BUSY) {
      await delay(LEDGER_BUSY_RECHECK_TIMEOUT);
      const nextState = await this.getCurrentSessionState(owningTrace);
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

  getHardwareSigningMetadata(error?: unknown): HardwareSigningMetadata {
    // Strictly the attempt's own trace. There is deliberately no fallback to
    // whatever is current: the wrapper restores that before a failure is
    // reported, so a fallback would hand over an unrelated attempt's trace.
    const trace =
      error && typeof error === 'object' ? traceByError.get(error) : undefined;

    return {
      ...this.hardwareSigningMetadata,
      status_word: findLedgerStatusWord(error) || undefined,
      device_action_steps: trace?.entries.join(' > ') || undefined,
      // Both are omitted together while no session is open: reporting a count
      // of 0 next to no age reads as a real measurement of a session that does
      // not exist.
      session_age_ms:
        sessionCreatedAt === null
          ? undefined
          : monotonicNow() - sessionCreatedAt,
      session_action_count:
        sessionCreatedAt === null ? undefined : sessionActionCount,
      session_reused: trace?.sessionReused,
      ledger_context_error_count: trace?.contextErrorCount,
      ledger_context_count: trace?.contextCount,
      ledger_action: trace?.lastAction,
      ledger_action_status: trace?.lastActionStatus,
      ledger_action_duration_ms: trace?.lastActionDurationMs,
      ledger_web3_checks_opt_in_result: trace?.web3ChecksOptInResult,
      ledger_clear_signing_timeout_suspected:
        trace?.clearSigningTimeoutSuspected,
    };
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

  private async ensureEthApp(
    owningTrace: DeviceActionTrace | null = null,
    recoverConnectionOpening = true
  ): Promise<void> {
    beginLedgerOperation();
    try {
      await this.makeApp(owningTrace);
      const state = await this.ensureDeviceReady(owningTrace);
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
          owningTrace,
          'openApp'
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

        await this.cleanUp(owningTrace);
        await this.ensureEthApp(owningTrace, false);
      }
    } finally {
      endLedgerOperation();
    }
  }

  async cleanUp(owningTrace: DeviceActionTrace | null = null) {
    await cleanUpLedgerSession(owningTrace);
  }

  async unlock(
    hdPath?,
    force?: boolean,
    retryConnectionOpening = true,
    owningTrace: DeviceActionTrace | null = null
  ): Promise<string> {
    if (this.unlockPromise) {
      try {
        return await this.unlockPromise;
      } catch (error) {
        throw cloneSharedAttemptError(error);
      }
    }

    const promise = this.unlockInternal(
      hdPath,
      force,
      retryConnectionOpening,
      owningTrace
    );
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
    retryConnectionOpening = true,
    owningTrace: DeviceActionTrace | null = null
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
      res = await this.getLedgerAddress(path, owningTrace);
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
        await this.cleanUp(owningTrace);
        return this.unlockInternal(hdPath, force, false, owningTrace);
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
    // Wraps the whole body, not just the device call: the serialisation below
    // can throw, and that failure is reported through
    // withHardwareSigningContext too.
    return withDeviceActionTrace(async (trace) =>
      this.serializeAndSign(address, tx, trace)
    );
  }

  private serializeAndSign(address, tx, owningTrace: DeviceActionTrace | null) {
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

      return this._signTransaction(
        address,
        rawTxHex,
        (payload) => {
          tx.v = Buffer.from(payload.v, 'hex');
          tx.r = Buffer.from(payload.r, 'hex');
          tx.s = Buffer.from(payload.s, 'hex');
          return tx;
        },
        owningTrace
      );
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

    return this._signTransaction(
      address,
      rawTxHex,
      (payload) => {
        // Because tx will be immutable, first get a plain javascript object
        // that represents the transaction. Using txData here as it aligns with
        // the nomenclature of ethereumjs/tx.
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
      },
      owningTrace
    );
  }

  async _signTransaction(
    address,
    rawTxHex,
    handleSigning,
    owningTrace: DeviceActionTrace | null
  ) {
    const hdPath = await this.unlockAccountByAddress(address, owningTrace);
    await this.ensureEthApp(owningTrace);
    try {
      const signer = this.buildSigner(owningTrace);
      if (!signer) {
        throw new Error('Ledger: Device disconnected');
      }
      const res = toLegacySignaturePayload(
        await runDeviceAction(
          signer.signTransaction(
            this._toLedgerPath(hdPath),
            Buffer.from(rawTxHex, 'hex'),
            { skipOpenApp: true }
          ),
          owningTrace,
          'signTx'
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
  signPersonalMessage(withAccount, message) {
    return withDeviceActionTrace((trace) =>
      this.signPersonalMessageInternal(withAccount, message, trace)
    );
  }

  private async signPersonalMessageInternal(
    withAccount,
    message,
    owningTrace: DeviceActionTrace | null
  ) {
    try {
      const hdPath = await this.unlockAccountByAddress(
        withAccount,
        owningTrace
      );
      await this.ensureEthApp(owningTrace);
      const signature = toSignatureHex(
        await runDeviceAction(
          ethSigner!.signMessage(
            this._toLedgerPath(hdPath),
            Buffer.from(stripHexPrefix(message), 'hex'),
            { skipOpenApp: true }
          ),
          owningTrace,
          'signMessage'
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

  async unlockAccountByAddress(
    address,
    owningTrace: DeviceActionTrace | null = null
  ) {
    const checksummedAddress = toChecksumAddress(address);
    if (!Object.keys(this.accountDetails).includes(checksummedAddress)) {
      throw new Error(
        `Ledger: Account for address '${checksummedAddress}' not found`
      );
    }
    const { hdPath } = this.accountDetails[checksummedAddress];
    const unlockedAddress: string = await this.unlock(
      hdPath,
      undefined,
      true,
      owningTrace
    );

    // unlock resolves to the address for the given hdPath as reported by the ledger device
    // if that address is not the requested address, then this account belongs to a different device or seed
    if (unlockedAddress.toLowerCase() !== address.toLowerCase()) {
      throw new Error(
        `Ledger: Account ${address} does not belong to the connected device`
      );
    }
    return hdPath;
  }

  signTypedData(withAccount, data, options: any = {}) {
    return withDeviceActionTrace((trace) =>
      this.signTypedDataInternal(withAccount, data, options, trace)
    );
  }

  private async signTypedDataInternal(
    withAccount,
    data,
    options: any,
    owningTrace: DeviceActionTrace | null
  ) {
    const isV4 = options.version === 'V4';
    if (!isV4) {
      throw new Error(
        'Ledger: Only version 4 of typed data signing is supported'
      );
    }
    if (!data?.domain || !data?.types || !data?.message) {
      throw new Error('Ledger: Typed data payload is incomplete');
    }

    const hdPath = await this.unlockAccountByAddress(withAccount, owningTrace);
    try {
      await this.ensureEthApp(owningTrace);
      const signer = this.buildSigner(owningTrace);
      if (!signer) {
        throw new Error('Ledger: Device disconnected');
      }
      const signature = toSignatureHex(
        await runDeviceAction(
          signer.signTypedData(this._toLedgerPath(hdPath), data, {
            skipOpenApp: true,
          }),
          owningTrace,
          'signTypedData'
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

  private async getLedgerAddress(
    path: string,
    owningTrace: DeviceActionTrace | null = null
  ) {
    await this.ensureEthApp(owningTrace);

    return runDeviceAction(
      ethSigner!.getAddress(this._toLedgerPath(path), {
        checkOnDevice: false,
        returnChainCode: true,
        skipOpenApp: true,
      }),
      owningTrace,
      'getAddress'
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
