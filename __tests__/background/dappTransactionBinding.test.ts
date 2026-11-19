import 'reflect-metadata';

const accountA = {
  address: '0x1111111111111111111111111111111111111111',
  type: 'Simple Key Pair',
  brandName: 'A',
};
const accountB = {
  address: '0x2222222222222222222222222222222222222222',
  type: 'Simple Key Pair',
  brandName: 'B',
};
const dappOrigin = 'https://dapp.example';
const internalOrigin = 'chrome-extension://rabby';
const stopAtApproval = new Error('stop at approval');
const stopAtSigning = new Error('stop at signing');

const mockNotificationService = {
  requestApproval: jest.fn(
    async (..._args: any[]): Promise<any> => {
      throw stopAtApproval;
    }
  ),
  unLock: jest.fn(),
  getApproval: jest.fn(() => null),
  setCurrentRequestDeferFn: jest.fn(),
};
const mockKeyringService = {
  hasVault: jest.fn(() => true),
  memStore: { getState: () => ({ isUnlocked: true }) },
  isUnlocked: jest.fn(() => true),
  getKeyringForAccount: jest.fn(async () => ({})),
  signPersonalMessage: jest.fn(async () => {
    throw new Error('Safe messages must return the approved signature');
  }),
  signTypedMessage: jest.fn(async () => {
    throw new Error('Safe messages must return the approved signature');
  }),
  signTransaction: jest.fn(async () => {
    throw stopAtSigning;
  }),
};
const mockPreferenceService = {
  getPreference: jest.fn((key: string): boolean | undefined =>
    key === 'isEnabledDappAccount' ? true : undefined
  ),
  getCurrentAccount: jest.fn(() => accountB),
  setPreferencePartials: jest.fn(),
};
const connectedSite = {
  isConnected: true,
  account: accountA,
  chain: 'BASE',
};
const mockPermissionService = {
  getConnectedSite: jest.fn((origin: string) =>
    origin === dappOrigin ? connectedSite : undefined
  ),
  hasPermission: jest.fn(() => true),
  isInternalOrigin: jest.fn((origin: string) => origin === internalOrigin),
  updateConnectSite: jest.fn(),
  touchConnectedSite: jest.fn(),
};

jest.mock('background/service', () => ({
  keyringService: mockKeyringService,
  preferenceService: mockPreferenceService,
  permissionService: mockPermissionService,
  notificationService: mockNotificationService,
  sessionService: { deleteSessionsByTabId: jest.fn() },
  transactionHistoryService: {
    getSigningTx: jest.fn(() => ({ rawTx: {} })),
  },
  RPCService: { probeBestRPC: jest.fn() },
  i18n: { t: (key: string) => key },
}));
jest.mock('background/webapi', () => ({ tab: { on: jest.fn() } }));
jest.mock('@/background/controller/provider/internalMethod', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('@/background/controller/provider/gnosisController', () => ({
  gnosisController: {},
}));
jest.mock('@/background/service/signTxPreparation', () => ({
  startSignTxPreparation: jest.fn(),
  cancelSignTxPreparation: jest.fn(),
}));
jest.mock('@/background/service/blockedAddress', () => ({
  getTxAddressesToCheck: jest.fn(() => []),
  hasBlockedAddress: jest.fn(async () => false),
}));
jest.mock('@/constant', () => ({
  INTERNAL_REQUEST_ORIGIN: internalOrigin,
  INTERNAL_REQUEST_SESSION: {
    name: 'Rabby',
    origin: internalOrigin,
    icon: '',
  },
  KEYRING_TYPE: {
    SimpleKeyring: 'Simple Key Pair',
    HdKeyring: 'HD Key Tree',
    GnosisKeyring: 'Gnosis',
    CoboArgusKeyring: 'Cobo',
  },
  KEYRING_CLASS: { GnosisKeyring: 'Gnosis' },
  SUPPORT_1559_KEYRING_TYPE: [],
  SAFE_RPC_METHODS: [],
  CHAINS_ENUM: { ETH: 'ETH', BASE: 'BASE' },
  CHAINS: { ETH: { id: 1, enum: 'ETH', serverId: 'eth' } },
  EVENTS: {
    COMMON_HARDWARE: { REJECTED: 'REJECTED' },
    broadcastToUI: 'broadcastToUI',
    SIGN_FINISHED: 'SIGN_FINISHED',
  },
}));
jest.mock('@/utils/chain', () => {
  const chains = [
    {
      id: 8453,
      enum: 'BASE',
      serverId: 'base',
      eip: { '1559': true, '7702': false },
    },
    {
      id: 31337,
      enum: 'CUSTOM_31337',
      serverId: 'custom_31337',
      eip: { '1559': true, '7702': false },
    },
  ];
  return {
    findChain: jest.fn(
      (query: { id?: number; enum?: string }) =>
        chains.find(
          (chain) =>
            (query.id !== undefined && chain.id === query.id) ||
            (query.enum !== undefined && chain.enum === query.enum)
        ) || chains[0]
    ),
    findChainByEnum: jest.fn(
      (chainEnum: string) =>
        chains.find((chain) => chain.enum === chainEnum) || chains[0]
    ),
    isTestnet: jest.fn(() => false),
  };
});
jest.mock('@/i18n', () => ({ t: (key: string) => key }));
jest.mock('@/utils', () => ({
  resemblesETHAddress: (value: string) => /^0x[0-9a-f]{40}$/i.test(value),
}));
jest.mock('@/utils/sentry', () => ({
  takeSigningCarrier: () => undefined,
  getSigningContext: () => undefined,
}));
jest.mock('@/background/controller/base', () => class {});
jest.mock('@/background/controller/wallet', () => ({}));
jest.mock('@/background/controller/utils', () => ({}));
jest.mock('@/background/service/customTestnet', () => ({}));
jest.mock('@/background/utils/rpcCache', () => ({}));
jest.mock('@/background/utils/buildinProvider', () => ({}));
jest.mock('@/background/utils/tx', () => ({}));
jest.mock('@/background/utils/gasAccountLogin', () => ({}));
jest.mock('@/background/controller/walletUtils/fix', () => ({}));
jest.mock('@sentry/browser', () => ({ captureException: jest.fn() }));

import provider from '@/background/controller/provider';
import providerController from '@/background/controller/provider/controller';
import rpcFlow from '@/background/controller/provider/rpcFlow';

const createRequest = ({
  from,
  chainId,
  flag,
  origin = dappOrigin,
  isFromRabby,
}: {
  from: string;
  chainId: number;
  flag?: 'isSpeedUp' | 'isCancel';
  origin?: string;
  isFromRabby?: boolean;
}) => ({
  data: {
    method: 'eth_sendTransaction',
    params: [
      {
        from,
        to: from,
        value: '0x0',
        gas: '0xc350',
        gasPrice: '0x1',
        chainId,
        ...(flag ? { [flag]: true } : {}),
      },
    ],
  },
  origin,
  session: {
    origin,
    name: 'dApp',
    icon: '',
    isFromRabby,
  },
});

describe('dApp transaction account and chain binding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNotificationService.requestApproval.mockImplementation(async () => {
      throw stopAtApproval;
    });
  });

  test.each([undefined, 'isSpeedUp', 'isCancel'] as const)(
    'rejects an external transaction for global account B with flag %s',
    async (flag) => {
      await expect(
        provider(
          createRequest({
            from: accountB.address,
            chainId: 31337,
            flag,
          })
        )
      ).rejects.toMatchObject({
        code: -32602,
        message: 'from should be same as current address',
      });
      expect(mockNotificationService.requestApproval).not.toHaveBeenCalled();
    }
  );

  test.each([undefined, 'isSpeedUp', 'isCancel'] as const)(
    'rejects an external cross-chain transaction for site account A with flag %s',
    async (flag) => {
      await expect(
        provider(
          createRequest({
            from: accountA.address,
            chainId: 31337,
            flag,
          })
        )
      ).rejects.toMatchObject({
        code: -32602,
        message: 'chainId should be same as current chainId',
      });
      expect(mockNotificationService.requestApproval).not.toHaveBeenCalled();
    }
  );

  test.each(['isSpeedUp', 'isCancel'] as const)(
    'rejects an external cross-chain transaction with %s when per-dApp accounts are disabled',
    async (flag) => {
      mockPreferenceService.getPreference.mockReturnValueOnce(false);

      await expect(
        provider(
          createRequest({
            from: accountB.address,
            chainId: 31337,
            flag,
          })
        )
      ).rejects.toMatchObject({
        code: -32602,
        message: 'chainId should be same as current chainId',
      });
      expect(mockNotificationService.requestApproval).not.toHaveBeenCalled();
    }
  );

  test.each(['isSpeedUp', 'isCancel'] as const)(
    'removes %s from an otherwise valid external transaction before approval',
    async (flag) => {
      await expect(
        provider(createRequest({ from: accountA.address, chainId: 8453, flag }))
      ).rejects.toBe(stopAtApproval);

      expect(mockNotificationService.requestApproval).toHaveBeenCalledTimes(1);
      const approval = mockNotificationService.requestApproval.mock
        .calls[0]![0];
      expect(approval.account).toBe(accountA);
      expect(approval.params.data[0]).not.toHaveProperty('isSpeedUp');
      expect(approval.params.data[0]).not.toHaveProperty('isCancel');
    }
  );

  test.each([
    ['isSpeedUp', internalOrigin, undefined],
    ['isCancel', internalOrigin, undefined],
    ['isSpeedUp', dappOrigin, true],
    ['isCancel', dappOrigin, true],
  ] as const)(
    'preserves %s for a trusted session at %s',
    async (flag, origin, isFromRabby) => {
      await expect(
        provider(
          createRequest({
            from: accountB.address,
            chainId: 31337,
            flag,
            origin,
            isFromRabby,
          })
        )
      ).rejects.toBe(stopAtApproval);

      expect(mockNotificationService.requestApproval).toHaveBeenCalledWith(
        expect.objectContaining({
          account: accountB,
          params: expect.objectContaining({
            data: [expect.objectContaining({ [flag]: true })],
          }),
        }),
        expect.anything(),
        expect.anything()
      );
    }
  );
});

describe('approved transaction binding before signing', () => {
  const txParams = {
    from: accountB.address,
    to: accountB.address,
    value: '0x0',
    gas: '0xc350',
    gasPrice: '0x1',
    nonce: '0x0',
    data: '0x',
    chainId: 8453,
  };

  beforeEach(() => jest.clearAllMocks());

  test.each([
    ['from', { from: accountA.address }],
    ['chainId', { chainId: 31337 }],
  ])('rejects a changed approved %s', async (_name, change) => {
    await expect(
      providerController.ethSendTransaction({
        data: { params: [txParams] },
        session: { origin: dappOrigin, name: 'dApp', icon: '' },
        approvalRes: {
          ...txParams,
          ...change,
          signingTxId: 'signing-tx',
        },
        account: accountB,
        pushed: false,
        result: undefined,
      })
    ).rejects.toMatchObject({
      code: -32602,
      message: 'approved transaction does not match request',
    });
    expect(mockKeyringService.signTransaction).not.toHaveBeenCalled();
  });
});

describe('completed Safe message approvals', () => {
  const account = { ...accountA, type: 'Gnosis' };
  const signature = `0x${'ab'.repeat(65)}`;
  const typedData = JSON.stringify({
    types: {
      EIP712Domain: [{ name: 'chainId', type: 'uint256' }],
      Message: [{ name: 'contents', type: 'string' }],
    },
    primaryType: 'Message',
    domain: { chainId: 8453 },
    message: { contents: 'hello' },
  });

  beforeEach(() => jest.clearAllMocks());

  test.each([
    'personal_sign',
    'eth_signTypedData',
    'eth_signTypedData_v1',
    'eth_signTypedData_v3',
    'eth_signTypedData_v4',
  ])(
    'returns the approved signature for %s without signing again',
    async (method) => {
      const params =
        method === 'personal_sign'
          ? ['0x68656c6c6f', account.address]
          : method === 'eth_signTypedData' || method === 'eth_signTypedData_v1'
          ? [
              [{ name: 'message', type: 'string', value: 'hello' }],
              account.address,
            ]
          : [account.address, typedData];
      mockNotificationService.requestApproval.mockResolvedValueOnce(signature);

      await expect(
        rpcFlow({
          data: { method, params },
          session: { origin: dappOrigin, name: 'dApp', icon: '' },
          account,
        })
      ).resolves.toBe(signature);

      expect(mockKeyringService.getKeyringForAccount).not.toHaveBeenCalled();
      expect(mockKeyringService.signPersonalMessage).not.toHaveBeenCalled();
      expect(mockKeyringService.signTypedMessage).not.toHaveBeenCalled();
    }
  );
});
