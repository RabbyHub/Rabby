const mockIsUnlocked = jest.fn(() => true);
const mockDecryptWithPassword = jest.fn();
const mockEncryptWithPassword = jest.fn();

jest.mock('background/utils', () => ({
  createPersistStore: jest.fn(async ({ template }) => ({ ...template })),
}));

jest.mock('@/background/service', () => ({
  keyringService: {
    isUnlocked: () => mockIsUnlocked(),
    decryptWithPassword: (...args: unknown[]) =>
      mockDecryptWithPassword(...args),
    encryptWithPassword: (...args: unknown[]) =>
      mockEncryptWithPassword(...args),
  },
}));

jest.mock('@/constant', () => ({
  EVENTS: {
    PERPS: {
      WIDGET_ACCOUNT_CHANGED: 'WIDGET_ACCOUNT_CHANGED',
    },
  },
}));

jest.mock('@/constant/perps', () => ({
  DEFAULT_PERPS_ORDER_CONFIRMATIONS: {},
  isPerpsOrderConfirmType: jest.fn(),
}));

jest.mock('@rabby-wallet/hyperliquid-sdk', () => ({}));

import perpsService from '@/background/service/perps';

const MASTER = '0xabc0000000000000000000000000000000000000';
const VAULT = `0x${'11'.repeat(32)}`;

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('perpsService agent keys across the lock boundary', () => {
  beforeAll(async () => {
    await perpsService.init();
  });

  beforeEach(async () => {
    await perpsService.resetStore();
    mockIsUnlocked.mockReset().mockReturnValue(true);
    mockDecryptWithPassword.mockReset();
    mockEncryptWithPassword.mockReset();
  });

  const populateUnlockedCache = async () => {
    (perpsService as any).store.agentVaults = 'encrypted-blob';
    mockDecryptWithPassword.mockResolvedValue({ [MASTER]: VAULT });
    await perpsService.unlockAgentWallets();
  };

  it('serves cached agent keys while unlocked', async () => {
    await populateUnlockedCache();

    const wallet = await perpsService.getAgentWallet(MASTER);
    expect(wallet?.vault).toBe(VAULT);
    expect(perpsService.hasAgentWallet(MASTER)).toBe(true);
  });

  it('refuses to serve agent keys while locked', async () => {
    await populateUnlockedCache();

    mockIsUnlocked.mockReturnValue(false);

    expect(await perpsService.getAgentWallet(MASTER)).toBeUndefined();
  });

  it('lockAgentWallets drops cached agent keys', async () => {
    await populateUnlockedCache();

    perpsService.lockAgentWallets();

    expect(perpsService.hasAgentWallet(MASTER)).toBe(false);
  });

  it('does not populate the cache when decryption completes after lock', async () => {
    (perpsService as any).store.agentVaults = 'encrypted-blob';
    let resolveDecrypt!: (value: unknown) => void;
    mockDecryptWithPassword.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDecrypt = resolve;
        })
    );

    await perpsService.unlockAgentWallets();

    // the wallet locks while the password decrypt is still in flight
    mockIsUnlocked.mockReturnValue(false);
    perpsService.lockAgentWallets();
    resolveDecrypt({ [MASTER]: VAULT });
    await flushMicrotasks();

    expect(perpsService.hasAgentWallet(MASTER)).toBe(false);
    expect(await perpsService.getAgentWallet(MASTER)).toBeUndefined();
  });
});
