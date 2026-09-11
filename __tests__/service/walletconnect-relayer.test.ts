import { EventEmitter } from 'events';

jest.mock('@walletconnect/sign-client', () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
  },
}));

const signClient = jest.requireMock('@walletconnect/sign-client').default as {
  init: jest.Mock;
};
const { V2SDK } = require('@rabby-wallet/eth-walletconnect-keyring/dist/v2sdk');

const createClient = () => {
  const client = new EventEmitter() as EventEmitter & {
    core: { relayer: EventEmitter };
    session: { keys: string[] };
  };
  client.core = { relayer: new EventEmitter() };
  client.session = { keys: [] };
  return client;
};

const createSDK = () => {
  const sdk = Object.create(V2SDK.prototype) as any;
  sdk.options = { projectId: 'test', clientMeta: {} };
  sdk.cached = { getAllTopics: () => [] };
  sdk._closeConnector = jest.fn();
  sdk.onAfterSessionCreated = jest.fn();
  return sdk;
};

describe('WalletConnect relayer error listener', () => {
  beforeEach(() => {
    signClient.init.mockReset();
  });

  it('initializes when the relayer does not expose provider', async () => {
    const client = createClient();
    signClient.init.mockResolvedValue(client);

    expect((client.core.relayer as any).provider).toBeUndefined();
    await expect(createSDK().initSDK()).resolves.toBeUndefined();
  });

  it('re-initializes on a relayer JWT error', async () => {
    const firstClient = createClient();
    const secondClient = createClient();
    signClient.init
      .mockResolvedValueOnce(firstClient)
      .mockResolvedValueOnce(secondClient);
    const sdk = createSDK();

    await sdk.initSDK();
    firstClient.core.relayer.emit('error', new Error('3000 JWT expired'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(signClient.init).toHaveBeenCalledTimes(2);
    expect(sdk.onAfterSessionCreated).toHaveBeenCalledWith('');
  });
});
