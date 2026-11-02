import * as ctxModule from '@/ui/component/MiniSignV2/domain/ctx';
import { signatureService } from '@/ui/component/MiniSignV2/services';
import { SignatureManager } from '@/ui/component/MiniSignV2/state/SignatureManager';

// The real services import half the UI (SignTx, CSS); the manager only needs
// their contract here: prepare/openUI return a ctx keyed by the fingerprint.
jest.mock('@/ui/component/MiniSignV2/services', () => {
  const { buildFingerprint } = jest.requireActual(
    '@/ui/component/MiniSignV2/domain/ctx'
  );
  const ctxFor = ({ txs, fingerprint }: any) => ({
    fingerprint: fingerprint ?? buildFingerprint(txs),
    open: false,
    mode: 'ui',
    txs,
    chainId: 1,
    txsCalc: [],
    gasList: [],
  });
  return {
    signatureService: {
      fingerprint: (txs: any) =>
        // through the module object at call time, so the spy below sees it
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('@/ui/component/MiniSignV2/domain/ctx').buildFingerprint(txs),
      prepare: jest.fn(async (params: any) => ctxFor(params)),
      openUI: jest.fn(async (params: any) => ({
        ...((await params.prepared) || ctxFor(params)),
        open: true,
      })),
      send: jest.fn(),
    },
    SignatureSteps: {},
  };
});
jest.mock('@/ui/utils', () => ({
  hasConnectedLedgerDevice: jest.fn(async () => true),
}));
// @/constant <-> @/utils/chain import cycle; other UI tests stub it the same way.
jest.mock('@/utils/chain', () => {
  const chain = { id: 1, serverId: 'eth', enum: 'ETH', isTestnet: false };
  const known: Record<string, unknown> = {
    findChain: () => chain,
    findChainByEnum: () => chain,
    getChainList: () => [],
  };
  return new Proxy(known, {
    get: (target, key: string) =>
      key in target ? target[key] : () => undefined,
  });
});

const from = '0x7e5f4552091a69125d5dfcb7b8c2659029395bdf';
const tx = {
  chainId: 1,
  from,
  to: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
  value: '0x0',
  data: `0xa9059cbb${'ab'.repeat(64)}`,
} as any;
const request = {
  txs: [tx],
  config: {
    account: { address: from, type: 'Simple Key Pair', brandName: '' },
  },
} as any;
const wallet = {} as any;

describe('MiniSignV2 builds the fingerprint once per entry', () => {
  let manager: SignatureManager;
  let build: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    build = jest.spyOn(ctxModule, 'buildFingerprint');
    manager = new SignatureManager();
  });

  afterEach(() => build.mockRestore());

  test('prefetch builds once and hands that fingerprint to prepare', async () => {
    await manager.prefetch(request, wallet);
    expect(build).toHaveBeenCalledTimes(1);
    const passed = (signatureService.prepare as jest.Mock).mock.calls[0][0]
      .fingerprint;
    expect(passed).toBe(ctxModule.buildFingerprint(request.txs));
    expect(manager.getState().ctx?.fingerprint).toBe(passed);
  });

  test('openUI after prefetch builds once and reuses the prepared ctx', async () => {
    await manager.prefetch(request, wallet);
    build.mockClear();
    await manager.openUI(request, wallet);
    expect(build).toHaveBeenCalledTimes(1);
    expect(signatureService.prepare).toHaveBeenCalledTimes(1);
    const openArgs = (signatureService.openUI as jest.Mock).mock.calls[0][0];
    expect(openArgs.fingerprint).toBe(manager.getState().ctx?.fingerprint);
  });

  test('openUI without prefetch builds once', async () => {
    await manager.openUI(request, wallet);
    expect(build).toHaveBeenCalledTimes(1);
  });

  test('openDirect after prefetch builds once and does not re-prepare', async () => {
    await manager.prefetch(request, wallet);
    build.mockClear();
    await manager.openDirect(request, wallet).catch(() => undefined);
    expect(build).toHaveBeenCalledTimes(1);
    expect(signatureService.prepare).toHaveBeenCalledTimes(1);
  });

  test('different txs still get a different fingerprint and a fresh prepare', async () => {
    await manager.prefetch(request, wallet);
    const other = {
      ...request,
      txs: [{ ...tx, data: `0xa9059cbb${'cd'.repeat(64)}` }],
    };
    await manager.openDirect(other, wallet).catch(() => undefined);
    expect(signatureService.prepare).toHaveBeenCalledTimes(2);
    expect(manager.getState().fingerprint).toBe(
      ctxModule.buildFingerprint(other.txs)
    );
  });
});
