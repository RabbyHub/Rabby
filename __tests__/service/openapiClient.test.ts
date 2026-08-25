const mockInstances: any[] = [];

jest.mock('@rabby-wallet/rabby-api', () => ({
  OpenApiService: class MockOpenApiService {
    store: any;
    init = jest.fn().mockResolvedValue(undefined);
    initSync = jest.fn();

    constructor(options: any) {
      this.store = options.store;
      mockInstances.push(this);
    }
  },
}));

jest.mock('@rabby-wallet/rabby-api/dist/plugins/web-sign', () => ({
  WebSignApiPlugin: {},
}));

import {
  createOpenapiClient,
  createReadyOpenapiProxy,
} from '@/services/openapi/createOpenapiClient';
import type { OpenapiClientStore } from '@/services/openapi/types';

describe('shared OpenAPI client', () => {
  beforeEach(() => {
    mockInstances.splice(0);
  });

  test('initializes the client with the shared store', async () => {
    const store: OpenapiClientStore = {
      host: 'https://api.example.com',
      apiKey: 'key',
      apiTime: 1,
    };
    const client = createOpenapiClient(store);
    const [openapi] = mockInstances;

    expect(mockInstances).toHaveLength(1);
    expect(openapi.store).toBe(store);

    await client.init();
    expect(openapi.init).toHaveBeenCalledTimes(1);
  });

  test('ready proxy waits for initialization and exposes methods only', async () => {
    let resolveReady!: () => void;
    const ready = new Promise<void>((resolve) => {
      resolveReady = resolve;
    });
    const getHost = jest.fn(() => 'https://api.example.com');
    const proxy = createReadyOpenapiProxy({ getHost }, () => ready);
    const result = proxy.getHost();

    expect(getHost).not.toHaveBeenCalled();
    expect((proxy as any).then).toBeUndefined();
    resolveReady();
    await expect(result).resolves.toBe('https://api.example.com');
    await expect((proxy as any).store()).rejects.toThrow(
      'Unknown OpenAPI method: store'
    );
  });
});
