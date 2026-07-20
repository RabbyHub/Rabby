import { networkClientFactory } from '@ledgerhq/context-module/src/shared/network/networkClientFactory.js';

describe('Ledger Clear Signing network timeout', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
    jest.spyOn(console, 'debug').mockImplementation();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('shares one two-second deadline across sequential context requests', async () => {
    const response = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {},
      text: async () => '{}',
    } as Response;
    let requestCount = 0;
    const fetchMock = jest.fn((_url, init: RequestInit = {}) => {
      requestCount += 1;
      return new Promise<Response>((resolve, reject) => {
        init.signal?.addEventListener(
          'abort',
          () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
          { once: true }
        );
        if (requestCount === 1) {
          setTimeout(() => resolve(response), 1500);
        }
      });
    });
    global.fetch = fetchMock as typeof fetch;

    const client = networkClientFactory({
      networkTimeoutMs: 2000,
    } as Parameters<typeof networkClientFactory>[0]);
    const firstRequest = client.get('https://example.test/first');
    jest.advanceTimersByTime(1500);
    await firstRequest;

    const secondRequest = client
      .get('https://example.test/second')
      .then(() => null)
      .catch((error) => error);
    jest.advanceTimersByTime(500);

    await expect(secondRequest).resolves.toBeInstanceOf(Error);
    await expect(client.get('https://example.test/third')).rejects.toThrow(
      'Clear Signing network timeout'
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(console.debug).toHaveBeenCalledWith(
      '[Ledger Clear Signing][request:start]',
      expect.objectContaining({
        requestId: 1,
        url: 'https://example.test/first',
        remainingMs: 2000,
      })
    );
    expect(console.debug).toHaveBeenCalledWith(
      '[Ledger Clear Signing][request:end]',
      expect.objectContaining({
        requestId: 1,
        durationMs: 1500,
      })
    );
    expect(console.debug).toHaveBeenCalledWith(
      '[Ledger Clear Signing][request:error]',
      expect.objectContaining({
        requestId: 2,
        durationMs: 500,
      })
    );
  });
});
