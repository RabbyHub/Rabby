import type { BridgeHistory } from '@rabby-wallet/rabby-api/dist/types';
import type { WalletControllerType } from '@/ui/utils/WalletContext';
import {
  getBridgeHistoryTop10,
  refreshBridgeHistoryTop10,
} from '@/ui/views/Bridge/utils/historyCache';

const bridge = (id: string) =>
  ({
    from_token: { chain: 'eth' },
    from_tx: { tx_id: id },
    status: 'pending',
  } as BridgeHistory);
const walletWith = (query: jest.Mock) =>
  (({
    openapi: { getBridgeHistoryList: query },
  } as unknown) as WalletControllerType);

describe('shared Bridge top 10', () => {
  it('shares an in-flight request across callers and address casing', async () => {
    const query = jest
      .fn()
      .mockResolvedValue({ history_list: [bridge('0x1')] });
    const wallet = walletWith(query);
    const first = refreshBridgeHistoryTop10(wallet, '0xSHARED');
    const second = refreshBridgeHistoryTop10(wallet, '0xshared');
    expect(second).toBe(first);
    await first;
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith({
      user_addr: '0xSHARED',
      start: 0,
      limit: 10,
      is_all: true,
    });
    expect(getBridgeHistoryTop10('0xshared')).toEqual([bridge('0x1')]);
    expect(getBridgeHistoryTop10('0xother-address')).toEqual([]);
  });

  it('keeps a stable snapshot for equal responses and replaces empty results', async () => {
    const address = '0xstable-cache';
    const query = jest
      .fn()
      .mockResolvedValue({ history_list: [bridge('0x2')] });
    const wallet = walletWith(query);
    await refreshBridgeHistoryTop10(wallet, address);
    const snapshot = getBridgeHistoryTop10(address);
    await refreshBridgeHistoryTop10(wallet, address);
    expect(getBridgeHistoryTop10(address)).toBe(snapshot);
    query.mockResolvedValue({ history_list: [] });
    await refreshBridgeHistoryTop10(wallet, address);
    expect(getBridgeHistoryTop10(address)).toEqual([]);
  });

  it('preserves cached data on failure and allows retry', async () => {
    const address = '0xretry-cache';
    const query = jest
      .fn()
      .mockResolvedValue({ history_list: [bridge('0x3')] });
    const wallet = walletWith(query);
    await refreshBridgeHistoryTop10(wallet, address);
    query.mockRejectedValueOnce(new Error('network'));
    await expect(refreshBridgeHistoryTop10(wallet, address)).rejects.toThrow(
      'network'
    );
    expect(getBridgeHistoryTop10(address)).toEqual([bridge('0x3')]);
    query.mockResolvedValue({ history_list: [bridge('0x4')] });
    await refreshBridgeHistoryTop10(wallet, address);
    expect(getBridgeHistoryTop10(address)).toEqual([bridge('0x4')]);
  });
});
