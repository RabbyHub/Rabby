jest.mock('consts', () => ({
  CHAINS_ENUM: {
    ETH: 'ETH',
  },
  CHAINS: {},
}));

jest.mock('background/service', () => ({
  permissionService: {
    getSite: jest.fn(),
  },
  keyringService: {
    isUnlocked: jest.fn(),
    memStore: {
      getState: jest.fn(),
    },
  },
  preferenceService: {
    getCurrentAccount: jest.fn(),
    setCurrentAccount: jest.fn(),
  },
}));

jest.mock('@/background/controller/wallet', () => ({
  __esModule: true,
  default: {
    getAccountByAddress: jest.fn(),
    isUnlocked: jest.fn(),
    openInDesktop: jest.fn(),
  },
}));

jest.mock('@/background/controller/provider/controller', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('@/background/utils/index', () => ({
  setPopupIcon: jest.fn(),
}));

jest.mock('@/utils/chain', () => ({
  findChainByEnum: jest.fn(),
}));

jest.mock('@/utils/env', () => ({
  appIsDev: false,
}));

jest.mock('@/background/service/metamaskModeService', () => ({
  metamaskModeService: {
    checkIsMetamaskMode: jest.fn(),
  },
}));

jest.mock('@/utils/ga4', () => ({
  ga4: {
    fireEvent: jest.fn(),
  },
}));

import { keyringService, preferenceService } from 'background/service';
import wallet from '@/background/controller/wallet';
import internalMethods from '@/background/controller/provider/internalMethod';

const openInDesktop = internalMethods['rabby:openInDesktop'];
const isUnlockedMock = keyringService.isUnlocked as jest.Mock;
const getCurrentAccountMock = preferenceService.getCurrentAccount as jest.Mock;
const setCurrentAccountMock = preferenceService.setCurrentAccount as jest.Mock;
const getAccountByAddressMock = wallet.getAccountByAddress as jest.Mock;
const walletOpenInDesktopMock = wallet.openInDesktop as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  isUnlockedMock.mockReturnValue(true);
  getCurrentAccountMock.mockReturnValue(null);
  getAccountByAddressMock.mockResolvedValue(null);
  walletOpenInDesktopMock.mockResolvedValue(undefined);
});

describe('rabby:openInDesktop', () => {
  it('opens the home route for a top-level go.rabby.io request', async () => {
    const result = await openInDesktop({
      data: {
        method: 'rabby:openInDesktop',
        params: [{ address: 'attacker-controlled', target: 'home' }],
      },
      sourceFrameId: 0,
      origin: 'https://go.rabby.io',
    });

    expect(result).toEqual({ opened: true });
    expect(walletOpenInDesktopMock).toHaveBeenCalledWith('/desktop/profile');
    expect(getAccountByAddressMock).not.toHaveBeenCalled();
    expect(setCurrentAccountMock).not.toHaveBeenCalled();
  });

  it.each([
    { target: 'perps', desktopPath: '/desktop/perps' },
    { target: 'swap', desktopPath: '/desktop/profile?action=swap' },
    { target: 'bridge', desktopPath: '/desktop/profile?action=bridge' },
  ])(
    'opens the allowlisted $target route for go.rabby.io',
    async ({ target, desktopPath }) => {
      const result = await openInDesktop({
        data: {
          method: 'rabby:openInDesktop',
          params: [{ target }],
        },
        sourceFrameId: 0,
        origin: 'https://go.rabby.io',
      });

      expect(result).toEqual({ opened: true });
      expect(walletOpenInDesktopMock).toHaveBeenCalledWith(desktopPath);
    }
  );

  it.each([undefined, 'profile', '../../unlock'])(
    'silently falls back to home for target %s',
    async (target) => {
      await openInDesktop({
        data: {
          method: 'rabby:openInDesktop',
          params: [{ target }],
        },
        sourceFrameId: 0,
        origin: 'https://go.rabby.io',
      });

      expect(walletOpenInDesktopMock).toHaveBeenCalledWith('/desktop/profile');
    }
  );

  it('rejects a go.rabby.io iframe before any privileged sink', async () => {
    const request = openInDesktop({
      data: {
        method: 'rabby:openInDesktop',
        params: [{}],
      },
      sourceFrameId: 7,
      origin: 'https://go.rabby.io',
    });

    await expect(request).rejects.toMatchObject({ code: 4100 });
    expect(walletOpenInDesktopMock).not.toHaveBeenCalled();
  });

  it('rejects a non-allowlisted origin before any privileged sink', async () => {
    const request = openInDesktop({
      data: {
        method: 'rabby:openInDesktop',
        params: [{}],
      },
      sourceFrameId: 0,
      origin: 'https://go.rabby.io.evil.test',
    });

    await expect(request).rejects.toMatchObject({ code: 4100 });
    expect(walletOpenInDesktopMock).not.toHaveBeenCalled();
  });

  it('preserves the existing Debank route and return contract', async () => {
    const result = await openInDesktop({
      data: {
        method: 'rabby:openInDesktop',
        params: [{}],
      },
      origin: 'https://debank.com',
    });

    expect(result).toBeUndefined();
    expect(walletOpenInDesktopMock).toHaveBeenCalledWith(
      '/desktop/profile?utm_source=debank'
    );
  });
});
