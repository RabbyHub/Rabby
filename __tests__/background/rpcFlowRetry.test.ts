import 'reflect-metadata';

jest.mock('background/service', () => ({
  signingFlowService: jest.requireActual('@/background/service/signingFlow')
    .signingFlowService,
  notificationService: {
    requestApproval: jest.fn(),
    setStatsData: jest.fn(),
    getStatsData: jest.fn(),
    unLock: jest.fn(),
  },
}));
// Exercise the final signing middleware with an already approved request.
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
  default: {
    personalSign: jest.fn(),
    ethSignTypedDataV4: jest.fn(),
    ethSendTransaction: jest.fn(),
  },
}));
jest.mock('@/background/controller/provider/gnosisController', () => ({}));
jest.mock('@/background/service/signTxPreparation', () => ({}));
jest.mock('@/utils/transaction', () => ({}));
jest.mock('@/utils', () => ({}));
jest.mock('@/utils/ga4', () => ({}));
jest.mock('@/stats', () => ({ __esModule: true, default: {} }));
jest.mock('@/background/utils/errorTxRetry', () => ({
  bgRetryTxMethods: {
    getRetryTxType: jest.fn(),
    getRetryTxRecommendNonce: jest.fn(),
  },
}));

import rpcFlow from '@/background/controller/provider/rpcFlow';
import controller from '@/background/controller/provider/controller';
import { notificationService, signingFlowService } from 'background/service';
import { bgRetryTxMethods } from '@/background/utils/errorTxRetry';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import { toApprovalRef } from '@/utils/signingTypes';

const finished = () =>
  new Promise<any>((resolve) => {
    const handler = (event: any) => {
      if (event.method !== EVENTS.SIGN_FINISHED) return;
      eventBus.removeEventListener(EVENTS.broadcastToUI, handler);
      resolve(event.params);
    };
    eventBus.addEventListener(EVENTS.broadcastToUI, handler);
  });

const setup = (approvalType: string, method: string, waiting = true) => {
  Reflect.defineMetadata('APPROVAL', [approvalType], controller, method);
  const account = { address: '0xowner', type: 'Ledger', brandName: 'Ledger' };
  const flow = signingFlowService.createFlow({
    account,
    origin: 'dapp',
    rpcRequestId: method,
  });
  const attempt = signingFlowService.createAttempt(flow)!;
  const approval = toApprovalRef('waiting', 'LedgerHardwareWaiting');
  signingFlowService.attachApproval(flow, approval);
  signingFlowService.bindAttemptApproval(attempt, approval);
  let resolveApproval!: (result: unknown) => void;
  (notificationService.requestApproval as jest.Mock).mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveApproval = resolve;
      })
  );
  const run = () =>
    rpcFlow({
      signingFlow: flow,
      mapMethod: method,
      approvalRes: {
        ...(waiting ? { uiRequestComponent: 'LedgerHardwareWaiting' } : {}),
        gasPrice: '0x64',
        maxFeePerGas: '0x64',
        nonce: '0x1',
      },
      request: { account, session: { origin: 'dapp' } },
    } as any);
  return {
    flow,
    attempt,
    run,
    resolve: (result: unknown) => resolveApproval(result),
  };
};

afterEach(() => {
  signingFlowService.cancelAll();
  jest.clearAllMocks();
});

it.each([
  ['SignText', 'personalSign'],
  ['SignTypedData', 'ethSignTypedDataV4'],
])(
  'retries %s after a transport failure and rejects stale retries',
  async (type, method) => {
    const runner = controller[method] as jest.Mock;
    runner
      .mockRejectedValueOnce(new Error('device locked'))
      .mockResolvedValueOnce('signature');
    const ctx = setup(type, method);
    const failed = finished();
    const result = ctx.run();
    signingFlowService.markUiReady(ctx.attempt);
    expect((await failed).success).toBe(false);
    const next = signingFlowService.retrySigningAttempt({
      flow: ctx.flow,
      currentAttempt: ctx.attempt,
    });
    expect(next).toBeDefined();
    expect(
      signingFlowService.retrySigningAttempt({
        flow: ctx.flow,
        currentAttempt: ctx.attempt,
      })
    ).toBeUndefined();
    const success = finished();
    signingFlowService.markUiReady(next!);
    expect((await success).data).toBe('signature');
    ctx.resolve('signature');
    await expect(result).resolves.toBe('signature');
  }
);

it('retains cumulative gas and nonce adjustments, including a plain retry', async () => {
  const runner = controller.ethSendTransaction as jest.Mock;
  runner.mockRejectedValue(new Error('underpriced'));
  const ctx = setup('SignTx', 'ethSendTransaction');
  let event = finished();
  const result = ctx.run();
  signingFlowService.markUiReady(ctx.attempt);
  await event;
  let current = ctx.attempt;
  for (const [retryType, isRetry, gasPrice, nonce] of [
    ['gasPrice', true, '0x82', '0x1'],
    ['gasPrice', true, '0xa9', '0x1'],
    ['nonce', true, '0xa9', '0x3'],
    [false, false, '0xa9', '0x3'],
  ] as const) {
    (bgRetryTxMethods.getRetryTxType as jest.Mock).mockReturnValue(retryType);
    (bgRetryTxMethods.getRetryTxRecommendNonce as jest.Mock).mockReturnValue(
      '0x3'
    );
    current = signingFlowService.retrySigningAttempt({
      flow: ctx.flow,
      currentAttempt: current,
      retryOptions: { isRetry },
    })!;
    event = finished();
    signingFlowService.markUiReady(current);
    await event;
    expect(
      runner.mock.calls[runner.mock.calls.length - 1][0].approvalRes
    ).toMatchObject({ gasPrice, maxFeePerGas: gasPrice, nonce });
  }
  ctx.resolve('done');
  await result;
});

it('rejects directly when no waiting UI can offer a retry', async () => {
  (controller.personalSign as jest.Mock).mockRejectedValueOnce(
    new Error('sign failed')
  );
  const ctx = setup('SignText', 'personalSign', false);
  await expect(ctx.run()).rejects.toThrow('sign failed');
});
