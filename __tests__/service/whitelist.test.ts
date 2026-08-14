import whitelistService from '@/background/service/whitelist';
import { patchPersistStore } from 'background/utils';

jest.mock('background/utils', () => ({
  createPersistStore: jest.fn(),
  isSameAddress: (a: string, b: string) => a.toLowerCase() === b.toLowerCase(),
  patchPersistStore: jest.fn((store, partials) => {
    Object.assign(store, partials);
  }),
}));

describe('whitelist service patches', () => {
  beforeEach(() => {
    whitelistService.store = {
      enabled: true,
      whitelists: ['0xaaa', '0xbbb'],
    };
    (patchPersistStore as jest.Mock).mockClear();
  });

  test('accepts only a normalized reorder through the generic patch API', () => {
    whitelistService.patchStore({ whitelists: ['0xBBB', '0xAAA'] });

    expect(patchPersistStore).toHaveBeenCalledWith(whitelistService.store, {
      whitelists: ['0xbbb', '0xaaa'],
    });
  });

  test('rejects membership changes through the generic patch API', () => {
    expect(() =>
      whitelistService.patchStore({ whitelists: ['0xbbb', '0xccc'] })
    ).toThrow('Invalid whitelist order');
    expect(patchPersistStore).not.toHaveBeenCalled();
  });

  test('keeps password-protected fields out of the generic patch API', () => {
    expect(() => whitelistService.patchStore({ enabled: false })).toThrow(
      'Only whitelist order can be updated without password'
    );
    expect(patchPersistStore).not.toHaveBeenCalled();
  });

  test('exposes the effective whitelist setting in snapshots', () => {
    whitelistService.store.enabled = false;

    expect(whitelistService.getStore().enabled).toBe(true);
  });
});
