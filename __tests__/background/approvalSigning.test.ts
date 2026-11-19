import type { Approval } from '@/background/service/notification';
import {
  assertApprovalSigningBinding,
  signForWaitingApproval,
  waitForApprovalSigning,
} from '@/background/controller/walletUtils/approvalSigning';
import { waitSignComponentAmounted } from '@/utils/signEvent';
import eventBus from '@/eventBus';

jest.mock('@/constant', () => ({
  EVENTS: { SIGN_WAITING_AMOUNTED: 'SIGN_WAITING_AMOUNTED' },
}));

const address = '0x123';
const typedData = { domain: { chainId: 1 }, message: { amount: '100' } };
const request = {
  type: 'HD Key Tree',
  from: address,
  data: typedData,
  options: {
    sourceApprovalId: 'reviewed-request',
    approvalComponent: 'PrivatekeyWaiting' as const,
  },
};
const makeApproval = (): Approval => ({
  id: 'waiting-request',
  taskId: null,
  winProps: {},
  data: {
    account: { address, type: request.type, brandName: 'Seed phrase' },
    approvalComponent: 'PrivatekeyWaiting',
    params: {
      sourceApprovalId: request.options.sourceApprovalId,
      isGnosis: true,
      type: request.type,
      address,
      data: [address, JSON.stringify(typedData)],
    },
  },
});

describe('bound deferred Safe signing', () => {
  let currentApproval: Approval | null;

  beforeEach(() => {
    currentApproval = makeApproval();
    eventBus.removeAllEventListeners('SIGN_WAITING_AMOUNTED');
  });

  const waitForApproval = (sign: () => void) =>
    waitForApprovalSigning({
      ...request,
      getApproval: () => currentApproval,
      waitForUI: waitSignComponentAmounted,
    }).then(sign);

  test('signs only after the matching waiting approval mounts', async () => {
    const sign = jest.fn();
    const pending = waitForApproval(sign);
    expect(sign).not.toHaveBeenCalled();
    eventBus.emit('SIGN_WAITING_AMOUNTED');
    await pending;
    expect(sign).toHaveBeenCalledTimes(1);
  });

  test.each([
    [
      'source id',
      (approval: Approval) => {
        approval.data.params.sourceApprovalId = 'other-source';
      },
    ],
    [
      'component',
      (approval: Approval) => {
        approval.data.approvalComponent = 'LedgerHardwareWaiting';
      },
    ],
    [
      'Safe marker',
      (approval: Approval) => {
        approval.data.params.isGnosis = false;
      },
    ],
    [
      'signer address',
      (approval: Approval) => {
        approval.data.params.address = '0x456';
      },
    ],
    [
      'payload signer',
      (approval: Approval) => {
        approval.data.params.data[0] = '0x456';
      },
    ],
    [
      'account',
      (approval: Approval) => {
        approval.data.account.address = '0x456';
      },
    ],
    [
      'account type',
      (approval: Approval) => {
        approval.data.account.type = 'Other type';
      },
    ],
    [
      'typed payload',
      (approval: Approval) => {
        approval.data.params.data[1] = JSON.stringify({
          ...typedData,
          message: { amount: '999' },
        });
      },
    ],
  ] as const)(
    'rejects mismatched %s after a global mount event',
    async (_name, change) => {
      const sign = jest.fn();
      const pending = waitForApproval(sign);
      change(currentApproval!);
      eventBus.emit('SIGN_WAITING_AMOUNTED');
      await expect(pending).rejects.toMatchObject({ code: 4001 });
      expect(sign).not.toHaveBeenCalled();
    }
  );

  test('an old listener cannot sign after the pending approval is cleared', async () => {
    const sign = jest.fn();
    const pending = waitForApproval(sign);
    currentApproval = null;
    eventBus.emit('SIGN_WAITING_AMOUNTED');
    await expect(pending).rejects.toMatchObject({ code: 4001 });
    expect(sign).not.toHaveBeenCalled();
  });

  test('failed source consent cannot be supplied by a later unrelated waiting approval', async () => {
    const sign = jest.fn();
    const pending = waitForApproval(sign);
    currentApproval = makeApproval();
    currentApproval.data.params.sourceApprovalId = 'next-request';
    eventBus.emit('SIGN_WAITING_AMOUNTED');
    await expect(pending).rejects.toMatchObject({ code: 4001 });
    expect(sign).not.toHaveBeenCalled();
  });

  test('rechecking after an awaited keyring lookup rejects a session change', async () => {
    let finishKeyringLookup!: () => void;
    const sign = jest.fn();
    const keyringLookup = new Promise<void>((resolve) => {
      finishKeyringLookup = resolve;
    });
    const pending = waitForApprovalSigning({
      ...request,
      getApproval: () => currentApproval,
      waitForUI: waitSignComponentAmounted,
    }).then(async () => {
      await keyringLookup;
      assertApprovalSigningBinding(currentApproval, request);
      sign();
    });
    eventBus.emit('SIGN_WAITING_AMOUNTED');
    await Promise.resolve();
    await Promise.resolve();
    currentApproval = null;
    finishKeyringLookup();
    await expect(pending).rejects.toMatchObject({ code: 4001 });
    expect(sign).not.toHaveBeenCalled();
  });

  describe('reporting a failed attempt to the waiting approval', () => {
    const deviceRejection = new Error('Ledger: Condition not satisfied 0x6985');
    const signWithUI = (
      sign: () => Promise<string>,
      onFailed: (error: unknown) => void
    ) => {
      const pending = signForWaitingApproval({
        ...request,
        getApproval: () => currentApproval,
        waitForUI: waitSignComponentAmounted,
        sign,
        onFailed,
      });
      eventBus.emit('SIGN_WAITING_AMOUNTED');
      return pending;
    };

    test('reports a signature rejected on the device', async () => {
      const onFailed = jest.fn();
      await expect(
        signWithUI(() => Promise.reject(deviceRejection), onFailed)
      ).rejects.toBe(deviceRejection);
      expect(onFailed).toHaveBeenCalledTimes(1);
      expect(onFailed).toHaveBeenCalledWith(deviceRejection);
    });

    test('does not report a successful signature as failed', async () => {
      const onFailed = jest.fn();
      await expect(
        signWithUI(() => Promise.resolve('0xsig'), onFailed)
      ).resolves.toBe('0xsig');
      expect(onFailed).not.toHaveBeenCalled();
    });

    test('a stale attempt cannot fail the approval that replaced it', async () => {
      const onFailed = jest.fn();
      await expect(
        signWithUI(() => {
          currentApproval = makeApproval();
          currentApproval.data.params.sourceApprovalId = 'next-request';
          return Promise.reject(deviceRejection);
        }, onFailed)
      ).rejects.toBe(deviceRejection);
      expect(onFailed).not.toHaveBeenCalled();
    });

    test('an attempt that never started is not reported', async () => {
      const sign = jest.fn();
      const onFailed = jest.fn();
      currentApproval = null;
      await expect(signWithUI(sign, onFailed)).rejects.toMatchObject({
        code: 4001,
      });
      expect(sign).not.toHaveBeenCalled();
      expect(onFailed).not.toHaveBeenCalled();
    });
  });

  test('fails closed for incomplete binding, while preserving legacy callers', () => {
    expect(() =>
      assertApprovalSigningBinding(currentApproval, {
        ...request,
        options: { sourceApprovalId: request.options.sourceApprovalId },
      })
    ).toThrow();
    expect(() =>
      assertApprovalSigningBinding(null, { ...request, options: undefined })
    ).not.toThrow();
  });
});
