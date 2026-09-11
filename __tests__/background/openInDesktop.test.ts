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
  __esModule: true,
  appIsDev: false,
  isManifestV3: true,
}));

jest.mock('webextension-polyfill', () => ({
  runtime: { getManifest: jest.fn(() => ({ version: '1.1.0' })) },
  action: { openPopup: jest.fn() },
  browserAction: { openPopup: jest.fn() },
}));

jest.mock('@/background/service/extensionUpdate', () => ({
  __esModule: true,
  default: {
    getPendingVersion: jest.fn().mockResolvedValue(null),
    getLocalTestUpdateStatus: jest
      .fn()
      .mockResolvedValue({ version: '0.94.8', pendingVersion: null }),
  },
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
import extensionUpdateService from '@/background/service/extensionUpdate';
import internalMethods from '@/background/controller/provider/internalMethod';
import browser from 'webextension-polyfill';
import * as env from '@/utils/env';

const openInDesktop = internalMethods['rabby:openInDesktop'];
const isUnlockedMock = keyringService.isUnlocked as jest.Mock;
const getCurrentAccountMock = preferenceService.getCurrentAccount as jest.Mock;
const setCurrentAccountMock = preferenceService.setCurrentAccount as jest.Mock;
const getAccountByAddressMock = wallet.getAccountByAddress as jest.Mock;
const walletOpenInDesktopMock = wallet.openInDesktop as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  (env as any).appIsDev = false;
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

describe('rabby:getUpdateStatus', () => {
  const getUpdateStatus = internalMethods['rabby:getUpdateStatus'];

  it('allows localhost test status in development only', async () => {
    const req = {
      origin: 'http://localhost:5173',
      data: { method: 'rabby:getUpdateStatus' },
    };
    await expect(getUpdateStatus(req)).rejects.toMatchObject({ code: 4100 });
    (env as any).appIsDev = true;
    await expect(getUpdateStatus(req)).resolves.toEqual({
      version: '0.94.8',
      pendingVersion: null,
    });
  });

  it('returns the installed and pending versions without opening the wallet', async () => {
    (extensionUpdateService.getPendingVersion as jest.Mock).mockResolvedValueOnce(
      '1.2.0'
    );
    await expect(
      getUpdateStatus({
        origin: 'https://rabby.io',
        data: { method: 'rabby:getUpdateStatus' },
      })
    ).resolves.toEqual({ version: '1.1.0', pendingVersion: '1.2.0' });
    expect(browser.action.openPopup).not.toHaveBeenCalled();
    expect(setCurrentAccountMock).not.toHaveBeenCalled();
  });

  it.each([
    undefined,
    'null',
    'http://rabby.io',
    'https://www.rabby.io',
    'https://rabby.io.evil.test',
    'https://rabby.io:8443',
  ])('rejects untrusted origin %s', async (origin) => {
    await expect(
      getUpdateStatus({
        origin,
        data: {
          method: 'rabby:getUpdateStatus',
          params: [{ origin: 'https://rabby.io' }],
        },
      })
    ).rejects.toMatchObject({ code: 4100 });
    expect(extensionUpdateService.getPendingVersion).not.toHaveBeenCalled();
  });
});

describe('rabby:openPopup', () => {
  const openPopup = internalMethods['rabby:openPopup'];

  it('allows localhost popup in development only', async () => {
    const req = {
      origin: 'http://localhost:5173',
      data: { method: 'rabby:openPopup' },
    };
    await expect(openPopup(req)).rejects.toMatchObject({ code: 4100 });
    (env as any).appIsDev = true;
    await expect(openPopup(req)).resolves.toEqual({ opened: true });
  });

  it.each([
    'http://localhost:5174',
    'http://localhost.evil.test:5173',
    'http://127.0.0.1:5173',
  ])(
    'rejects non-allowlisted local origin %s even in development',
    async (origin) => {
      (env as any).appIsDev = true;
      await expect(
        openPopup({ origin, data: { method: 'rabby:openPopup' } })
      ).rejects.toMatchObject({ code: 4100 });
    }
  );

  beforeEach(() => {
    (env as any).isManifestV3 = true;
    (browser.action.openPopup as jest.Mock).mockResolvedValue(undefined);
    (browser.browserAction.openPopup as jest.Mock).mockResolvedValue(undefined);
  });

  it('opens the popup for rabby.io without changing accounts', async () => {
    await expect(
      openPopup({
        origin: 'https://rabby.io',
        data: { method: 'rabby:openPopup' },
      })
    ).resolves.toEqual({ opened: true });
    expect(browser.action.openPopup).toHaveBeenCalledTimes(1);
    expect(setCurrentAccountMock).not.toHaveBeenCalled();
    expect(walletOpenInDesktopMock).not.toHaveBeenCalled();
  });

  it.each([
    undefined,
    '',
    'null',
    'http://rabby.io',
    'https://www.rabby.io',
    'https://go.rabby.io',
    'https://rabby.io.evil.test',
    'https://evil.test',
    'https://rabby.io:8443',
  ])(
    'rejects origin %s even if request params and session claim rabby.io',
    async (origin) => {
      await expect(
        openPopup({
          origin,
          session: { origin: 'https://rabby.io', name: '', icon: '' },
          data: {
            method: 'rabby:openPopup',
            params: [{ origin: 'https://rabby.io' }],
          },
        })
      ).rejects.toMatchObject({ code: 4100 });
      expect(browser.action.openPopup).not.toHaveBeenCalled();
      expect(browser.browserAction.openPopup).not.toHaveBeenCalled();
    }
  );

  it('supports MV2 through browserAction', async () => {
    (env as any).isManifestV3 = false;
    await openPopup({
      origin: 'https://rabby.io',
      data: { method: 'rabby:openPopup' },
    });
    expect(browser.browserAction.openPopup).toHaveBeenCalledTimes(1);
    expect(browser.action.openPopup).not.toHaveBeenCalled();
  });

  it('propagates popup errors instead of reporting success', async () => {
    const error = new Error('Popup could not be opened');
    (browser.action.openPopup as jest.Mock).mockRejectedValueOnce(error);
    await expect(
      openPopup({
        origin: 'https://rabby.io',
        data: { method: 'rabby:openPopup' },
      })
    ).rejects.toThrow(error);
  });

  it('rejects when the browser has no openPopup API', async () => {
    const original = browser.action.openPopup;
    (browser.action as any).openPopup = undefined;
    try {
      await expect(
        openPopup({
          origin: 'https://rabby.io',
          data: { method: 'rabby:openPopup' },
        })
      ).rejects.toMatchObject({ code: 4200 });
    } finally {
      browser.action.openPopup = original;
    }
  });
});
