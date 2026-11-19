import { fetchPerpsWidgetLogo } from '@/background/utils/perpsWidgetLogo';

const originalFetch = global.fetch;
const mockFetch = jest.fn();
const url = 'https://app.hyperliquid.xyz/coins/BTC.svg';
const svg = '<svg xmlns="http://www.w3.org/2000/svg"/>';

function response(mime = 'image/svg+xml', chunks = [Buffer.from(svg)]) {
  const values = [...chunks];
  return {
    ok: true,
    headers: { get: () => mime },
    body: {
      getReader: () => ({
        read: jest.fn(async () =>
          values.length
            ? { value: values.shift(), done: false }
            : { done: true }
        ),
      }),
    },
  };
}

beforeEach(() => {
  jest.useFakeTimers();
  mockFetch.mockReset().mockResolvedValue(response());
  global.fetch = mockFetch;
});
afterEach(() => {
  global.fetch = originalFetch;
  jest.useRealTimers();
});

test('returns inline image bytes without cookies or the host page referrer', async () => {
  const result = await fetchPerpsWidgetLogo(url);
  expect(result).toBe(
    `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
  );
  expect(mockFetch).toHaveBeenCalledWith(
    url,
    expect.objectContaining({
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: expect.any(AbortSignal),
    })
  );
  expect(jest.getTimerCount()).toBe(0);
});

test('rejects non-HTTPS URLs without fetching', async () => {
  await expect(
    fetchPerpsWidgetLogo('http://example.com/logo.svg')
  ).resolves.toBe('');
  expect(mockFetch).not.toHaveBeenCalled();
});

test.each([
  ['non-image', () => response('text/html')],
  ['HTTP error', () => ({ ...response(), ok: false })],
  ['empty image', () => response('image/png', [])],
  [
    'oversized image',
    () => response('image/png', [Buffer.alloc(256 * 1024), Buffer.alloc(1)]),
  ],
])(
  'fails closed for %s rather than returning a remote URL',
  async (_name, createResponse) => {
    mockFetch.mockResolvedValue(createResponse());
    await expect(fetchPerpsWidgetLogo(url)).resolves.toBe('');
    expect(mockFetch.mock.calls[0][1].signal.aborted).toBe(true);
  }
);

test('aborts a stalled download after five seconds', async () => {
  mockFetch.mockImplementation(
    (_url, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('aborted')));
      })
  );
  const pending = fetchPerpsWidgetLogo(url);
  jest.advanceTimersByTime(5000);
  await expect(pending).resolves.toBe('');
  expect(mockFetch.mock.calls[0][1].signal.aborted).toBe(true);
  expect(jest.getTimerCount()).toBe(0);
});
