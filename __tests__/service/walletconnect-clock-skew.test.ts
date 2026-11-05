import { EventEmitter } from 'events';

const mockSignClientInit = jest.fn();

jest.mock('@walletconnect/sign-client', () => ({
  __esModule: true,
  default: { init: (...args: unknown[]) => mockSignClientInit(...args) },
}));

jest.mock('@walletconnect/keyvaluestorage', () => ({
  __esModule: true,
  default: class {
    getItem = async () => undefined;
    setItem = async () => undefined;
  },
}));

// V1 and these V2 utilities are outside the relay listener under test.
jest.mock('@rabby-wallet/eth-walletconnect-keyring/dist/v1sdk', () => ({
  V1SDK: class extends require('events').EventEmitter {},
}));
jest.mock('@walletconnect/utils', () => ({}));

const {
  WalletConnectKeyring,
} = require('@rabby-wallet/eth-walletconnect-keyring');

const CLOCK_ERROR_MESSAGE =
  'WebSocket connection closed abnormally with code: 3000 ' +
  '(JWT validation error: JWT Token is not yet valid: basic.iat: 1791353462, ' +
  'now + time_leeway: 1791353252, time_leeway: 120)';

const flushMicrotasks = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};

const createClient = () =>
  Object.assign(new EventEmitter(), {
    session: { keys: [] },
    core: { relayer: new EventEmitter() },
  });

describe('WalletConnect relay clock skew recovery', () => {
  beforeEach(() => {
    mockSignClientInit.mockReset();
    mockSignClientInit.mockImplementation(async () => createClient());
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const createKeyring = async () => {
    // This uses the installed dist entry, including the patch-package relay handler.
    const keyring = new WalletConnectKeyring({
      projectId: 'offline-test',
      clientMeta: {
        name: 'Rabby test',
        description: 'Offline relay listener test',
        url: 'https://rabby.invalid',
        icons: [],
      },
      accounts: [],
    });
    const onTransportError = jest.fn();
    keyring.on('transport_error', onTransportError);
    await flushMicrotasks();
    expect(mockSignClientInit).toHaveBeenCalledTimes(1);
    const sdk = keyring.v2SDK;
    const client = sdk.client;
    const onAfterSessionCreated = jest.fn();
    sdk.onAfterSessionCreated = onAfterSessionCreated;
    return { keyring, sdk, client, onTransportError, onAfterSessionCreated };
  };

  it('forwards the original clock error through the keyring without replacing the client', async () => {
    const {
      sdk,
      client,
      onTransportError,
      onAfterSessionCreated,
    } = await createKeyring();
    const error = new Error(CLOCK_ERROR_MESSAGE);

    client.core.relayer.emit('relayer_error', error);
    await flushMicrotasks();

    expect(onTransportError).toHaveBeenCalledTimes(1);
    expect(onTransportError).toHaveBeenCalledWith(error);
    expect(mockSignClientInit).toHaveBeenCalledTimes(1);
    expect(sdk.client).toBe(client);
    expect(onAfterSessionCreated).not.toHaveBeenCalled();
  });

  it('keeps later clock errors observable without starting another SDK initialization', async () => {
    const {
      sdk,
      client,
      onTransportError,
      onAfterSessionCreated,
    } = await createKeyring();
    const errors = [
      new Error(CLOCK_ERROR_MESSAGE),
      new Error(CLOCK_ERROR_MESSAGE),
    ];

    for (const error of errors) {
      client.core.relayer.emit('relayer_error', error);
      await flushMicrotasks();
    }

    expect(onTransportError.mock.calls).toEqual(errors.map((error) => [error]));
    expect(mockSignClientInit).toHaveBeenCalledTimes(1);
    expect(sdk.client).toBe(client);
    expect(onAfterSessionCreated).not.toHaveBeenCalled();
  });

  it('allows an explicit connector retry through the existing client after a clock error', async () => {
    const { keyring, sdk, client, onTransportError } = await createKeyring();
    const error = new Error(CLOCK_ERROR_MESSAGE);
    const uri = 'wc:offline-retry@2';
    const onInited = jest.fn();
    keyring.on('inited', onInited);
    client.connect = jest
      .fn()
      .mockImplementationOnce(async () => {
        client.core.relayer.emit('relayer_error', error);
        throw error;
      })
      .mockResolvedValue({
        uri,
        // Creating a QR request does not grant a session or trigger signing.
        approval: () => new Promise(() => undefined),
      });

    await expect(keyring.initConnector('MetaMask', [1])).rejects.toBe(error);
    expect(onTransportError).toHaveBeenCalledWith(error);
    expect(onInited).not.toHaveBeenCalled();
    expect(mockSignClientInit).toHaveBeenCalledTimes(1);

    await expect(keyring.initConnector('MetaMask', [1])).resolves.toEqual({
      uri,
    });

    expect(client.connect).toHaveBeenCalledTimes(2);
    expect(onInited).toHaveBeenCalledTimes(1);
    expect(onInited).toHaveBeenCalledWith(uri);
    expect(mockSignClientInit).toHaveBeenCalledTimes(1);
    expect(sdk.client).toBe(client);
  });

  it.each([
    'WebSocket connection closed abnormally with code: 3000 (JWT validation error: JWT Token has expired)',
    'WebSocket connection closed abnormally with code: 3000 (Country not supported)',
  ])(
    'preserves existing recovery for other relay 3000 errors: %s',
    async (message) => {
      const {
        sdk,
        client,
        onTransportError,
        onAfterSessionCreated,
      } = await createKeyring();

      client.core.relayer.emit('relayer_error', new Error(message));
      await flushMicrotasks();

      expect(mockSignClientInit).toHaveBeenCalledTimes(2);
      expect(sdk.client).not.toBe(client);
      expect(onAfterSessionCreated).toHaveBeenCalledTimes(1);
      expect(onAfterSessionCreated).toHaveBeenCalledWith('');
      expect(onTransportError).not.toHaveBeenCalled();
    }
  );

  it('does not treat a non-3000 error as clock skew or lose the following clock error', async () => {
    const { client, onTransportError } = await createKeyring();

    client.core.relayer.emit(
      'relayer_error',
      new Error('JWT Token is not yet valid')
    );
    await flushMicrotasks();
    expect(onTransportError).not.toHaveBeenCalled();
    expect(mockSignClientInit).toHaveBeenCalledTimes(1);

    const clockError = new Error(CLOCK_ERROR_MESSAGE);
    client.core.relayer.emit('relayer_error', clockError);
    await flushMicrotasks();

    expect(onTransportError).toHaveBeenCalledWith(clockError);
    expect(mockSignClientInit).toHaveBeenCalledTimes(1);
  });
});
