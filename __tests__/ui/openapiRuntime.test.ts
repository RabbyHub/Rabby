let mockStore: any;
const mockOpenapi = {
  initSync: jest.fn(),
  getHost: jest.fn(() => mockStore.host),
  setHost: jest.fn(async (host: string) => {
    mockStore.host = host;
  }),
};
const mockInit = jest.fn().mockResolvedValue(undefined);

jest.mock('@/services/openapi', () => {
  const actual = jest.requireActual('@/services/openapi');
  return {
    ...actual,
    createOpenapiClient: jest.fn((store) => {
      mockStore = store;
      return {
        openapi: mockOpenapi,
        init: mockInit,
      };
    }),
  };
});

import { createUIOpenapiRuntime } from '@/ui/service/openapi';

describe('UI OpenAPI runtime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('hydrates the public host and uses a volatile UI API identity', async () => {
    let resolveCommit!: () => void;
    const commit = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveCommit = resolve;
        })
    );
    let onUpdate: ((update: any) => void) | undefined;
    const runtime = createUIOpenapiRuntime({
      load: jest.fn().mockResolvedValue({
        origin: 'background-1',
        revision: 1,
        state: {
          host: 'https://api.example.com',
        },
      }),
      commit,
      subscribe(listener) {
        onUpdate = listener;
        return jest.fn();
      },
    });

    await runtime.ready;
    await expect(runtime.openapi.getHost()).resolves.toBe(
      'https://api.example.com'
    );
    expect(mockStore.apiKey).toEqual(expect.any(String));
    expect(mockStore.apiTime).toEqual(expect.any(Number));

    const setHost = runtime.openapi.setHost('https://local.example.com');
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(commit).toHaveBeenCalledWith({
      host: 'https://local.example.com',
    });
    let hostWasPersisted = false;
    void setHost.then(() => {
      hostWasPersisted = true;
    });
    await Promise.resolve();
    expect(hostWasPersisted).toBe(false);
    resolveCommit();
    await setHost;
    expect(hostWasPersisted).toBe(true);

    onUpdate?.({
      origin: 'background-1',
      revision: 2,
      partials: { host: 'https://remote.example.com' },
    });
    await expect(runtime.openapi.getHost()).resolves.toBe(
      'https://remote.example.com'
    );
    expect(mockOpenapi.initSync).toHaveBeenCalledTimes(1);

    runtime.dispose();
  });
});
