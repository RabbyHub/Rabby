import { getGasDepositTxKey, markGasDepositTxs } from '@/utils/history';

const CHAIN_IDS: Record<string, number> = { eth: 1, bsc: 56 };
const getChainId = (serverId: string) => CHAIN_IDS[serverId];

describe('markGasDepositTxs', () => {
  test('marks txs whose chain id and hash match a gas deposit key', () => {
    const keys = new Set([getGasDepositTxKey(1, '0xABC')]);
    const list = [
      { chain: 'eth', id: '0xabc' },
      { chain: 'bsc', id: '0xabc' },
      { chain: 'eth', id: '0xdef' },
    ];

    expect(markGasDepositTxs(list, keys, getChainId)).toEqual([
      { chain: 'eth', id: '0xabc', isGasDeposit: true },
      { chain: 'bsc', id: '0xabc' },
      { chain: 'eth', id: '0xdef' },
    ]);
  });

  test('matches hashes case-insensitively', () => {
    const keys = new Set([getGasDepositTxKey(1, '0xabc')]);

    expect(
      markGasDepositTxs([{ chain: 'eth', id: '0xABC' }], keys, getChainId)[0]
        .isGasDeposit
    ).toBe(true);
  });

  test('skips txs on chains it cannot resolve', () => {
    const keys = new Set([getGasDepositTxKey(1, '0xabc')]);

    expect(
      markGasDepositTxs(
        [{ chain: 'unknown', id: '0xabc' }],
        keys,
        getChainId
      )[0].isGasDeposit
    ).toBeUndefined();
  });

  test('returns the same list when there are no gas deposit txs', () => {
    const list = [{ chain: 'eth', id: '0xabc' }];
    const resolveChain = jest.fn(getChainId);

    expect(markGasDepositTxs(list, new Set(), resolveChain)).toBe(list);
    expect(markGasDepositTxs(list, undefined, resolveChain)).toBe(list);
    expect(resolveChain).not.toHaveBeenCalled();
  });
});
