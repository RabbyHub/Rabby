const currentAccount = {
  address: '0x1234567890123456789012345678901234567890',
  type: 'SimpleKeyring',
  brandName: 'test',
};

const mockRpcFlow = jest.fn(async () => 'rpc-result');
const mockInternalMethod = {
  tabCheckin: jest.fn(() => 'internal-result'),
};
const mockKeyringService = {
  hasVault: jest.fn(() => true),
};
const mockPreferenceService = {
  getPreference: jest.fn((key: string) =>
    key === 'isEnabledDappAccount' ? false : undefined
  ),
  getCurrentAccount: jest.fn(() => currentAccount),
  setPreferencePartials: jest.fn(),
};
const mockPermissionService = {
  getConnectedSite: jest.fn(),
};
const mockSessionService = {
  deleteSessionsByTabId: jest.fn(),
};

jest.mock('@/background/controller/provider/rpcFlow', () => ({
  __esModule: true,
  default: mockRpcFlow,
}));
jest.mock('@/background/controller/provider/internalMethod', () => ({
  __esModule: true,
  default: mockInternalMethod,
}));
jest.mock('background/webapi', () => ({
  tab: { on: jest.fn() },
}));
jest.mock('background/service', () => ({
  keyringService: mockKeyringService,
  preferenceService: mockPreferenceService,
  permissionService: mockPermissionService,
  sessionService: mockSessionService,
}));
jest.mock('@/constant', () => ({
  INTERNAL_REQUEST_ORIGIN: 'chrome-extension://rabby',
}));

import provider from '@/background/controller/provider';

const createRequest = (method: string) => ({
  data: { method, params: [] },
  origin: 'https://unconnected.example',
  session: {
    origin: 'https://unconnected.example',
    name: 'Unconnected dapp',
    icon: '',
  },
});

describe('provider internal method dispatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test.each([
    'constructor',
    'toString',
    'valueOf',
    'hasOwnProperty',
    '__proto__',
  ])(
    'does not dispatch inherited property %s or return the request account',
    async (method) => {
      const req = createRequest(method);

      await expect(provider(req)).resolves.toBe('rpc-result');
      expect(mockRpcFlow).toHaveBeenCalledTimes(1);
      expect(mockRpcFlow).toHaveBeenCalledWith(
        expect.objectContaining({ account: currentAccount })
      );
    }
  );

  test('still dispatches an own internal method', async () => {
    const req = createRequest('tabCheckin');

    await expect(provider(req)).resolves.toBe('internal-result');
    expect(mockInternalMethod.tabCheckin).toHaveBeenCalledWith(req);
    expect(mockRpcFlow).not.toHaveBeenCalled();
  });
});
