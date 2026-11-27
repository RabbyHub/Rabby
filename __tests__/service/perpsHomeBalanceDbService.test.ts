import { KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import type { PerpsHomeBalanceRow } from '@/db/schema/perpsHomeBalance';
import { perpsHomeBalanceDbService as cache } from '@/db/services/perpsHomeBalanceDbService';

const mockRows = new Map<string, PerpsHomeBalanceRow>();
const mockTable = {
  get: jest.fn(async (address: string) => mockRows.get(address)),
  put: jest.fn(async (row: PerpsHomeBalanceRow) =>
    mockRows.set(row.address, row)
  ),
  delete: jest.fn(async (address: string) => mockRows.delete(address)),
};
const mockTransaction = jest.fn(async (_mode, _table, write) => write());
jest.mock('@/db', () => ({
  db: {
    get perpsHomeBalance() {
      return mockTable;
    },
    get transaction() {
      return mockTransaction;
    },
  },
}));

const ledger = { address: '0xAb', type: KEYRING_CLASS.HARDWARE.LEDGER };
const watch = { ...ledger, type: KEYRING_TYPE.WatchAddressKeyring };
const amount = { kind: 'availableBalance', value: 0 } as const;

beforeEach(() => {
  jest.clearAllMocks();
  mockRows.clear();
});

test.each([
  watch,
  { ...ledger, type: KEYRING_TYPE.GnosisKeyring },
  { ...ledger, type: '' },
  { ...ledger, address: '' },
])('skips every database operation for %o', async (account) => {
  await cache.get(account);
  await cache.put(account, amount);
  await cache.removeIfUnsupported(account, []);
  expect(mockTable.get).not.toHaveBeenCalled();
  expect(mockTransaction).not.toHaveBeenCalled();
  expect(mockTable.put).not.toHaveBeenCalled();
  expect(mockTable.delete).not.toHaveBeenCalled();
});

test('normalizes the key, persists genuine zeros, and deduplicates identical snapshots', async () => {
  await cache.put(ledger, amount);
  await cache.put({ ...ledger, address: '0xab' }, amount);
  expect(await cache.get(ledger)).toEqual({
    address: '0xab',
    ...amount,
    updatedAt: expect.any(Number),
  });
  expect(mockTable.put).toHaveBeenCalledTimes(1);
  await cache.put(ledger, { kind: 'pnl', value: 0 });
  expect((await cache.get(ledger))?.kind).toBe('pnl');
  expect(mockTable.put).toHaveBeenCalledTimes(2);
});

test('removes the row only after the last supported import is removed', async () => {
  await cache.put(ledger, amount);
  await cache.removeIfUnsupported(ledger, [
    watch,
    { ...ledger, type: KEYRING_TYPE.SimpleKeyring },
  ]);
  expect(await cache.get(ledger)).toBeTruthy();
  await cache.removeIfUnsupported(ledger, [watch]);
  expect(await cache.get(ledger)).toBeNull();
});
