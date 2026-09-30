import {
  bridgeHistoryStatusKey,
  findLocalBridgeTx,
} from '@/ui/views/Bridge/utils/historyRefresh';

describe('findLocalBridgeTx', () => {
  it('matches the source hash and the accelerated hash without case', () => {
    const locals = [
      { hash: '0xAAA', acceleratedHash: '0xBBB' },
      { hash: '0xCCC' },
    ];

    expect(findLocalBridgeTx(locals, '0xaaa')?.hash).toBe('0xAAA');
    expect(findLocalBridgeTx(locals, '0xbbb')?.hash).toBe('0xAAA');
    expect(findLocalBridgeTx(locals, '0xddd')).toBeUndefined();
  });
});

describe('bridgeHistoryStatusKey', () => {
  const item = (txId: string, status: string, fromStatus?: string) =>
    ({ from_tx: { tx_id: txId, status: fromStatus }, status } as any);

  it('stays the same when a refresh returns identical statuses', () => {
    expect(bridgeHistoryStatusKey([item('0xA', 'pending', 'pending')])).toBe(
      bridgeHistoryStatusKey([item('0xa', 'pending', 'pending')])
    );
  });

  it('changes when the overall or source status changes', () => {
    const base = bridgeHistoryStatusKey([item('0xa', 'pending', 'pending')]);
    expect(
      bridgeHistoryStatusKey([item('0xa', 'pending', 'success')])
    ).not.toBe(base);
    expect(
      bridgeHistoryStatusKey([item('0xa', 'completed', 'success')])
    ).not.toBe(base);
  });

  it('handles an empty or missing list', () => {
    expect(bridgeHistoryStatusKey(undefined)).toBe('');
    expect(bridgeHistoryStatusKey([])).toBe('');
  });
});
