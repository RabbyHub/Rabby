import 'reflect-metadata';

// Perps invite (the only caller of sendRequest's approvalRequestId/onApproval
// option) must never let its inline SignTypedData request queue behind
// another pending approval or carry consent across an unlock. These two
// guards in rpcFlow.ts are what enforce that; this test exercises the real
// flow (not a copy of its logic) against a minimal stand-in controller.

const state = {
  isUnlocked: true,
  currentApproval: null as { id: string } | null,
  hasPermission: true,
};

const mockKeyringService = {
  keyrings: [] as any[],
  getKeyringForAccount: jest.fn(),
  memStore: { getState: () => ({ isUnlocked: state.isUnlocked }) },
  isUnlocked: () => state.isUnlocked,
};
const mockNotificationService = {
  getApproval: jest.fn(() => state.currentApproval),
  requestApproval: jest.fn(async (..._args: any[]) => ({} as any)),
  setCurrentRequestDeferFn: jest.fn(),
  clearCurrentRequestDeferFn: jest.fn(),
  unLock: jest.fn(),
};
const mockPermissionService = {
  hasPermission: jest.fn(() => state.hasPermission),
  getConnectedSite: jest.fn(() => undefined),
  addConnectedSiteV2: jest.fn(),
  updateConnectSite: jest.fn(),
  touchConnectedSite: jest.fn(),
};
const mockPreferenceService = {
  getPreference: jest.fn(),
  setCurrentAccount: jest.fn(),
  getCurrentAccount: jest.fn(),
};

jest.mock('background/service', () => ({
  keyringService: mockKeyringService,
  notificationService: mockNotificationService,
  permissionService: mockPermissionService,
  preferenceService: mockPreferenceService,
}));

// Stand-ins for the two signing methods exercise the real rpcFlow middleware
// without importing the full provider controller and keyring dependencies.
const ethSignTypedDataV4 = jest.fn(
  async (_request?: any) => 'signature-result'
);
const personalSign = jest.fn(async (_req: any) => 'personal-signature');
const fakeController = { ethSignTypedDataV4, personalSign };
Reflect.defineMetadata(
  'APPROVAL',
  ['SignText', () => false],
  fakeController,
  'personalSign'
);
Reflect.defineMetadata(
  'APPROVAL',
  ['SignTypedData', () => false],
  fakeController,
  'ethSignTypedDataV4'
);
jest.mock('@/background/controller/provider/controller', () => ({
  __esModule: true,
  default: fakeController,
}));

jest.mock('@/background/controller/provider/gnosisController', () => ({
  gnosisController: {},
}));
jest.mock('@/utils/transaction', () => ({
  buildSignTx: jest.fn(),
  normalizeTxParams: jest.fn((tx) => tx),
  shouldUpdateNonce: jest.fn(() => false),
}));
jest.mock('@/background/service/signTxPreparation', () => ({
  startSignTxPreparation: jest.fn(),
  getSignTxPreparationGas: jest.fn(),
  getSignTxPreparation: jest.fn(),
  cancelSignTxPreparation: jest.fn(),
  cancelAllSignTxPreparations: jest.fn(),
}));
jest.mock('@sentry/browser', () => ({ captureException: jest.fn() }));
jest.mock('consts', () => ({
  EVENTS: {
    broadcastToUI: 'broadcastToUI',
    SIGN_FINISHED: 'SIGN_FINISHED',
    SIGN_WAITING_AMOUNTED: 'SIGN_WAITING_AMOUNTED',
  },
  INTERNAL_REQUEST_ORIGIN: 'https://rabby.io',
  KEYRING_CLASS: {
    GnosisKeyring: 'Gnosis Safe',
    HARDWARE: { ONEKEY: 'Onekey Hardware' },
  },
  KEYRING_TYPE: {
    GnosisKeyring: 'GnosisKeyring',
    CoboArgusKeyring: 'CoboArgusKeyring',
  },
  SUPPORT_1559_KEYRING_TYPE: [],
}));

import rpcFlow from '@/background/controller/provider/rpcFlow';
import { markUserCancelledSigningError } from '@/background/utils/signingCancellation';
import eventBus from '@/eventBus';
import { hex2Text } from '@/utils/signText';
import { captureException } from '@sentry/browser';

const baseRequest = () => ({
  data: { method: 'eth_signTypedData_v4', params: [] },
  session: {
    origin: 'https://app.hyperliquid.xyz',
    name: 'Hyperliquid',
    icon: '',
  },
  account: { address: '0xaccount', type: 'SimpleKeyring' },
});

test.each([true, false])(
  'reports only unclassified signing rejections (confirmed cancel: %s)',
  async (userCancelled) => {
    jest.clearAllMocks();
    const error = new Error(
      'The transaction signing request is no longer active.'
    );
    if (userCancelled) markUserCancelledSigningError(error);
    ethSignTypedDataV4.mockRejectedValueOnce(error);
    const logError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const onFinished = jest.fn();
    eventBus.addEventListener('broadcastToUI', onFinished);
    try {
      await expect(rpcFlow(baseRequest() as any)).rejects.toBe(error);
      if (userCancelled) expect(captureException).not.toHaveBeenCalled();
      else expect(captureException).toHaveBeenCalledWith(error);
      expect(onFinished).toHaveBeenCalledWith({
        method: 'SIGN_FINISHED',
        params: expect.objectContaining({
          success: false,
          errorMsg: error.message,
        }),
      });
    } finally {
      eventBus.removeEventListener('broadcastToUI', onFinished);
      logError.mockRestore();
    }
  }
);

describe('rpcFlow personal-sign review bytes', () => {
  const from = `0x${'11'.repeat(20)}`;

  beforeEach(() => {
    jest.clearAllMocks();
    state.isUnlocked = true;
    state.currentApproval = null;
    state.hasPermission = true;
    mockNotificationService.requestApproval.mockResolvedValue({});
  });

  test.each([false, true])(
    'normalizes odd hex before review and signing (reversed parameters: %s)',
    async (reversed) => {
      const params = reversed ? [from, '0x415'] : ['0x415', from];
      await expect(
        rpcFlow({
          ...baseRequest(),
          data: { method: 'personal_sign', params },
        } as any)
      ).resolves.toBe('personal-signature');

      const reviewed =
        mockNotificationService.requestApproval.mock.calls[0][0].params.data;
      const signed = personalSign.mock.calls[0][0].data.params;
      expect(reviewed).toEqual(['0x0415', from]);
      expect(signed).toEqual(reviewed);
      expect(hex2Text(reviewed[0])).toBe('\x04\x15');
    }
  );

  test.each(['Sign in\nNonce: 123', '0x4142', '0x'])(
    'preserves normal request %s',
    async (message) => {
      await expect(
        rpcFlow({
          ...baseRequest(),
          data: { method: 'personal_sign', params: [message, from] },
        } as any)
      ).resolves.toBe('personal-signature');
      expect(personalSign.mock.calls[0][0].data.params).toEqual([
        message,
        from,
      ]);
    }
  );
});

describe('rpcFlow: inline (onApproval) requests fail closed instead of queuing or crossing a session boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    state.isUnlocked = true;
    state.currentApproval = null;
    state.hasPermission = true;
  });

  test('rejects immediately when the wallet is locked, never queues behind an Unlock approval', async () => {
    state.isUnlocked = false;
    await expect(
      rpcFlow({ ...baseRequest(), onApproval: jest.fn() } as any)
    ).rejects.toMatchObject({ message: 'Wallet is locked.' });
    expect(mockNotificationService.requestApproval).not.toHaveBeenCalled();
  });

  test('a normal (non-onApproval) dApp request still queues behind Unlock as usual when locked', async () => {
    state.isUnlocked = false;
    mockNotificationService.requestApproval.mockImplementationOnce(async () => {
      state.isUnlocked = true;
      return {};
    });
    await rpcFlow(baseRequest() as any).catch(() => undefined);
    expect(mockNotificationService.requestApproval).toHaveBeenCalledWith(
      expect.objectContaining({ approvalComponent: 'Unlock' }),
      expect.anything()
    );
  });

  test('rejects immediately when another approval is already current, never silently queues behind it', async () => {
    state.currentApproval = { id: 'someone-elses-approval' };
    await expect(
      rpcFlow({ ...baseRequest(), onApproval: jest.fn() } as any)
    ).rejects.toMatchObject({
      message: 'please request after current approval resolve',
    });
    expect(mockNotificationService.requestApproval).not.toHaveBeenCalled();
  });

  test('creates the approval and reports its ref via onApproval when nothing is queued and unlocked', async () => {
    const onApproval = jest.fn();
    mockNotificationService.requestApproval.mockImplementationOnce(
      async (_data, _winProps, options) => {
        const approval = { id: 'new-approval', component: 'SignTypedData' };
        options?.onCurrent?.(approval);
        return { signature: 'ignored' };
      }
    );
    await rpcFlow({ ...baseRequest(), onApproval } as any).catch(
      () => undefined
    );
    expect(onApproval).toHaveBeenCalledWith({
      id: 'new-approval',
      component: 'SignTypedData',
    });
  });

  test('a normal (non-onApproval) dApp request is unaffected by another pending approval — no new guard applies to it', async () => {
    state.currentApproval = { id: 'someone-elses-approval' };
    mockNotificationService.requestApproval.mockResolvedValueOnce({});
    await rpcFlow(baseRequest() as any).catch(() => undefined);
    expect(mockNotificationService.requestApproval).toHaveBeenCalled();
  });
});

describe('rpcFlow method dispatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    state.isUnlocked = true;
    state.currentApproval = null;
    state.hasPermission = true;
  });

  test.each([
    'constructor',
    'toString',
    'valueOf',
    'hasOwnProperty',
    '__proto__',
  ])('rejects inherited property %s as method not found', async (method) => {
    const request = {
      ...baseRequest(),
      data: { method, params: [] },
    };

    await expect(rpcFlow(request as any)).rejects.toMatchObject({
      code: -32601,
    });
    expect(mockNotificationService.requestApproval).not.toHaveBeenCalled();
    expect(ethSignTypedDataV4).not.toHaveBeenCalled();
  });
});

describe('rpcFlow signing operation context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(eventBus, 'emit');
    state.isUnlocked = true;
    state.currentApproval = null;
    state.hasPermission = true;
  });

  afterEach(() => jest.restoreAllMocks());

  const getEmittedOperation = () => {
    const call = (eventBus.emit as jest.Mock).mock.calls.find(
      ([, payload]) => payload?.params?.signingOperation
    );
    return call?.[1]?.params?.signingOperation;
  };

  test('binds the completion event to the request origin, account and payload', async () => {
    mockNotificationService.requestApproval.mockResolvedValueOnce({});

    await rpcFlow(baseRequest() as any);

    expect(getEmittedOperation()).toMatchObject({
      origin: 'https://app.hyperliquid.xyz',
      accountAddress: '0xaccount',
      accountType: 'SimpleKeyring',
      id: expect.any(String),
      payloadHash: expect.stringMatching(/^0x[0-9a-f]{64}$/),
    });
  });

  test('preserves the inner Safe signing operation instead of replacing it with the outer dApp request', async () => {
    const safeOperation = {
      id: 'safe-operation',
      origin: 'https://safe.example',
      accountAddress: '0xowner',
      accountType: 'HD Key Tree',
      payloadHash: `0x${'ab'.repeat(32)}`,
    };
    mockNotificationService.requestApproval.mockResolvedValueOnce({
      signingOperation: safeOperation,
    });

    await rpcFlow(baseRequest() as any);

    expect(getEmittedOperation()).toBe(safeOperation);
  });

  test('passes the same operation to the waiting UI and completion event without changing the controller approval result', async () => {
    const approvalRes = {
      uiRequestComponent: 'PrivatekeyWaiting',
      $account: baseRequest().account,
    };
    mockNotificationService.requestApproval
      .mockResolvedValueOnce(approvalRes)
      .mockImplementationOnce(async () => {
        eventBus.emit('SIGN_WAITING_AMOUNTED');
        return 'waiting-result';
      });

    await expect(rpcFlow(baseRequest() as any)).resolves.toBe('waiting-result');

    const waitingApproval =
      mockNotificationService.requestApproval.mock.calls[1][0];
    expect(waitingApproval.params.signingOperation).toEqual(
      getEmittedOperation()
    );
    expect(waitingApproval.params.signingOperation).toBeDefined();
    expect(ethSignTypedDataV4.mock.calls[0][0].approvalRes).toBe(approvalRes);
  });
});

describe('OneKey waiting approval', () => {
  const oneKey = { type: 'Onekey Hardware', address: '0xaccount' };
  const cancel = jest.fn(async () => undefined);

  function begin() {
    let rejectWaiting!: (error: Error) => void;
    let ready!: () => void;
    const mounted = new Promise<void>((resolve) => {
      ready = resolve;
    });
    mockNotificationService.requestApproval
      .mockResolvedValueOnce({
        ...oneKey,
        $account: oneKey,
        uiRequestComponent: 'CommonWaiting',
      })
      .mockImplementationOnce(
        (_, __, options) =>
          new Promise((_, reject) => {
            options.onCurrent({
              id: 'onekey-waiting',
              component: 'CommonWaiting',
            });
            rejectWaiting = reject;
            ready();
          })
      );
    const result = rpcFlow({ ...baseRequest(), account: oneKey } as any);
    return {
      result,
      mounted,
      dismiss: () => rejectWaiting(new Error('User cancelled')),
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    state.isUnlocked = true;
    state.currentApproval = null;
    state.hasPermission = true;
    const keyring = { cancel };
    mockKeyringService.keyrings = [keyring];
    mockKeyringService.getKeyringForAccount.mockResolvedValue(keyring);
  });

  it.each([
    undefined,
    { ...oneKey, $account: oneKey, uiRequestComponent: 'PrivatekeyWaiting' },
    {
      ...oneKey,
      address: '0xother',
      $account: oneKey,
      uiRequestComponent: 'CommonWaiting',
    },
    {
      ...oneKey,
      $account: { ...oneKey, type: 'Watch Address' },
      uiRequestComponent: 'CommonWaiting',
    },
  ])(
    'fails closed for missing or mismatched OneKey approval results',
    async (answer) => {
      mockNotificationService.requestApproval.mockResolvedValueOnce(answer);
      await expect(
        rpcFlow({ ...baseRequest(), account: oneKey } as any)
      ).rejects.toMatchObject({ code: 4001 });
      expect(ethSignTypedDataV4).not.toHaveBeenCalled();
      expect(mockNotificationService.requestApproval).toHaveBeenCalledTimes(1);
    }
  );

  it('withdraws the pending mount listener when the waiting page closes before mounting', async () => {
    const request = begin();
    await request.mounted;
    request.dismiss();
    await expect(request.result).rejects.toThrow('User cancelled');
    expect(eventBus.events.SIGN_WAITING_AMOUNTED).toHaveLength(0);
    eventBus.emit('SIGN_WAITING_AMOUNTED');
    expect(ethSignTypedDataV4).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
    expect(
      mockNotificationService.clearCurrentRequestDeferFn
    ).toHaveBeenCalledTimes(1);
  });

  it('cancels an active device call and ignores a late success', async () => {
    let finish!: (signature: string) => void;
    ethSignTypedDataV4.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const finished = jest.fn();
    eventBus.addEventListener('broadcastToUI', finished);
    try {
      const request = begin();
      await request.mounted;
      eventBus.emit('SIGN_WAITING_AMOUNTED', 'another-approval');
      await Promise.resolve();
      expect(ethSignTypedDataV4).not.toHaveBeenCalled();
      eventBus.emit('SIGN_WAITING_AMOUNTED', 'onekey-waiting');
      await Promise.resolve();
      expect(ethSignTypedDataV4).toHaveBeenCalledTimes(1);
      request.dismiss();
      await expect(request.result).rejects.toThrow('User cancelled');
      expect(cancel).toHaveBeenCalledTimes(1);
      finish('discarded');
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(finished).not.toHaveBeenCalled();
    } finally {
      eventBus.removeEventListener('broadcastToUI', finished);
    }
  });

  it('sends a device failure back to the waiting approval that started signing', async () => {
    const failure = Object.assign(new Error('Device disconnected'), {
      method: 'hardware-rejected',
    });
    ethSignTypedDataV4.mockRejectedValueOnce(failure);
    const received = new Promise((resolve) =>
      eventBus.once('broadcastToUI', resolve)
    );
    const request = begin();
    await request.mounted;
    eventBus.emit('SIGN_WAITING_AMOUNTED', 'onekey-waiting');
    await expect(received).resolves.toEqual({
      method: 'SIGN_FINISHED',
      params: {
        approvalId: 'onekey-waiting',
        signingOperation:
          mockNotificationService.requestApproval.mock.calls[1][0].params
            .signingOperation,
        success: false,
        errorMsg: 'Device disconnected',
      },
    });
    request.dismiss();
    await expect(request.result).rejects.toThrow('User cancelled');
  });
});
