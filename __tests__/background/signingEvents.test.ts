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

import notificationService from '@/background/service/notification';

import 'reflect-metadata';
jest.mock('background/service', () => ({
  notificationService: jest.requireActual('@/background/service/notification')
    .default,
  keyringService: {
    isUnlocked: () => true,
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
jest.mock('@/background/controller/provider/gnosisController', () => ({}));
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

const account = { address: '0xowner', type: 'Ledger', brandName: 'Ledger' };
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
const ready = (executionId = current().data.executionId) =>
  eventBus.emit(EVENTS.SIGN_WAITING_AMOUNTED, { executionId });
const finished = () =>
  new Promise<any>((resolve) => {
    const handler = (event: any) => {
      if (event.method !== EVENTS.SIGN_FINISHED) return;
      eventBus.removeEventListener(EVENTS.broadcastToUI, handler);
      resolve(event.params);
    };
    eventBus.addEventListener(EVENTS.broadcastToUI, handler);
  });
const resolveWaiting = () =>
  notificationService.resolveApprovalFor({ approval: ref(), data: 'done' });

beforeEach(() => {
  notificationService.rejectAllApprovals();
  notificationService.isLocked = false;
  eventBus.events = {};
  jest.clearAllMocks();
});

it('only its own mounted waiting page starts the signer and receives its result', async () => {
  (controller.personalSign as jest.Mock).mockResolvedValue('signature');
  const result = run();
  const executionId = current().data.executionId;
  ready('another-window');
  await Promise.resolve();
  expect(controller.personalSign).not.toHaveBeenCalled();
  const event = finished();
  ready();
  expect(await event).toEqual({
    executionId,
    success: true,
    data: 'signature',
  });
  expect(controller.personalSign).toHaveBeenCalledTimes(1);
  await resolveWaiting();
  await expect(result).resolves.toBe('done');
});

it('binds retry to the approval and previous execution, retaining cumulative fee updates', async () => {
  (controller.ethSendTransaction as jest.Mock).mockRejectedValue(
    new Error('underpriced')
  );
  let event = finished();
  const result = run('ethSendTransaction');
  ready();
  await event;
  const owner = ref();
  for (const [type, gasPrice, nonce] of [
    ['gasPrice', '0x82', '0x1'],
    ['gasPrice', '0xa9', '0x1'],
    ['nonce', '0xa9', '0x3'],
    [false, '0xa9', '0x3'],
  ] as const) {
    const old = current().data.executionId!;
    expect(
      notificationService.callCurrentRequestDeferFn(
        toApprovalRef('other', owner.component),
        old
      )
    ).toBeUndefined();
    expect(
      notificationService.callCurrentRequestDeferFn(
        toApprovalRef(owner.approvalId, 'SignTx'),
        old
      )
    ).toBeUndefined();
    const next = notificationService.callCurrentRequestDeferFn(owner, old, {
      type,
      nonce: '0x3',
    });
    expect(next).toBeTruthy();
    expect(next).not.toBe(old);
    expect(
      notificationService.callCurrentRequestDeferFn(owner, old)
    ).toBeUndefined();
    event = finished();
    ready();
    await event;
    expect(
      (controller.ethSendTransaction as jest.Mock).mock.calls.at(-1)[0]
        .approvalRes
    ).toMatchObject({ gasPrice, maxFeePerGas: gasPrice, nonce });
  }
  await resolveWaiting();
  await result;
});

it('cancelling before mount removes the readiness listener and cannot be revived by a later page', async () => {
  const result = run().catch((e) => e);
  const id = current().data.executionId;
  notificationService.rejectAllApprovals();
  await result;
  expect(eventBus.events[EVENTS.SIGN_WAITING_AMOUNTED]).toHaveLength(0);
  ready(id);
  await Promise.resolve();
  expect(controller.personalSign).not.toHaveBeenCalled();
});

it('Safe signing uses its selected signer and its own waiting event', async () => {
  const result = run('personalSign', {
    isGnosis: true,
    data: [account.address, JSON.stringify({ message: 'safe' })],
  });
  const event = finished();
  ready();
  expect((await event).data).toBe('safe-signature');
  expect(keyringService.getKeyringForAccount).toHaveBeenCalledWith(
    account.address,
    account.type
  );
  expect(controller.personalSign).not.toHaveBeenCalled();
  await resolveWaiting();
  await result;
});

it('direct callers get their own failure without broadcasting it to waiting pages', async () => {
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
