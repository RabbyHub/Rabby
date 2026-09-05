import { SigningFlowService } from '@/background/service/signingFlow';
import { asSigningFlowId, toSigningAttemptRef } from '@/utils/signingTypes';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';

const flow = (id = 'flow-a') => ({ flowId: asSigningFlowId(id) });

describe('SigningFlowService', () => {
  it('accepts only one matching completion and terminalizes before the caller broadcasts', async () => {
    const service = new SigningFlowService();
    const ref = service.createFlow({
      flowId: 'flow-a',
      origin: 'https://dapp.test',
      rpcRequestId: 'rpc-a',
    });
    const attempt = service.createAttempt(ref, { awaitUi: false })!;
    const runner = jest.fn().mockResolvedValue('0xresult');
    const owner = service.run(ref, attempt, runner);
    const result = await owner;

    expect(result).toBe('0xresult');
    expect(service.finishAttempt(attempt, { success: true }).accepted).toBe(
      false
    );
  });

  it('starts only one runner for an attempt', async () => {
    const service = new SigningFlowService();
    const ref = service.createFlow({
      flowId: 'flow-a',
      origin: 'https://dapp.test',
      rpcRequestId: 'rpc-a',
    });
    const attempt = service.createAttempt(ref, { awaitUi: false })!;
    const runner = jest.fn().mockResolvedValue('0xresult');

    const owner = service.run(ref, attempt, runner);
    await expect(service.run(ref, attempt, runner)).rejects.toMatchObject({
      code: 4001,
    });
    await expect(owner).resolves.toBe('0xresult');
    expect(runner).toHaveBeenCalledTimes(1);
  });

  it('runs an attempt that was started before its direct runner is registered', async () => {
    const service = new SigningFlowService();
    const context = service.startAttempt({
      account: { address: '0xaccount', type: 'privateKey', brandName: 'Rabby' },
      origin: 'https://a.test',
      rpcRequestId: 'a',
    })!;
    const owner = service.run(context.flow, context.attempt, async () => '0xresult');

    await expect(owner).resolves.toBe('0xresult');
    expect(service.getFlow(context.flow)).toBeUndefined();
  });

  it('does not leave the owner pending when a running attempt is superseded', async () => {
    const service = new SigningFlowService();
    const ref = service.createFlow({
      flowId: 'flow-a',
      origin: 'https://dapp.test',
      rpcRequestId: 'rpc-a',
    });
    const attempt = service.createAttempt(ref, { awaitUi: false })!;
    const runner = jest.fn().mockResolvedValue('0xresult');
    const owner = service.run(ref, attempt, runner);

    expect(service.createAttempt(ref)).toBeUndefined();
    await expect(owner).resolves.toBe('0xresult');
    expect(runner).toHaveBeenCalledTimes(1);
  });

  it('rejects a runner registered with an attempt from another flow', async () => {
    const service = new SigningFlowService();
    const flowA = service.createFlow({
      flowId: 'flow-a',
      origin: 'https://a.test',
      rpcRequestId: 'a',
    });
    const flowB = service.createFlow({
      flowId: 'flow-b',
      origin: 'https://b.test',
      rpcRequestId: 'b',
    });
    const attemptB = service.createAttempt(flowB, { awaitUi: false })!;
    const runner = jest.fn().mockResolvedValue('wrong-flow');

    await expect(service.run(flowA, attemptB, runner)).rejects.toMatchObject({
      code: 4001,
    });
    expect(runner).not.toHaveBeenCalled();
    expect(service.getFlow(flowA)?.status).toBe('awaiting-approval');
    expect(service.getFlow(flowB)?.status).toBe('created');
  });

  it('rejects mismatched readiness and superseded completion', async () => {
    const service = new SigningFlowService();
    const refA = service.createFlow({
      flowId: 'flow-a',
      origin: 'https://a.test',
      rpcRequestId: 'a',
    });
    const refB = service.createFlow({
      flowId: 'flow-b',
      origin: 'https://b.test',
      rpcRequestId: 'b',
    });
    const attemptA = service.createAttempt(refA)!;
    const attemptB = service.createAttempt(refB)!;
    expect(service.markUiReady(attemptA)).toBe(true);
    expect(service.markUiReady(attemptB)).toBe(true);
    expect(service.beginAttempt(attemptA)).toBe(true);
    expect(service.createAttempt(refA)).toBeDefined();
    expect(service.finishAttempt(attemptA, { success: true }).accepted).toBe(
      false
    );
    expect(service.beginAttempt(attemptB)).toBe(true);
  });

  it('requires the exact current attempt for retry and gives retry a new identity', async () => {
    const service = new SigningFlowService();
    const ref = service.createFlow({
      flowId: 'flow-a',
      origin: 'https://a.test',
      rpcRequestId: 'a',
    });
    const attempt = service.createAttempt(ref, { awaitUi: false })!;
    const runner = jest
      .fn()
      .mockRejectedValueOnce(new Error('retry'))
      .mockRejectedValueOnce(new Error('retry again'));
    const owner = service.run(ref, attempt, runner, {
      retryable: () => true,
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(service.getFlow(ref)?.status).toBe('awaiting-retry');
    expect(
      service.retrySigningAttempt({
        flow: ref,
        currentAttempt: toSigningAttemptRef('flow-other', 'attempt-a'),
      })
    ).toBeUndefined();
    const next = service.retrySigningAttempt({
      flow: ref,
      currentAttempt: attempt,
    });
    expect(next).toBeDefined();
    expect(next?.attemptId).not.toBe(attempt.attemptId);
    service.markUiReady(next!);
    await Promise.resolve();
    service.cancelFlow(ref);
    await expect(owner).rejects.toBeDefined();
  });

  it('cancels the owner before a late transport result can finish the attempt', async () => {
    const service = new SigningFlowService();
    const ref = service.createFlow({
      flowId: 'flow-a',
      origin: 'https://a.test',
      rpcRequestId: 'a',
    });
    const attempt = service.createAttempt(ref, { awaitUi: false })!;
    let resolveTransport!: (value: string) => void;
    const transport = new Promise<string>((resolve) => {
      resolveTransport = resolve;
    });
    const owner = service.run(ref, attempt, () => transport);
    service.cancelFlow(ref);
    await expect(owner).rejects.toBeDefined();
    resolveTransport('late');
    await Promise.resolve();
    expect(service.finishAttempt(attempt, { success: true }).accepted).toBe(
      false
    );
  });

  it('keeps cleanup when a completion listener throws', () => {
    const service = new SigningFlowService();
    const ref = service.createFlow({
      flowId: 'flow-a',
      account: { address: '0xaccount', type: 'privateKey', brandName: 'Rabby' },
      origin: 'https://a.test',
      rpcRequestId: 'a',
    });
    const attempt = service.createAttempt(ref, { awaitUi: false })!;
    service.beginAttempt(attempt);
    const listener = () => {
      throw new Error('listener failed');
    };
    eventBus.addEventListener(EVENTS.broadcastToUI, listener);

    try {
      expect(
        service.finishAttemptWithEvent(
          {
            flow: ref,
            attempt,
            account: {
              address: '0xaccount',
              type: 'privateKey',
              brandName: 'Rabby',
            },
            origin: 'https://a.test',
            rpcRequestId: 'a',
          },
          { success: true, data: 'signed' }
        )
      ).toEqual({ accepted: true, status: 'succeeded' });
      expect(service.getFlow(ref)).toBeUndefined();
    } finally {
      eventBus.removeEventListener(EVENTS.broadcastToUI, listener);
    }
  });

  it('links a different-account child attempt and removes it on cancellation', () => {
    const service = new SigningFlowService();
    const parent = service.createFlow({
      flowId: 'parent-flow',
      account: { address: '0xparent', type: 'cobo', brandName: 'Cobo' },
      origin: 'https://dapp.test',
      rpcRequestId: 'parent-rpc',
    });
    const parentAttempt = service.createAttempt(parent)!;
    const parentContext = {
      flow: parent,
      attempt: parentAttempt,
      account: { address: '0xparent', type: 'cobo', brandName: 'Cobo' },
      origin: 'https://dapp.test',
      rpcRequestId: 'parent-rpc',
    };
    const child = service.createChildAttempt({
      parent: parentContext,
      account: { address: '0xowner', type: 'privateKey', brandName: 'Rabby' },
      origin: 'https://dapp.test',
    });

    expect(child?.parentFlow).toEqual(parent);
    expect(service.isCurrentContext(child!)).toBe(true);
    service.cancelFlow(parent);
    expect(service.getFlow(child!.flow)).toBeUndefined();
    expect(service.getFlow(parent)).toBeUndefined();
  });
});
