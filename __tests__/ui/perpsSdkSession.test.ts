import {
  applyPerpsSigner,
  destroyPerpsSDK,
  getPerpsSDK,
  initPerpsAgentAccount,
} from '@/ui/views/Perps/sdkManager';
import { KEYRING_CLASS } from '@/constant';

jest.mock('@/constant', () => ({
  KEYRING_CLASS: { PRIVATE_KEY: 'private-key', MNEMONIC: 'mnemonic' },
}));
jest.mock('@/constant/perps', () => ({ PERPS_AGENT_NAME: 'test-agent' }));
// Keep the real SDK and signer; replace only its HTTP transport.
jest.mock('@rabby-wallet/hyperliquid-sdk/dist/client/http-client', () => ({
  HttpClient: jest.fn().mockImplementation(() => ({
    info: jest
      .fn()
      .mockResolvedValue([{ universe: [{ name: 'BTC', szDecimals: 5 }] }]),
    exchange: jest.fn(),
  })),
}));

const account = {
  address: `0x${'aa'.repeat(20)}`,
  type: 'hardware',
  brandName: 'hardware',
};
const agentAddress = `0x${'bb'.repeat(20)}`;
const vault = `0x${'11'.repeat(32)}`;

describe('Perps SDK session', () => {
  afterEach(destroyPerpsSDK);

  test('clears the agent key even from retained SDK references', async () => {
    const sdk = getPerpsSDK();
    initPerpsAgentAccount(sdk, account.address, vault, agentAddress);
    expect(sdk.isHaveAgent).toBe(true);

    destroyPerpsSDK();

    expect(sdk.isHaveAgent).toBe(false);
    await expect(
      sdk.exchange!.updateLeverage({ coin: 'BTC', leverage: 2, isCross: true })
    ).rejects.toThrow('Agent private key is not set');
  });

  test('clears the self signer from retained SDK references', async () => {
    await applyPerpsSigner({ ...account, type: KEYRING_CLASS.PRIVATE_KEY }, {
      signTypedData: jest.fn(),
    } as any);
    const sdk = getPerpsSDK();
    expect(sdk.isHaveAgent).toBe(true);

    destroyPerpsSDK();

    expect(sdk.isHaveAgent).toBe(false);
  });

  test('rejects a stale login without changing the new session', () => {
    const oldSdk = getPerpsSDK();
    destroyPerpsSDK();
    const sdk = getPerpsSDK();
    initPerpsAgentAccount(sdk, account.address, vault, agentAddress);

    expect(() =>
      initPerpsAgentAccount(oldSdk, account.address, vault, agentAddress)
    ).toThrow('Perps session expired');
    expect(oldSdk.isHaveAgent).toBe(false);
    expect(getPerpsSDK()).toBe(sdk);
    expect(sdk.isHaveAgent).toBe(true);
  });

  test('rejects an agent response delivered after lock and unlock', async () => {
    let resolve!: (value: unknown) => void;
    const pending = applyPerpsSigner(account, {
      getOrCreatePerpsAgentWallet: () =>
        new Promise((done) => {
          resolve = done;
        }),
    } as any);
    destroyPerpsSDK();
    const sdk = getPerpsSDK();

    resolve({ vault, agentAddress, isCreate: false });

    await expect(pending).rejects.toThrow('Perps session expired');
    expect(getPerpsSDK()).toBe(sdk);
    expect(sdk.isHaveAgent).toBe(false);
  });
});
