const getGasAccountInfoV2 = jest.fn();

let hasSession = false;
let discoveryState: any = {};

jest.mock('@/constant', () => ({
  KEYRING_TYPE: { SimpleKeyring: 'Simple Key Pair', HdKeyring: 'HD Key Tree' },
  KEYRING_CLASS: {
    HARDWARE: { LEDGER: 'Ledger Hardware', ONEKEY: 'Onekey Hardware' },
  },
}));

jest.mock('background/service', () => ({
  openapiService: {
    getGasAccountInfoV2: (...args: any[]) => getGasAccountInfoV2(...args),
  },
  gasAccountService: {
    getGasAccountSig: () => ({ accountId: hasSession ? '0xAAA' : undefined }),
    hasGasAccountSession: () => hasSession,
    getGasAccountData: () => discoveryState,
    setDiscoveryState: (payload: any) => {
      discoveryState = payload;
    },
  },
}));

import { discoverGasAccountRuntimeState } from 'background/utils/gasAccountDiscovery';

const ADDRESS = '0xf08c90c7f470b640a21dd9b3744eca3d1d16a044';

const account = (type: string) => ({
  address: ADDRESS,
  type,
  brandName: type,
});

const idsRequested = () => getGasAccountInfoV2.mock.calls.map((c) => c[0].id);

beforeEach(() => {
  getGasAccountInfoV2.mockReset();
  getGasAccountInfoV2.mockResolvedValue({
    account: { balance: 1, no_register: false },
  });
  hasSession = false;
  discoveryState = {};
});

describe('discoverGasAccountRuntimeState', () => {
  it('queries one address once even when it is imported under several keyrings', async () => {
    const sameAddressAcrossKeyrings = [
      account('HD Key Tree'),
      account('Simple Key Pair'),
      account('Ledger Hardware'),
    ];

    // force, so the module-level discovery cache cannot carry state between tests
    await discoverGasAccountRuntimeState(sameAddressAcrossKeyrings, {
      force: true,
    });

    expect(idsRequested()).toEqual([ADDRESS]);
    // every keyring entry still shows up in the discovery result
    expect(discoveryState.accountsWithGasAccountBalance).toHaveLength(3);
  });

  it('still queries each distinct address', async () => {
    const OTHER = '0x1111111111111111111111111111111111111111';

    await discoverGasAccountRuntimeState(
      [account('HD Key Tree'), { ...account('HD Key Tree'), address: OTHER }],
      { force: true }
    );

    expect(idsRequested().sort()).toEqual([OTHER, ADDRESS].sort());
  });
});
