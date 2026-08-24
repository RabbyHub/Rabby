let mockStore: any;
const mockInit = jest.fn().mockResolvedValue(undefined);
const mockInstances: any[] = [];

jest.mock('@rabby-wallet/rabby-api', () => {
  return {
    OpenApiService: class MockOpenApiService {
      init = mockInit;
      initSync = jest.fn();
      getHost = jest.fn(() => mockStore.host);
      setHost = jest.fn(async (host: string) => {
        mockStore.host = host;
      });

      constructor(options: any) {
        mockStore = options.store;
        mockInstances.push(this);
      }
    },
  };
});

jest.mock('@rabby-wallet/rabby-api/dist/plugins/web-sign', () => ({
  WebSignApiPlugin: {},
}));

import { createOpenapiRuntime } from '@/services/openapi';

describe('OpenAPI runtime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInstances.splice(0);
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
    const runtime = createOpenapiRuntime({
      kind: 'ui',
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
    expect(mockInstances[0].initSync).toHaveBeenCalledTimes(1);

    runtime.dispose();
  });

  test('initializes and reconfigures the background client', async () => {
    const initializeStore = jest.fn().mockResolvedValue(undefined);
    const runtime = createOpenapiRuntime({
      kind: 'background',
      store: {
        host: 'https://api.example.com',
        apiKey: 'key',
        apiTime: 1,
      },
      initializeStore,
    });

    await runtime.ready;
    expect(initializeStore).toHaveBeenCalledTimes(1);
    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(runtime.openapi).toBe(mockInstances[0]);

    await runtime.reconfigure();
    expect(mockInstances[0].initSync).toHaveBeenCalledTimes(1);
  });
});
