import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runInNewContext } from 'vm';
import * as ts from 'typescript';
import { checkIsPendingTxGroup, getPendingGroupCategory } from '@/utils/tx';

// 提取真实方法，避免启动全部后台服务。
const extract = (file: string, names: string[]) => {
  const source = ts.createSourceFile(
    file,
    readFileSync(resolve(file), 'utf8'),
    ts.ScriptTarget.Latest,
    true
  );
  const members: Record<string, string> = {};
  const statements: Record<string, string> = {};
  const nameOf = (node: { name?: ts.Node }) => node.name?.getText(source) || '';
  const visit = (node: ts.Node) => {
    if (
      (ts.isMethodDeclaration(node) || ts.isPropertyDeclaration(node)) &&
      names.includes(nameOf(node))
    ) {
      members[nameOf(node)] = node.getText(source);
    }
    if (ts.isVariableStatement(node) && node.parent === source) {
      const name = nameOf(node.declarationList.declarations[0]);
      if (names.includes(name)) {
        statements[name] = node.getText(source);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  names.forEach((name) => {
    if (!members[name] && !statements[name]) throw new Error(`Missing ${name}`);
  });
  return {
    members: Object.values(members).join('\n'),
    statements: Object.values(statements).join('\n'),
  };
};
const evaluate = (code: string, context: Record<string, unknown>) =>
  runInNewContext(
    ts.transpileModule(code, {
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
    }).outputText,
    context
  );

const ADDRESS = '0xAbC0000000000000000000000000000000000001';
const FROM = ADDRESS.toLowerCase();
const CHAIN_ID = 56;
const NONCE = 192;
const START = 1_700_000_000_000;
const MINUTE = 60 * 1000;

const history = extract('src/background/service/transactionHistory.ts', [
  'NONCE_FALLBACK_MIN_PENDING_MS',
  'ON_CHAIN_NONCE_CACHE_MS',
  'NONCE_TAKEN_CONFIRM_MS',
  'formatRpcTxReceipt',
  '_onChainNonceCache',
  '_nonceTakenFirstSeenAt',
  '_requestNonceFallbackRpc',
  '_getOnChainNonce',
  'findTxReceiptByNonce',
  'getRpcTxReceipt',
  'reloadTx',
]);

const receiptOf = (hash: string, status = '0x1') => ({
  transactionHash: hash,
  blockNumber: '0x7ead8d7',
  status,
  gasUsed: '0xb6f7',
  effectiveGasPrice: '0x2faf080',
});

const createHistoryService = ({
  hashes = ['0xlocal'],
  onChainNonce = '0xc4',
  backendReceipts = {},
  customRpc,
  chain = { id: CHAIN_ID, serverId: 'bsc', enum: 'BSC', isTestnet: false },
}: {
  hashes?: string[];
  onChainNonce?: string;
  backendReceipts?: Record<string, unknown>;
  // 传入即视为该链启用了自定义 RPC
  customRpc?: (method: string, params: any[]) => unknown;
  chain?: { id: number; serverId: string; enum: string; isTestnet: boolean };
} = {}) => {
  const clock = { now: START + 2 * MINUTE };
  const group = {
    chainId: CHAIN_ID,
    nonce: NONCE,
    isPending: true,
    isFailed: false,
    createdAt: START,
    txs: hashes.map((hash) => ({
      hash,
      rawTx: { gasPrice: '0x2faf080' },
      createdAt: START,
      isCompleted: false,
      failed: false,
    })),
  };
  const store = {
    transactions: { [FROM]: { [`${CHAIN_ID}-${NONCE}`]: group } },
  };
  const ethRpc = jest.fn(
    async (
      _chain: string,
      { method, params }: { method: string; params: any }
    ) =>
      method === 'eth_getTransactionCount'
        ? onChainNonce
        : backendReceipts[params[0]] ?? null
  );
  const defaultRpc = jest.fn(async () => null);
  const requestCustomRPC = jest.fn(
    async (_chain: string, method: string, params: any[]) =>
      customRpc?.(method, params)
  );
  const eventBus = { emit: jest.fn() };
  const watcher = { removeLocalPendingTx: jest.fn() };
  const broadcastWatcher = { removeLocalPendingTx: jest.fn() };
  const service = evaluate(
    `${history.statements}
    new (class { store = store; ${history.members} })()`,
    {
      store,
      Date: { now: () => clock.now },
      setTimeout: jest.fn(),
      openapiService: { ethRpc },
      RPCService: {
        requestDefaultRPC: defaultRpc,
        hasCustomRPC: () => !!customRpc,
        requestCustomRPC,
      },
      customTestnetService: {},
      findChain: () => chain,
      isTempoChain: (serverId: string) => serverId === 'tempo',
      checkIsPendingTxGroup,
      getPendingGroupCategory,
      INTERNAL_REQUEST_ORIGIN: 'chrome-extension://rabby',
      eventBus,
      EVENTS: { broadcastToUI: 'broadcast', RELOAD_TX: 'reload' },
      transactionWatchService: watcher,
      transactionBroadcastWatchService: broadcastWatcher,
    }
  );
  service.removeLocalPendingTx = jest.fn();
  service.updateSingleTx = jest.fn();
  service.completeTx = jest.fn();
  service.completeRecentTxHistory = jest.fn();
  const find = () =>
    service.findTxReceiptByNonce({
      address: ADDRESS,
      chainId: CHAIN_ID,
      nonce: NONCE,
    });
  const backendMethods = () => ethRpc.mock.calls.map(([, req]) => req.method);
  return {
    service,
    group,
    clock,
    ethRpc,
    defaultRpc,
    requestCustomRPC,
    eventBus,
    watcher,
    broadcastWatcher,
    find,
    backendMethods,
  };
};

describe('findTxReceiptByNonce', () => {
  it('reads the receipt through the backend once the nonce is spent', async () => {
    const receipt = receiptOf('0xlocal');
    const { find, ethRpc, service } = createHistoryService({
      backendReceipts: { '0xlocal': receipt },
    });

    await expect(find()).resolves.toBe(receipt);
    expect(ethRpc).toHaveBeenCalledWith(
      'bsc',
      expect.objectContaining({
        method: 'eth_getTransactionCount',
        params: [FROM, 'latest'],
      })
    );
    expect(service.removeLocalPendingTx).not.toHaveBeenCalled();
  });

  it('asks the custom RPC instead of the backend when the chain has one', async () => {
    const receipt = receiptOf('0xlocal');
    const { find, ethRpc, requestCustomRPC } = createHistoryService({
      customRpc: (method) =>
        method === 'eth_getTransactionCount' ? '0xc4' : receipt,
    });

    await expect(find()).resolves.toBe(receipt);
    expect(requestCustomRPC.mock.calls).toEqual([
      ['BSC', 'eth_getTransactionCount', [FROM, 'latest']],
      ['BSC', 'eth_getTransactionReceipt', ['0xlocal']],
    ]);
    expect(ethRpc).not.toHaveBeenCalled();
  });

  it('does not take the response a custom RPC returns for a null result as a receipt', async () => {
    const { find } = createHistoryService({
      customRpc: (method) =>
        method === 'eth_getTransactionCount'
          ? '0xc4'
          : { jsonrpc: '2.0', id: 1, result: null },
    });

    await expect(find()).resolves.toBeUndefined();
  });

  it('finds whichever tx of the group is on chain', async () => {
    const receipt = receiptOf('0xoriginal');
    const { find } = createHistoryService({
      hashes: ['0xoriginal', '0xspeedup'],
      backendReceipts: { '0xoriginal': receipt },
    });

    await expect(find()).resolves.toBe(receipt);
  });

  it('keeps the tx pending while the on-chain nonce has not passed it', async () => {
    const { find, backendMethods, service } = createHistoryService({
      onChainNonce: '0xc0',
    });

    await expect(find()).resolves.toBeUndefined();
    expect(backendMethods()).toEqual(['eth_getTransactionCount']);
    expect(service.removeLocalPendingTx).not.toHaveBeenCalled();
  });

  it('makes no backend request for a tx submitted less than a minute ago', async () => {
    const { find, clock, ethRpc } = createHistoryService();
    clock.now = START + MINUTE - 1;

    await expect(find()).resolves.toBeUndefined();
    expect(ethRpc).not.toHaveBeenCalled();
  });

  it.each([
    [
      'a testnet',
      {
        id: CHAIN_ID,
        serverId: 'custom_56',
        enum: 'CUSTOM_56',
        isTestnet: true,
      },
    ],
    [
      'Tempo',
      { id: CHAIN_ID, serverId: 'tempo', enum: 'TEMPO', isTestnet: false },
    ],
  ])('is skipped on %s', async (_name, chain) => {
    const { find, ethRpc } = createHistoryService({ chain });

    await expect(find()).resolves.toBeUndefined();
    expect(ethRpc).not.toHaveBeenCalled();
  });

  it('is skipped for a group that is no longer pending', async () => {
    const { find, group, ethRpc } = createHistoryService();
    group.isPending = false;

    await expect(find()).resolves.toBeUndefined();
    expect(ethRpc).not.toHaveBeenCalled();
  });

  it('reuses the on-chain nonce for ten seconds', async () => {
    const { find, clock, backendMethods } = createHistoryService({
      onChainNonce: '0xc0',
    });
    const nonceRequests = () =>
      backendMethods().filter((m) => m === 'eth_getTransactionCount').length;

    await find();
    clock.now += 9 * 1000;
    await find();
    expect(nonceRequests()).toBe(1);

    clock.now += 2 * 1000;
    await find();
    expect(nonceRequests()).toBe(2);
  });

  it('removes the local pending tx only after the nonce is seen taken twice, 30s apart', async () => {
    const {
      find,
      clock,
      service,
      watcher,
      broadcastWatcher,
      eventBus,
    } = createHistoryService();
    const target = { address: ADDRESS, chainId: CHAIN_ID, nonce: NONCE };

    await expect(find()).resolves.toBeUndefined();
    clock.now += 29 * 1000;
    await expect(find()).resolves.toBeUndefined();
    expect(service.removeLocalPendingTx).not.toHaveBeenCalled();

    clock.now += 1000;
    await expect(find()).resolves.toBeUndefined();
    expect(service.removeLocalPendingTx).toHaveBeenCalledWith(target);
    expect(watcher.removeLocalPendingTx).toHaveBeenCalledWith(target);
    expect(broadcastWatcher.removeLocalPendingTx).toHaveBeenCalledWith(target);
    expect(eventBus.emit).toHaveBeenCalledWith('broadcast', {
      method: 'reload',
      params: { addressList: [ADDRESS] },
    });
  });

  it('starts the 30s over when a receipt shows up in between', async () => {
    const backendReceipts: Record<string, unknown> = {};
    const { find, clock, service } = createHistoryService({ backendReceipts });

    await find();
    backendReceipts['0xlocal'] = receiptOf('0xlocal');
    clock.now += 31 * 1000;
    await expect(find()).resolves.toBe(backendReceipts['0xlocal']);

    delete backendReceipts['0xlocal'];
    clock.now += 31 * 1000;
    await expect(find()).resolves.toBeUndefined();
    expect(service.removeLocalPendingTx).not.toHaveBeenCalled();
  });

  it('leaves the tx pending when the backend request fails', async () => {
    const { find, ethRpc, service } = createHistoryService();
    ethRpc.mockRejectedValue(new Error('network'));

    await expect(find()).rejects.toThrow('network');
    expect(service.removeLocalPendingTx).not.toHaveBeenCalled();
  });
});

describe('reloadTx', () => {
  const reload = (service: any) =>
    service.reloadTx(
      { address: ADDRESS, chainId: CHAIN_ID, nonce: NONCE },
      false
    );

  it('completes a tx the default RPC cannot confirm from the backend receipt', async () => {
    const { service, defaultRpc } = createHistoryService({
      backendReceipts: { '0xlocal': receiptOf('0xlocal') },
    });
    defaultRpc.mockRejectedValue(new Error('unreachable'));

    await expect(reload(service)).resolves.toBe(0xb6f7);
    expect(service.completeTx).toHaveBeenCalledWith(
      expect.objectContaining({
        address: ADDRESS,
        chainId: CHAIN_ID,
        nonce: NONCE,
        hash: '0xlocal',
        success: true,
      })
    );
  });

  it('marks the tx failed when the backend receipt is a revert', async () => {
    const { service } = createHistoryService({
      backendReceipts: { '0xlocal': receiptOf('0xlocal', '0x0') },
    });

    await reload(service);
    expect(service.completeTx).toHaveBeenCalledWith(
      expect.objectContaining({ hash: '0xlocal', success: false })
    );
  });

  it('does not ask the backend when the default RPC has the receipt', async () => {
    const { service, defaultRpc, ethRpc } = createHistoryService();
    defaultRpc.mockResolvedValue(receiptOf('0xlocal') as any);

    await reload(service);
    expect(ethRpc).not.toHaveBeenCalled();
    expect(service.completeTx).toHaveBeenCalledWith(
      expect.objectContaining({ hash: '0xlocal', success: true })
    );
  });

  it('leaves the tx pending while its nonce is still unused', async () => {
    const { service } = createHistoryService({ onChainNonce: '0xc0' });

    await expect(reload(service)).resolves.toBeUndefined();
    expect(service.completeTx).not.toHaveBeenCalled();
  });
});

describe('transactionWatcher', () => {
  const watcherSource = extract(
    'src/background/service/transactionWatcher.ts',
    ['checkStatus', 'removeLocalPendingTx']
  );
  const ID = `${ADDRESS}_0xc0_BSC`;
  const createWatcher = ({
    defaultReceipt = null,
    fallbackReceipt,
  }: {
    defaultReceipt?: unknown;
    fallbackReceipt?: unknown;
  } = {}) => {
    const store = {
      pendingTx: {
        [ID]: { nonce: '0xc0', hash: '0xlocal', chain: 'BSC' },
        [`${ADDRESS}_0xc1_BSC`]: {
          nonce: '0xc1',
          hash: '0xnext',
          chain: 'BSC',
        },
        [`${ADDRESS}_0xc0_ETH`]: { nonce: '0xc0', hash: '0xeth', chain: 'ETH' },
      } as Record<string, unknown>,
    };
    const findTxReceiptByNonce = jest.fn(async () => fallbackReceipt);
    const chains = {
      BSC: { id: 56, serverId: 'bsc', isTestnet: false },
      ETH: { id: 1, serverId: 'eth', isTestnet: false },
    };
    const watcher = evaluate(
      `new (class { store = store; ${watcherSource.members} })()`,
      {
        store,
        findChain: ({ enum: chain }: { enum: 'BSC' | 'ETH' }) => chains[chain],
        findChainByEnum: (chain: 'BSC' | 'ETH') => chains[chain],
        isSameAddress: (a: string, b: string) =>
          a.toLowerCase() === b.toLowerCase(),
        customTestnetService: {},
        RPCService: { requestDefaultRPC: jest.fn(async () => defaultReceipt) },
        transactionHistoryService: { findTxReceiptByNonce },
      }
    );
    return { watcher, store, findTxReceiptByNonce };
  };

  it('falls back to the nonce check when the default RPC has no receipt', async () => {
    const receipt = receiptOf('0xlocal');
    const { watcher, findTxReceiptByNonce } = createWatcher({
      fallbackReceipt: receipt,
    });

    await expect(watcher.checkStatus(ID)).resolves.toBe(receipt);
    expect(findTxReceiptByNonce).toHaveBeenCalledWith({
      address: ADDRESS,
      chainId: 56,
      nonce: NONCE,
    });
  });

  it('skips the nonce check when the default RPC has the receipt', async () => {
    const receipt = receiptOf('0xlocal');
    const { watcher, findTxReceiptByNonce } = createWatcher({
      defaultReceipt: receipt,
    });

    await expect(watcher.checkStatus(ID)).resolves.toBe(receipt);
    expect(findTxReceiptByNonce).not.toHaveBeenCalled();
  });

  it('keeps polling when the nonce check fails', async () => {
    const { watcher, findTxReceiptByNonce } = createWatcher();
    findTxReceiptByNonce.mockRejectedValue(new Error('network'));

    await expect(watcher.checkStatus(ID)).resolves.toBeNull();
  });

  it('stops watching only the removed nonce on that chain', () => {
    const { watcher, store } = createWatcher();

    watcher.removeLocalPendingTx({
      address: ADDRESS.toLowerCase(),
      chainId: 56,
      nonce: NONCE,
    });
    expect(Object.keys(store.pendingTx)).toEqual([
      `${ADDRESS}_0xc1_BSC`,
      `${ADDRESS}_0xc0_ETH`,
    ]);
  });
});
