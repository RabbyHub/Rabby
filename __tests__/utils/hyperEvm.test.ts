import { getHyperEvmGasLimit } from '@/utils/hyperEvm';

const chain = { id: 999, serverId: 'hyper' };
const from = '0xsender';
const query = (requestETHRpc: jest.Mock) =>
  getHyperEvmGasLimit({
    chain,
    from,
    wallet: { requestETHRpc } as any,
  });

describe('HyperEVM mode query', () => {
  test.each([
    [true, 30_000_000],
    [false, 3_000_000],
    ['false', null],
    ['true', null],
    [1, null],
    [null, null],
    [undefined, null],
  ])('validates RPC result %j', async (result, cap) => {
    await expect(query(jest.fn().mockResolvedValue(result))).resolves.toBe(cap);
  });

  test('keeps a failed query unknown', async () => {
    await expect(
      query(jest.fn().mockRejectedValue(new Error('unsupported')))
    ).resolves.toBeNull();
  });

  test('bounds a hung query and clears its timer', async () => {
    jest.useFakeTimers();
    const result = query(
      jest.fn().mockImplementation(() => new Promise(() => {}))
    );
    jest.advanceTimersByTime(5000);
    await expect(result).resolves.toBeNull();
    expect(jest.getTimerCount()).toBe(0);
    jest.useRealTimers();
  });

  test('does not query another chain', async () => {
    const requestETHRpc = jest.fn();
    await expect(
      getHyperEvmGasLimit({
        chain: { id: 1, serverId: 'eth' },
        from,
        wallet: { requestETHRpc } as any,
      })
    ).resolves.toBeNull();
    expect(requestETHRpc).not.toHaveBeenCalled();
  });
});
