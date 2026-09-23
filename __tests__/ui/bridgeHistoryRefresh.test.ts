import { findLocalBridgeTx } from '@/ui/views/Bridge/utils/historyRefresh';

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
