/** @jest-environment node */
Object.assign(globalThis, { location: new URL('http://localhost') });
jest.mock('webextension-polyfill', () => ({
  __esModule: true,
  default: {
    tabs: { onCreated: { addListener: jest.fn() } },
    windows: { getAll: jest.fn().mockResolvedValue([]), update: jest.fn() },
    action: { setBadgeText: jest.fn(), setBadgeBackgroundColor: jest.fn() },
    browserAction: {
      setBadgeText: jest.fn(),
      setBadgeBackgroundColor: jest.fn(),
    },
  },
}));

const mockOpenNotification = jest.fn().mockResolvedValue(1);

jest.mock('background/webapi', () => ({
  winMgr: {
    event: { on: jest.fn() },
    openNotification: mockOpenNotification,
    remove: jest.fn(),
  },
}));

jest.mock('@/background/service/transactionHistory', () => ({
  __esModule: true,
  default: {
    addSigningTx: jest.fn(() => 'signing-tx-id'),
    getSigningTx: jest.fn(),
    removeSigningTx: jest.fn(),
    removeAllSigningTx: jest.fn(),
  },
}));

jest.mock('@/background/service/preference', () => ({
  __esModule: true,
  default: {
    getCurrentAccount: jest.fn(() => ({ address: '0xaccount' })),
    resetCurrentCoboSafeAddress: jest.fn(),
  },
}));

jest.mock('@/stats', () => ({
  __esModule: true,
  default: { report: jest.fn() },
}));

jest.mock('@/utils/chain', () => ({
  findChain: jest.fn(),
  getChainList: () => [],
  ensureChainHashValid: (value) => value,
  ensureChainListValid: (value) => value,
}));

jest.mock('@/utils/env', () => ({ isManifestV3: false }));

const mockCaptureException = jest.fn();
jest.mock('@sentry/browser', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

import { TypedDataUtils, SignTypedDataVersion } from '@metamask/eth-sig-util';
import { bytesToHex } from '@ethereumjs/util';
const safeData = {
  types: { EIP712Domain: [], Test: [{ name: 'value', type: 'string' }] },
  primaryType: 'Test' as const,
  domain: {},
  message: { value: 'safe' },
};
const safeHash = bytesToHex(
  TypedDataUtils.eip712Hash(safeData, SignTypedDataVersion.V4)
);
const createTarget = () => ({
  data: {
    to: '0x3333333333333333333333333333333333333333',
    value: '0',
    nonce: 1,
  },
  signatures: new Map(),
  addSignature(signature) {
    this.signatures.set(signature.signer, signature);
  },
  encodedSignatures: () => 'safe-signature-normalized',
});
const mockSafe = {
  currentTransaction: createTarget(),
  currentSafeMessage: createTarget(),
  safeInstance: {
    safeAddress: '0x2222222222222222222222222222222222222222',
    getTransactionHash: jest.fn(),
    getSafeMessageHash: jest.fn(),
    provider: { getSigner: () => ({ getAddress: mockGetSignerAddress }) },
    request: { postTransactions: jest.fn(), confirmTransaction: jest.fn() },
    addMessage: jest.fn(),
    addMessageSignature: jest.fn(),
  },
};
const mockGetSignerAddress = jest.fn();
import notificationService from '@/background/service/notification';

import 'reflect-metadata';
jest.mock('background/service', () => ({
  notificationService: jest.requireActual('@/background/service/notification')
    .default,
  keyringService: {
    isUnlocked: () => true,
    getKeyringsByType: () => [mockSafe],
    getKeyringForAccount: jest.fn().mockResolvedValue({}),
    signTypedMessage: jest.fn().mockResolvedValue('safe-signature'),
  },
}));
jest.mock('background/utils', () => ({
  PromiseFlow: class {
    task: any;
    use(task: any) {
      this.task = task;
      return this;
    }
    callback() {
      return (ctx: any) => this.task(ctx.request);
    }
  },
}));
jest.mock('@/background/controller/provider/controller', () => ({
  __esModule: true,
  default: { personalSign: jest.fn(), ethSendTransaction: jest.fn() },
}));
jest.mock('@/background/utils/safe', () => ({}));
jest.mock('@safe-global/protocol-kit', () => ({
  SigningMethod: { ETH_SIGN_TYPED_DATA: 'typed' },
  EthSafeSignature: class {
    constructor(public signer, public data) {}
  },
  hashSafeMessage: () => 'message-hash',
}));
jest.mock('@safe-global/protocol-kit/dist/src/utils', () => ({
  adjustVInSignature: jest.fn(
    async (_method, signature) => signature + '-normalized'
  ),
}));
jest.mock('@/background/service/signTxPreparation', () => ({}));
jest.mock('@/utils/transaction', () => ({}));
jest.mock('@/utils', () => ({}));
jest.mock('@/utils/ga4', () => ({}));
import rpcFlow from '@/background/controller/provider/rpcFlow';
import controller from '@/background/controller/provider/controller';
import { keyringService } from 'background/service';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import { toApprovalRef } from '@/utils/signingTypes';

const account = {
  address: '0x1111111111111111111111111111111111111111',
  type: 'Ledger',
  brandName: 'Ledger',
};
const run = (method = 'personalSign', extra = {}) => {
  Reflect.defineMetadata(
    'APPROVAL',
    [method === 'personalSign' ? 'SignText' : 'SignTx'],
    controller,
    method
  );
  return rpcFlow({
    mapMethod: method,
    approvalRes: {
      uiRequestComponent: 'LedgerHardwareWaiting',
      $account: account,
      gasPrice: '0x64',
      maxFeePerGas: '0x64',
      nonce: '0x1',
      ...extra,
    },
    request: { account, session: { origin: 'dapp' } },
  } as any);
};
const current = () => notificationService.currentApproval!;
const ref = () => toApprovalRef(current().id, current().data.approvalComponent);
const sign = () =>
  notificationService.signApproval(ref(), current().data.signingAttempt!);
const resolveWaiting = () =>
  notificationService.resolveApprovalFor({ approval: ref(), data: 'done' });
const deferred = <T = string>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { resolve, promise };
};

beforeEach(() => {
  notificationService.rejectAllApprovals();
  notificationService.isLocked = false;
  eventBus.events = {};
  jest.clearAllMocks();
  mockSafe.currentTransaction = createTarget();
  mockSafe.currentSafeMessage = createTarget();
  mockSafe.safeInstance.getTransactionHash.mockResolvedValue(safeHash);
  mockSafe.safeInstance.getSafeMessageHash.mockResolvedValue(safeHash);
  mockGetSignerAddress.mockResolvedValue(account.address);
});

it('starts only on a bound RPC, returns locally, and joins the same attempt on remount', async () => {
  const pending = deferred();
  (controller.personalSign as jest.Mock).mockReturnValue(pending.promise);
  const result = run();
  const id = current().data.signingAttempt!;
  const owner = ref();
  const publish = jest.fn();
  eventBus.addEventListener(EVENTS.broadcastToUI, publish);
  expect(controller.personalSign).not.toHaveBeenCalled();
  for (const invalid of [
    toApprovalRef('other', owner.component),
    toApprovalRef(owner.approvalId, 'SignTx'),
  ]) {
    expect(await notificationService.signApproval(invalid, id)).toBeUndefined();
  }
  for (const invalid of [5, -1, 0.5, NaN]) {
    expect(
      await notificationService.signApproval(owner, invalid)
    ).toBeUndefined();
  }
  const first = sign();
  const reopened = sign();
  expect(controller.personalSign).toHaveBeenCalledTimes(1);
  pending.resolve('signature');
  expect(await first).toEqual({ success: true, data: 'signature' });
  expect(await reopened).toEqual(await first);
  expect(publish).not.toHaveBeenCalled();
  await resolveWaiting();
  await expect(result).resolves.toBe('done');
});

it('requires the next retry sequence and retains cumulative fee/nonce updates', async () => {
  (controller.ethSendTransaction as jest.Mock).mockRejectedValue(
    new Error('underpriced')
  );
  const result = run('ethSendTransaction');
  await sign();
  const owner = ref();
  for (const [index, [type, gasPrice, nonce]] of ([
    ['gasPrice', '0x82', '0x1'],
    ['gasPrice', '0xa9', '0x1'],
    ['nonce', '0xa9', '0x3'],
    [false, '0xa9', '0x3'],
  ] as const).entries()) {
    const previous = current().data.signingAttempt!;
    const retry = { type, nonce: '0x3' };
    const next = previous + 1;
    expect(
      (await notificationService.signApproval(owner, next, retry))?.success
    ).toBe(false);
    expect(current().data.signingAttempt).toBe(next);
    const calls = (controller.ethSendTransaction as jest.Mock).mock.calls;
    expect(
      await notificationService.signApproval(owner, previous, retry)
    ).toBeUndefined();
    expect(calls.at(-1)[0].approvalRes).toMatchObject({
      gasPrice,
      maxFeePerGas: gasPrice,
      nonce,
    });
    expect(
      (await notificationService.signApproval(owner, next, retry))?.success
    ).toBe(false);
    expect(calls).toHaveLength(index + 2);
  }
  await resolveWaiting();
  await result;
});

it('aborts the replaced attempt and drops its late result', async () => {
  const old = deferred();
  (controller.personalSign as jest.Mock)
    .mockReturnValueOnce(old.promise)
    .mockResolvedValueOnce('new');
  const result = run();
  const previous = current().data.signingAttempt!;
  const first = sign();
  const oldSignal = (controller.personalSign as jest.Mock).mock.calls[0][0]
    .signingSignal;
  const next = await notificationService.signApproval(ref(), previous + 1, {
    type: 'origin',
  });
  expect(next).toEqual({ success: true, data: 'new' });
  expect(oldSignal.aborted).toBe(true);
  old.resolve('old');
  expect(await first).toBeUndefined();
  await resolveWaiting();
  await result;
});

it('cannot start a cancelled approval, including cancellation before mounting', async () => {
  const result = run().catch((e) => e);
  const owner = ref();
  const id = current().data.signingAttempt!;
  notificationService.rejectAllApprovals();
  await result;
  expect(await notificationService.signApproval(owner, id)).toBeUndefined();
  expect(controller.personalSign).not.toHaveBeenCalled();
});

it('keeps a late result out of a replacement approval', async () => {
  const old = deferred();
  (controller.personalSign as jest.Mock)
    .mockReturnValueOnce(old.promise)
    .mockResolvedValueOnce('b');
  const requestA = run().catch((e) => e);
  const resultA = sign();
  notificationService.rejectAllApprovals();
  const requestB = run();
  old.resolve('a');
  expect(await resultA).toBeUndefined();
  expect(await sign()).toEqual({ success: true, data: 'b' });
  await resolveWaiting();
  await Promise.all([requestA, requestB]);
});

it('returns signing failures to the calling waiting page with their hardware classification', async () => {
  (controller.personalSign as jest.Mock).mockRejectedValue({
    message: 'DISCONNECTED',
    signingErrorStage: 'hardware',
  });
  const result = run();
  expect(await sign()).toEqual({
    success: false,
    errorMsg: 'DISCONNECTED',
    errorStage: 'hardware',
  });
  await resolveWaiting();
  await result;
});

it('signs and submits Safe data once, using its selected signer', async () => {
  const result = run('personalSign', {
    isGnosis: true,
    data: [account.address, JSON.stringify(safeData)],
  });
  const [first, reopened] = await Promise.all([sign(), sign()]);
  expect(first).toEqual({ success: true, data: 'safe-signature-normalized' });
  expect(reopened).toEqual(first);
  expect(keyringService.getKeyringForAccount).toHaveBeenCalledWith(
    account.address,
    account.type
  );
  expect(controller.personalSign).not.toHaveBeenCalled();
  expect(mockSafe.currentTransaction.signatures.get(account.address).data).toBe(
    'safe-signature-normalized'
  );
  expect(mockSafe.safeInstance.request.postTransactions).toHaveBeenCalledTimes(
    1
  );
  expect(mockSafe.safeInstance.request.postTransactions).toHaveBeenCalledWith(
    mockSafe.safeInstance.safeAddress,
    expect.objectContaining({
      sender: account.address,
      contractTransactionHash: safeHash,
      signature: 'safe-signature-normalized',
    })
  );
  await resolveWaiting();
  await result;
});

it.each(['hash', 'sender', 'signing'] as const)(
  'does not submit Safe data after cancellation during %s lookup',
  async (stage) => {
    const pending = deferred();
    const gate =
      stage === 'hash'
        ? mockSafe.safeInstance.getTransactionHash
        : stage === 'sender'
        ? mockGetSignerAddress
        : (keyringService.signTypedMessage as jest.Mock);
    gate.mockReturnValueOnce(pending.promise);
    const result = run('personalSign', {
      isGnosis: true,
      data: [account.address, JSON.stringify(safeData)],
    }).catch((e) => e);
    const signing = sign();
    while (!gate.mock.calls.length) await Promise.resolve();
    notificationService.rejectAllApprovals();
    pending.resolve(
      stage === 'hash'
        ? safeHash
        : stage === 'sender'
        ? account.address
        : 'signature'
    );
    expect(await signing).toBeUndefined();
    expect(
      mockSafe.safeInstance.request.postTransactions
    ).not.toHaveBeenCalled();
    expect(
      mockSafe.safeInstance.request.confirmTransaction
    ).not.toHaveBeenCalled();
    expect(mockSafe.currentTransaction.signatures.size).toBe(0);
    await result;
  }
);

it('rejects Safe content replaced before or during signing', async () => {
  const owner = mockSafe.currentTransaction;
  const pending = deferred();
  (keyringService.signTypedMessage as jest.Mock).mockReturnValueOnce(
    pending.promise
  );
  const result = run('personalSign', {
    isGnosis: true,
    data: [account.address, JSON.stringify(safeData)],
  });
  const signing = sign();
  while (!(keyringService.signTypedMessage as jest.Mock).mock.calls.length)
    await Promise.resolve();
  mockSafe.currentTransaction = createTarget();
  pending.resolve('signature-for-A');
  expect(await signing).toMatchObject({
    success: false,
    errorMsg: 'Safe signing data changed',
  });
  expect(mockSafe.safeInstance.request.postTransactions).not.toHaveBeenCalled();
  expect(owner.signatures.size).toBe(0);
  expect(mockSafe.currentTransaction.signatures.size).toBe(0);
  await resolveWaiting();
  await result;

  mockSafe.safeInstance.getTransactionHash.mockResolvedValue(
    '0x' + '00'.repeat(32)
  );
  const second = run('personalSign', {
    isGnosis: true,
    data: [account.address, JSON.stringify(safeData)],
  });
  expect(await sign()).toMatchObject({
    success: false,
    errorMsg: 'Safe signing data changed',
  });
  expect(keyringService.signTypedMessage).toHaveBeenCalledTimes(1);
  await resolveWaiting();
  await second;
});

it('joins a retry requested by two waiting pages without a second signature', async () => {
  const retry = deferred();
  (controller.personalSign as jest.Mock)
    .mockRejectedValueOnce(new Error('retry'))
    .mockReturnValueOnce(retry.promise);
  const result = run();
  await sign();
  const first = notificationService.signApproval(ref(), 1, { type: 'origin' });
  const second = notificationService.signApproval(ref(), 1, { type: 'origin' });
  expect(controller.personalSign).toHaveBeenCalledTimes(2);
  retry.resolve('second-attempt');
  expect(await first).toEqual({ success: true, data: 'second-attempt' });
  expect(await second).toEqual(await first);
  await resolveWaiting();
  await result;
});

it('direct callers get their own failure without broadcasting it', async () => {
  const publish = jest.fn();
  eventBus.addEventListener(EVENTS.broadcastToUI, publish);
  (controller.personalSign as jest.Mock).mockRejectedValue(
    new Error('direct failure')
  );
  await expect(
    run('personalSign', { uiRequestComponent: undefined })
  ).rejects.toThrow('direct failure');
  expect(publish).not.toHaveBeenCalled();
});
