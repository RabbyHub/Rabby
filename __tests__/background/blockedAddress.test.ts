import openapiService from '@/background/service/openapi';
import {
  clearBlockedAddressCache,
  hasBlockedAddress,
} from '@/background/service/blockedAddress';

jest.mock('@/background/service/openapi', () => ({
  __esModule: true,
  default: { isBlockedAddress: jest.fn() },
}));

const isBlockedAddress = openapiService.isBlockedAddress as jest.Mock;
const user = '0x7e5f4552091a69125d5dfcb7b8c2659029395bdf';
const bad = '0x098b716b8aaf21512996dc57eb0615e2383e2f96';

describe('hasBlockedAddress', () => {
  beforeEach(() => {
    jest.useFakeTimers('modern');
    jest.clearAllMocks();
    clearBlockedAddressCache();
    isBlockedAddress.mockImplementation(async (addr: string) => ({
      is_blocked: addr === bad,
    }));
  });

  afterEach(() => jest.useRealTimers());

  test('reports a blocked sender or receiver', async () => {
    expect(await hasBlockedAddress([user, bad])).toBe(true);
    expect(await hasBlockedAddress([user, undefined, ''])).toBe(false);
  });

  test('asks the API once per address, whatever the case', async () => {
    await Promise.all([
      hasBlockedAddress([user, user.toUpperCase().replace('0X', '0x')]),
      hasBlockedAddress([user]),
    ]);
    await hasBlockedAddress([user]);
    expect(isBlockedAddress).toHaveBeenCalledTimes(1);
    expect(isBlockedAddress).toHaveBeenCalledWith(user);
  });

  test('asks again once the entry expires', async () => {
    await hasBlockedAddress([user]);
    jest.advanceTimersByTime(5 * 60 * 1000 - 1);
    await hasBlockedAddress([user]);
    expect(isBlockedAddress).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(2);
    await hasBlockedAddress([user]);
    expect(isBlockedAddress).toHaveBeenCalledTimes(2);
  });

  test('a failed lookup does not hide another blocked address', async () => {
    expect(await hasBlockedAddress([bad])).toBe(true);
    isBlockedAddress.mockRejectedValueOnce(new Error('429'));
    expect(await hasBlockedAddress([bad, user])).toBe(true);
    // Uncached: both lookups in one call, the receiver one failing.
    clearBlockedAddressCache();
    isBlockedAddress.mockImplementation(async (addr: string) => {
      if (addr === user) throw new Error('429');
      return { is_blocked: addr === bad };
    });
    expect(await hasBlockedAddress([bad, user])).toBe(true);
  });

  test('lets signing through on failure and does not cache it', async () => {
    isBlockedAddress.mockRejectedValueOnce(new Error('429'));
    expect(await hasBlockedAddress([bad])).toBe(false);
    expect(await hasBlockedAddress([bad])).toBe(true);
    expect(isBlockedAddress).toHaveBeenCalledTimes(2);
  });
});
