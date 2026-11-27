import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runInNewContext } from 'vm';
import * as ts from 'typescript';
import { cached } from '@/background/utils/cache';
import { normalizeBalanceCacheData } from '@/db/schema/balance';
import {
  extractValidAppChainBalance,
  extractValidEvmBalance,
  isMissingChainError,
  mergeBalanceWithFallback,
  PartialBalanceError,
} from '@/background/controller/walletUtils/balanceFallback';

// 仅抽取余额相关方法测试，避免初始化无关钱包服务
const file = resolve(__dirname, '../../src/background/controller/wallet.ts');
const source = ts.createSourceFile(
  file,
  readFileSync(file, 'utf8'),
  ts.ScriptTarget.Latest,
  true
);
const walletClass = source.statements
  .filter(ts.isClassDeclaration)
  .find((node) => node.name?.text === 'WalletController')!;
const methods = walletClass.members.filter((node) =>
  [
    'persistBalanceCache',
    'getTotalBalanceCached',
    'getInMemoryAddressBalance',
    'getAddressCacheBalance',
    'isInMemoryAddressBalanceExpired',
  ].includes(node.name?.getText(source) || '')
);
const fixture = ts.transpile(
  `new (class { ${methods.map((node) => node.getText(source)).join('\n')} })()`,
  { target: ts.ScriptTarget.ES2022 }
);

const app = {
  id: 'app',
  portfolio_item_list: [{ stats: { net_usd_value: 25 } }],
};
const createWallet = () => {
  const getTotalBalance = jest
    .fn()
    .mockResolvedValue({ total_usd_value: 10, chain_list: [] });
  const getAppChainList = jest.fn();
  const balances = new Map<
    string,
    ReturnType<typeof normalizeBalanceCacheData>
  >();
  const putBalance = jest.fn((address, value) => balances.set(address, value));
  const updateBalanceAboutCache = jest.fn();
  const setUpdatedAt = jest.fn();
  const wallet = runInNewContext(fixture, {
    cached,
    normalizeBalanceCacheData,
    extractValidAppChainBalance,
    extractValidEvmBalance,
    isMissingChainError,
    mergeBalanceWithFallback,
    PartialBalanceError,
    Date,
    BALANCE_LOADING_CONFS: { TIMEOUT: 1000 },
    BALANCE_SYNC_SCENE: 'balance',
    keyringService: { getAllAdresses: async () => [] },
    openapiService: { getTotalBalance, getAppChainList },
    preferenceService: {
      updateBalanceAboutCache,
      getBalanceAboutCacheByAddress: () => null,
    },
    balanceDbService: {
      putBalance,
      queryBalance: (address) => balances.get(address),
    },
    syncDbService: { setUpdatedAt },
  });
  return {
    wallet,
    getAppChainList,
    getTotalBalance,
    putBalance,
    updateBalanceAboutCache,
    setUpdatedAt,
  };
};

it.each([
  { apps: [app], error_apps: [{ id: 'missing' }] },
  { apps: [], error_apps: [{ id: 'missing' }] },
  { error_apps: [] },
  new Error('network error'),
])('AppChain failure keeps its cache while EVM updates %#', async (partial) => {
  jest.useFakeTimers();
  try {
    const {
      wallet,
      getAppChainList,
      getTotalBalance,
      setUpdatedAt,
    } = createWallet();
    getAppChainList.mockResolvedValueOnce({ apps: [app], error_apps: [] });
    await expect(
      wallet.getInMemoryAddressBalance('0xAb')
    ).resolves.toMatchObject({ total_usd_value: 35, appChainIds: ['app'] });

    jest.advanceTimersByTime(1001);
    getTotalBalance.mockResolvedValue({ total_usd_value: 7, chain_list: [] });
    if (partial instanceof Error)
      getAppChainList.mockRejectedValueOnce(partial);
    else getAppChainList.mockResolvedValueOnce(partial);
    await expect(
      wallet.getInMemoryAddressBalance('0xAB')
    ).resolves.toMatchObject({
      total_usd_value: 32,
      evmUsdValue: 7,
      appChainUsdValue: 25,
      appChainIds: ['app'],
    });
    expect(wallet.isInMemoryAddressBalanceExpired('0xab')).toBe(true);
    expect(setUpdatedAt).toHaveBeenCalledTimes(1);

    // 明确返回空数组时应清零 AppChain 余额
    getAppChainList.mockResolvedValueOnce({ apps: [], error_apps: [] });
    await expect(
      wallet.getInMemoryAddressBalance('0xAb')
    ).resolves.toMatchObject({
      total_usd_value: 7,
      evmUsdValue: 7,
      appChainUsdValue: 0,
      appChainIds: [],
    });
    expect(setUpdatedAt).toHaveBeenCalledTimes(2);
    expect(wallet.isInMemoryAddressBalanceExpired('0xab')).toBe(false);
  } finally {
    jest.useRealTimers();
  }
});

it('clears EVM on an explicit zero while AppChain fails', async () => {
  jest.useFakeTimers();
  try {
    const {
      wallet,
      getAppChainList,
      getTotalBalance,
      setUpdatedAt,
    } = createWallet();
    getAppChainList.mockResolvedValueOnce({ apps: [app], error_apps: [] });
    await wallet.getInMemoryAddressBalance('0xab');

    jest.advanceTimersByTime(1001);
    getTotalBalance.mockResolvedValue({ total_usd_value: 0, chain_list: [] });
    getAppChainList.mockRejectedValueOnce(new Error('network error'));
    await expect(
      wallet.getInMemoryAddressBalance('0xab')
    ).resolves.toMatchObject({
      total_usd_value: 25,
      evmUsdValue: 0,
      appChainUsdValue: 25,
      appChainIds: ['app'],
    });
    expect(wallet.isInMemoryAddressBalanceExpired('0xab')).toBe(true);
    expect(setUpdatedAt).toHaveBeenCalledTimes(1);
  } finally {
    jest.useRealTimers();
  }
});

it('EVM failure keeps its cache while AppChain updates', async () => {
  jest.useFakeTimers();
  try {
    const {
      wallet,
      getAppChainList,
      getTotalBalance,
      setUpdatedAt,
    } = createWallet();
    const chain_list = [{ id: 'eth', usd_value: 10 }];
    getTotalBalance.mockResolvedValueOnce({ total_usd_value: 10, chain_list });
    getAppChainList.mockResolvedValueOnce({ apps: [app], error_apps: [] });
    await wallet.getInMemoryAddressBalance('0xab');

    jest.advanceTimersByTime(1001);
    getTotalBalance.mockRejectedValue(new Error('evm error'));
    const app2 = {
      id: 'app2',
      portfolio_item_list: [{ stats: { net_usd_value: 40 } }],
    };
    getAppChainList.mockResolvedValueOnce({ apps: [app2], error_apps: [] });
    await expect(
      wallet.getInMemoryAddressBalance('0xab')
    ).resolves.toMatchObject({
      total_usd_value: 50,
      evmUsdValue: 10,
      chain_list,
      appChainUsdValue: 40,
      appChainIds: ['app2'],
    });
    expect(wallet.isInMemoryAddressBalanceExpired('0xab')).toBe(true);
    expect(setUpdatedAt).toHaveBeenCalledTimes(1);

    getAppChainList.mockResolvedValueOnce({ apps: [], error_apps: [] });
    await expect(
      wallet.getInMemoryAddressBalance('0xab')
    ).resolves.toMatchObject({
      total_usd_value: 10,
      evmUsdValue: 10,
      appChainUsdValue: 0,
      appChainIds: [],
    });
    expect(wallet.isInMemoryAddressBalanceExpired('0xab')).toBe(true);
    expect(setUpdatedAt).toHaveBeenCalledTimes(1);
  } finally {
    jest.useRealTimers();
  }
});

it('uses EVM only for an uncached address when AppChain fails', async () => {
  const { wallet, getAppChainList, setUpdatedAt } = createWallet();
  getAppChainList.mockResolvedValueOnce({
    apps: [],
    error_apps: [{ id: 'missing' }],
  });
  await expect(wallet.getInMemoryAddressBalance('0xbb')).resolves.toMatchObject(
    {
      total_usd_value: 10,
      evmUsdValue: 10,
      appChainUsdValue: 0,
      appChainIds: [],
    }
  );
  expect(wallet.isInMemoryAddressBalanceExpired('0xbb')).toBe(true);
  expect(setUpdatedAt).not.toHaveBeenCalled();

  getAppChainList.mockResolvedValueOnce({ apps: [app], error_apps: [] });
  await expect(wallet.getInMemoryAddressBalance('0xbb')).resolves.toMatchObject(
    {
      total_usd_value: 35,
      evmUsdValue: 10,
      appChainUsdValue: 25,
    }
  );
  expect(setUpdatedAt).toHaveBeenCalledTimes(1);
  expect(wallet.isInMemoryAddressBalanceExpired('0xbb')).toBe(false);
});

it('rejects when EVM fails without a cache, even if AppChain succeeds', async () => {
  const {
    wallet,
    getAppChainList,
    getTotalBalance,
    putBalance,
    updateBalanceAboutCache,
    setUpdatedAt,
  } = createWallet();
  getTotalBalance.mockRejectedValue(new Error('evm error'));
  getAppChainList.mockResolvedValue({ apps: [app], error_apps: [] });
  await expect(wallet.getInMemoryAddressBalance('0xcc')).rejects.toThrow(
    'evm error'
  );
  expect(wallet.isInMemoryAddressBalanceExpired('0xcc')).toBe(true);
  expect(putBalance).not.toHaveBeenCalled();
  expect(updateBalanceAboutCache).not.toHaveBeenCalled();
  expect(setUpdatedAt).not.toHaveBeenCalled();
});

it('rejects with the EVM error when both fail', async () => {
  const {
    wallet,
    getAppChainList,
    getTotalBalance,
    putBalance,
    setUpdatedAt,
  } = createWallet();
  getTotalBalance.mockRejectedValue(new Error('evm error'));
  getAppChainList.mockRejectedValue(new Error('app error'));
  await expect(wallet.getInMemoryAddressBalance('0xdd')).rejects.toThrow(
    'evm error'
  );
  expect(putBalance).not.toHaveBeenCalled();
  expect(setUpdatedAt).not.toHaveBeenCalled();
});

it('drops stale in-memory cache after a partial forced refresh', async () => {
  const { wallet, getAppChainList, getTotalBalance } = createWallet();
  getAppChainList.mockResolvedValueOnce({ apps: [app], error_apps: [] });
  await wallet.getInMemoryAddressBalance('0xab');
  expect(wallet.isInMemoryAddressBalanceExpired('0xab')).toBe(false);

  // 未过期时手动强制刷新且部分失败，应清理旧内存缓存
  getTotalBalance.mockResolvedValue({ total_usd_value: 7, chain_list: [] });
  getAppChainList.mockRejectedValue(new Error('network error'));
  await expect(
    wallet.getInMemoryAddressBalance('0xab', true)
  ).resolves.toMatchObject({ total_usd_value: 32, evmUsdValue: 7 });
  expect(wallet.isInMemoryAddressBalanceExpired('0xab')).toBe(true);

  await expect(
    wallet.getInMemoryAddressBalance('0xab')
  ).resolves.toMatchObject({ total_usd_value: 32, evmUsdValue: 7 });
});

it('updates AppChain cache while rethrowing EVM missing-chain error (code 2)', async () => {
  const {
    wallet,
    getAppChainList,
    getTotalBalance,
    setUpdatedAt,
  } = createWallet();
  const chain_list = [{ id: 'eth', usd_value: 10 }];
  getTotalBalance.mockResolvedValueOnce({ total_usd_value: 10, chain_list });
  getAppChainList.mockResolvedValueOnce({ apps: [app], error_apps: [] });
  await wallet.getInMemoryAddressBalance('0xab');

  const missingChainError = new Error(
    JSON.stringify({ error_code: 2, err_chain_ids: ['eth'] })
  );
  getTotalBalance.mockRejectedValueOnce(missingChainError);
  const app2 = {
    id: 'app2',
    portfolio_item_list: [{ stats: { net_usd_value: 40 } }],
  };
  getAppChainList.mockResolvedValueOnce({ apps: [app2], error_apps: [] });

  // 应保留 error_code=2 原样抛出，同时本地缓存已更新为旧 EVM + 新 AppChain
  await expect(wallet.getInMemoryAddressBalance('0xab', true)).rejects.toBe(
    missingChainError
  );
  await expect(wallet.getAddressCacheBalance('0xab')).resolves.toMatchObject({
    total_usd_value: 50,
    evmUsdValue: 10,
    chain_list,
    appChainUsdValue: 40,
    appChainIds: ['app2'],
  });
  expect(wallet.isInMemoryAddressBalanceExpired('0xab')).toBe(true);
  expect(setUpdatedAt).toHaveBeenCalledTimes(1);
});
