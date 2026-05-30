import { useRequest } from 'ahooks';
import BigNumber from 'bignumber.js';
import { formatUnits } from 'ethers/lib/utils';

import type { Account } from '@/background/service/preference';
import { useWallet } from '@/ui/utils';

import {
  ERC4626_ABI,
  UNIV2_PAIR_ABI,
  UNIV3_NPM_ABI,
  UNIV3_POOL_ABI,
  getErc4626PoolEntry,
  quoteUniv3DecreaseLiquidity,
  resolveUniv2PoolEntryWithClient,
  resolveUniv3PoolEntryWithClient,
} from '@rabby-wallet/staking-sdk';
import type {
  StakingPool as SdkStakingPool,
  Univ2PoolKey,
  Univ3PoolKey,
  Univ3QuotePoolState,
} from '@rabby-wallet/staking-sdk';

import type { StakingPool, StakingToken } from '../types';
import { normalizeStakingPoolToPoolKey } from '../utils/poolKey';
import {
  createStakingReadContractClient,
  readStakingContract,
} from '../utils/tx';

export interface StakingPositionAsset {
  token: StakingToken;
  amount: string;
  rawAmount: string;
  usdValue: number | null;
}

export interface StakingUniv2PositionRaw {
  pair: string;
  lpToken: string;
  token0: string;
  token1: string;
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  lpBalance: string;
}

export interface StakingUniv3PositionRaw {
  tokenId: string;
  token0: string;
  token1: string;
  fee: number;
  tickLower: number;
  tickUpper: number;
  liquidity: string;
  tokensOwed0: string;
  tokensOwed1: string;
  claimable0: string;
  claimable1: string;
  poolState: Univ3QuotePoolState;
}

export interface StakingPositionItem {
  id: string;
  type: 'erc4626' | 'univ2' | 'univ3';
  supplied: StakingPositionAsset[];
  rewards: StakingPositionAsset[];
  raw?: {
    univ2?: StakingUniv2PositionRaw;
    univ3?: StakingUniv3PositionRaw;
  };
}

export interface StakingPositionSummary {
  supplied: StakingPositionAsset[];
  rewards: StakingPositionAsset[];
  positionsCount: number;
  positions: StakingPositionItem[];
}

const toSdkPool = (pool: StakingPool) => (pool as unknown) as SdkStakingPool;

const sameAddress = (left?: string | null, right?: string | null) =>
  !!left && !!right && left.toLowerCase() === right.toLowerCase();

const toBigInt = (value: unknown): bigint => {
  if (typeof value === 'bigint') {
    return value;
  }
  if (typeof value === 'number') {
    return BigInt(value);
  }
  return BigInt(String(value || 0));
};

const isPositiveRaw = (value: bigint) => value > 0n;

const tokenKey = (token?: StakingToken) => token?.id?.toLowerCase() || '';

const MAX_UINT128 = (2n ** 128n - 1n).toString();

const findTokenByAddress = (
  tokens: StakingToken[],
  address?: string,
  fallbackIndex = 0
) =>
  tokens.find((token) => sameAddress(token.id, address)) ||
  tokens[fallbackIndex];

const mergeRawAmount = (
  target: Map<string, { token: StakingToken; rawAmount: bigint }>,
  token: StakingToken | undefined,
  rawAmount: bigint
) => {
  if (!token || !isPositiveRaw(rawAmount)) {
    return;
  }

  const key = tokenKey(token);
  const current = target.get(key);
  target.set(key, {
    token,
    rawAmount: (current?.rawAmount || 0n) + rawAmount,
  });
};

const getTokenMeta = async ({
  wallet,
  account,
  pool,
  token,
}: {
  wallet: ReturnType<typeof useWallet>;
  account: Account;
  pool: StakingPool;
  token: StakingToken;
}) => {
  try {
    const apiToken = await wallet.openapi.getToken(
      account.address,
      token.chain_id || pool.chain_id,
      token.id
    );

    return {
      token: {
        ...token,
        logo_url: token.logo_url || apiToken?.logo_url,
        decimals: apiToken?.decimals ?? token.decimals,
        price: apiToken?.price ?? token.price,
      },
      decimals: apiToken?.decimals ?? token.decimals ?? 18,
      price: apiToken?.price ?? token.price,
    };
  } catch {
    return {
      token,
      decimals: token.decimals ?? 18,
      price: token.price,
    };
  }
};

const buildPositionAsset = async ({
  wallet,
  account,
  pool,
  token,
  rawAmount,
}: {
  wallet: ReturnType<typeof useWallet>;
  account: Account;
  pool: StakingPool;
  token: StakingToken;
  rawAmount: bigint;
}): Promise<StakingPositionAsset> => {
  const meta = await getTokenMeta({ wallet, account, pool, token });
  const amount = formatUnits(rawAmount.toString(), meta.decimals);
  const usdValue =
    meta.price === undefined || meta.price === null
      ? null
      : new BigNumber(amount).multipliedBy(meta.price).toNumber();

  return {
    token: meta.token,
    amount,
    rawAmount: rawAmount.toString(),
    usdValue: Number.isFinite(usdValue) ? usdValue : null,
  };
};

const buildPositionAssetsFromMap = async ({
  wallet,
  account,
  pool,
  rawMap,
}: {
  wallet: ReturnType<typeof useWallet>;
  account: Account;
  pool: StakingPool;
  rawMap: Map<string, { token: StakingToken; rawAmount: bigint }>;
}) =>
  Promise.all(
    Array.from(rawMap.values()).map((item) =>
      buildPositionAsset({
        wallet,
        account,
        pool,
        token: item.token,
        rawAmount: item.rawAmount,
      })
    )
  );

const readErc4626Position = async ({
  wallet,
  account,
  pool,
}: {
  wallet: ReturnType<typeof useWallet>;
  account: Account;
  pool: StakingPool;
}): Promise<StakingPositionSummary> => {
  const entry = getErc4626PoolEntry(toSdkPool(pool));
  const token =
    findTokenByAddress(pool.tokens.supplies, entry.asset, 0) ||
    pool.tokens.supplies[0];

  if (!token) {
    return { supplied: [], rewards: [], positionsCount: 0, positions: [] };
  }

  const rawShares = toBigInt(
    await readStakingContract({
      wallet,
      chainServerId: pool.chain_id,
      account,
      address: entry.vault,
      abi: ERC4626_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    })
  );

  const rawAssets = isPositiveRaw(rawShares)
    ? toBigInt(
        await readStakingContract({
          wallet,
          chainServerId: pool.chain_id,
          account,
          address: entry.vault,
          abi: ERC4626_ABI,
          functionName: 'convertToAssets',
          args: [rawShares],
        })
      )
    : 0n;

  const supplied = [
    await buildPositionAsset({
      wallet,
      account,
      pool,
      token,
      rawAmount: rawAssets,
    }),
  ];
  const positions = isPositiveRaw(rawShares)
    ? [
        {
          id: 'erc4626',
          type: 'erc4626' as const,
          supplied,
          rewards: [],
        },
      ]
    : [];

  return {
    supplied,
    rewards: [],
    positionsCount: isPositiveRaw(rawShares) ? 1 : 0,
    positions,
  };
};

const readUniv2Position = async ({
  wallet,
  account,
  pool,
}: {
  wallet: ReturnType<typeof useWallet>;
  account: Account;
  pool: StakingPool;
}): Promise<StakingPositionSummary> => {
  const client = createStakingReadContractClient({
    wallet,
    chainServerId: pool.chain_id,
    account,
  });
  const key = normalizeStakingPoolToPoolKey(pool) as Univ2PoolKey;
  const entry = await resolveUniv2PoolEntryWithClient({ key, client });
  const [rawReserves, rawTotalSupply, rawLpBalance] = await Promise.all([
    readStakingContract({
      wallet,
      chainServerId: pool.chain_id,
      account,
      address: entry.pair,
      abi: UNIV2_PAIR_ABI,
      functionName: 'getReserves',
    }),
    readStakingContract({
      wallet,
      chainServerId: pool.chain_id,
      account,
      address: entry.pair,
      abi: UNIV2_PAIR_ABI,
      functionName: 'totalSupply',
    }),
    readStakingContract({
      wallet,
      chainServerId: pool.chain_id,
      account,
      address: entry.lpToken,
      abi: UNIV2_PAIR_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    }),
  ]);
  const reserves = rawReserves as readonly unknown[];
  const reserve0 = toBigInt(reserves[0]);
  const reserve1 = toBigInt(reserves[1]);
  const totalSupply = toBigInt(rawTotalSupply);
  const lpBalance = toBigInt(rawLpBalance);
  const token0 = findTokenByAddress(pool.tokens.supplies, entry.token0, 0);
  const token1 = findTokenByAddress(pool.tokens.supplies, entry.token1, 1);

  if (!isPositiveRaw(lpBalance) || !isPositiveRaw(totalSupply)) {
    return {
      supplied: await Promise.all(
        [token0, token1].filter(Boolean).map((token) =>
          buildPositionAsset({
            wallet,
            account,
            pool,
            token: token!,
            rawAmount: 0n,
          })
        )
      ),
      rewards: [],
      positionsCount: 0,
      positions: [],
    };
  }

  const amount0 = (lpBalance * reserve0) / totalSupply;
  const amount1 = (lpBalance * reserve1) / totalSupply;
  const suppliedRaw = new Map<
    string,
    { token: StakingToken; rawAmount: bigint }
  >();
  mergeRawAmount(suppliedRaw, token0, amount0);
  mergeRawAmount(suppliedRaw, token1, amount1);

  const supplied = await buildPositionAssetsFromMap({
    wallet,
    account,
    pool,
    rawMap: suppliedRaw,
  });

  return {
    supplied,
    rewards: [],
    positionsCount: 1,
    positions: [
      {
        id: entry.lpToken,
        type: 'univ2',
        supplied,
        rewards: [],
        raw: {
          univ2: {
            pair: entry.pair,
            lpToken: entry.lpToken,
            token0: entry.token0,
            token1: entry.token1,
            reserve0: reserve0.toString(),
            reserve1: reserve1.toString(),
            totalSupply: totalSupply.toString(),
            lpBalance: lpBalance.toString(),
          },
        },
      },
    ],
  };
};

const buildAssetsForTokenAmounts = async ({
  wallet,
  account,
  pool,
  amounts,
  includeZero = false,
}: {
  wallet: ReturnType<typeof useWallet>;
  account: Account;
  pool: StakingPool;
  amounts: Array<{ token?: StakingToken; rawAmount: bigint }>;
  includeZero?: boolean;
}) =>
  Promise.all(
    amounts
      .filter(
        ({ token, rawAmount }) => !!token && (includeZero || rawAmount > 0n)
      )
      .map(({ token, rawAmount }) =>
        buildPositionAsset({
          wallet,
          account,
          pool,
          token: token!,
          rawAmount,
        })
      )
  );

const readUniv3ClaimableAmounts = async ({
  wallet,
  account,
  pool,
  entry,
  tokenId,
  fallback0,
  fallback1,
}: {
  wallet: ReturnType<typeof useWallet>;
  account: Account;
  pool: StakingPool;
  entry: Awaited<ReturnType<typeof resolveUniv3PoolEntryWithClient>>;
  tokenId: string;
  fallback0: bigint;
  fallback1: bigint;
}) => {
  try {
    const result = (await readStakingContract({
      wallet,
      chainServerId: pool.chain_id,
      account,
      from: account.address as `0x${string}`,
      address: entry.nonfungiblePositionManager,
      abi: UNIV3_NPM_ABI,
      functionName: 'collect',
      args: [
        {
          tokenId: BigInt(tokenId),
          recipient: account.address,
          amount0Max: BigInt(MAX_UINT128),
          amount1Max: BigInt(MAX_UINT128),
        },
      ],
    })) as readonly unknown[];

    return {
      amount0: toBigInt(result[0]),
      amount1: toBigInt(result[1]),
    };
  } catch {
    return {
      amount0: fallback0,
      amount1: fallback1,
    };
  }
};

const readUniv3PositionItem = async ({
  wallet,
  account,
  pool,
  tokenId,
  entry,
  poolState,
  token0,
  token1,
}: {
  wallet: ReturnType<typeof useWallet>;
  account: Account;
  pool: StakingPool;
  tokenId: string;
  entry: Awaited<ReturnType<typeof resolveUniv3PoolEntryWithClient>>;
  poolState: Univ3QuotePoolState;
  token0?: StakingToken;
  token1?: StakingToken;
}): Promise<StakingPositionItem | null> => {
  try {
    const [owner, rawPosition] = await Promise.all([
      readStakingContract({
        wallet,
        chainServerId: pool.chain_id,
        account,
        address: entry.nonfungiblePositionManager,
        abi: UNIV3_NPM_ABI,
        functionName: 'ownerOf',
        args: [BigInt(tokenId)],
      }),
      readStakingContract({
        wallet,
        chainServerId: pool.chain_id,
        account,
        address: entry.nonfungiblePositionManager,
        abi: UNIV3_NPM_ABI,
        functionName: 'positions',
        args: [BigInt(tokenId)],
      }),
    ]);

    if (!sameAddress(String(owner), account.address)) {
      return null;
    }

    const position = rawPosition as readonly unknown[];
    const positionToken0 = String(position[2]);
    const positionToken1 = String(position[3]);
    const positionFee = Number(position[4]);
    const tickLower = Number(position[5]);
    const tickUpper = Number(position[6]);
    const liquidity = toBigInt(position[7]);
    const tokensOwed0 = toBigInt(position[10]);
    const tokensOwed1 = toBigInt(position[11]);

    if (
      !sameAddress(positionToken0, entry.token0) ||
      !sameAddress(positionToken1, entry.token1) ||
      positionFee !== entry.fee
    ) {
      return null;
    }

    let supplied: StakingPositionAsset[] = [];
    if (isPositiveRaw(liquidity)) {
      const quote = quoteUniv3DecreaseLiquidity({
        poolState,
        tickLower,
        tickUpper,
        liquidity,
        slippageBps: 0,
        tokensOwed0,
        tokensOwed1,
      });

      supplied = await buildAssetsForTokenAmounts({
        wallet,
        account,
        pool,
        includeZero: true,
        amounts: [
          { token: token0, rawAmount: quote.amount0 },
          { token: token1, rawAmount: quote.amount1 },
        ],
      });
    }

    const claimable = await readUniv3ClaimableAmounts({
      wallet,
      account,
      pool,
      entry,
      tokenId,
      fallback0: tokensOwed0,
      fallback1: tokensOwed1,
    });

    const rewards = await buildAssetsForTokenAmounts({
      wallet,
      account,
      pool,
      amounts: [
        { token: token0, rawAmount: claimable.amount0 },
        { token: token1, rawAmount: claimable.amount1 },
      ],
    });

    return {
      id: tokenId,
      type: 'univ3',
      supplied,
      rewards,
      raw: {
        univ3: {
          tokenId,
          token0: entry.token0,
          token1: entry.token1,
          fee: entry.fee,
          tickLower,
          tickUpper,
          liquidity: liquidity.toString(),
          tokensOwed0: tokensOwed0.toString(),
          tokensOwed1: tokensOwed1.toString(),
          claimable0: claimable.amount0.toString(),
          claimable1: claimable.amount1.toString(),
          poolState,
        },
      },
    };
  } catch {
    return null;
  }
};

const readUniv3Position = async ({
  wallet,
  account,
  pool,
  extraTokenIds = [],
}: {
  wallet: ReturnType<typeof useWallet>;
  account: Account;
  pool: StakingPool;
  extraTokenIds?: string[];
}): Promise<StakingPositionSummary> => {
  const tokenIds = Array.from(
    new Set([...(pool.userPositionIndexes || []), ...extraTokenIds])
  ).filter(Boolean);
  if (!tokenIds.length) {
    return { supplied: [], rewards: [], positionsCount: 0, positions: [] };
  }

  const client = createStakingReadContractClient({
    wallet,
    chainServerId: pool.chain_id,
    account,
  });
  const key = normalizeStakingPoolToPoolKey(pool) as Univ3PoolKey;
  const entry = await resolveUniv3PoolEntryWithClient({ key, client });
  const slot0 = (await readStakingContract({
    wallet,
    chainServerId: pool.chain_id,
    account,
    address: entry.pool,
    abi: UNIV3_POOL_ABI,
    functionName: 'slot0',
  })) as readonly unknown[];
  const poolState = {
    sqrtPriceX96: String(slot0[0]),
    tickCurrent: Number(slot0[1]),
    tickSpacing: entry.tickSpacing,
    token0: entry.token0,
    token1: entry.token1,
    fee: entry.fee,
  };
  const token0 = findTokenByAddress(pool.tokens.supplies, entry.token0, 0);
  const token1 = findTokenByAddress(pool.tokens.supplies, entry.token1, 1);
  const suppliedRaw = new Map<
    string,
    { token: StakingToken; rawAmount: bigint }
  >();
  const rewardsRaw = new Map<
    string,
    { token: StakingToken; rawAmount: bigint }
  >();
  const positionItems = (
    await Promise.all(
      tokenIds.map((tokenId) =>
        readUniv3PositionItem({
          wallet,
          account,
          pool,
          tokenId,
          entry,
          poolState,
          token0,
          token1,
        })
      )
    )
  ).filter(Boolean) as StakingPositionItem[];

  positionItems.forEach((item) => {
    const raw = item.raw?.univ3;
    if (!raw) {
      return;
    }
    mergeRawAmount(rewardsRaw, token0, BigInt(raw.claimable0));
    mergeRawAmount(rewardsRaw, token1, BigInt(raw.claimable1));

    if (BigInt(raw.liquidity) > 0n) {
      const quote = quoteUniv3DecreaseLiquidity({
        poolState,
        tickLower: raw.tickLower,
        tickUpper: raw.tickUpper,
        liquidity: raw.liquidity,
        slippageBps: 0,
        tokensOwed0: raw.tokensOwed0,
        tokensOwed1: raw.tokensOwed1,
      });

      mergeRawAmount(suppliedRaw, token0, quote.amount0);
      mergeRawAmount(suppliedRaw, token1, quote.amount1);
    }
  });

  return {
    supplied: await buildPositionAssetsFromMap({
      wallet,
      account,
      pool,
      rawMap: suppliedRaw,
    }),
    rewards: await buildPositionAssetsFromMap({
      wallet,
      account,
      pool,
      rawMap: rewardsRaw,
    }),
    positionsCount: positionItems.length,
    positions: positionItems,
  };
};

const readPositionSummary = ({
  wallet,
  account,
  pool,
  extraTokenIds,
}: {
  wallet: ReturnType<typeof useWallet>;
  account: Account;
  pool: StakingPool;
  extraTokenIds?: string[];
}) => {
  if (pool.type === 'erc4626') {
    return readErc4626Position({ wallet, account, pool });
  }
  if (pool.type === 'univ2') {
    return readUniv2Position({ wallet, account, pool });
  }
  return readUniv3Position({ wallet, account, pool, extraTokenIds });
};

export const useStakingPositionSummary = (
  pool: StakingPool | undefined,
  account: Account | null | undefined,
  extraTokenIds: string[] = []
) => {
  const wallet = useWallet();

  return useRequest(
    async () => {
      if (!pool || !account) {
        return;
      }
      return readPositionSummary({ wallet, account, pool, extraTokenIds });
    },
    {
      ready: !!pool && !!account,
      refreshDeps: [
        account?.address,
        pool?.chain_id,
        pool?.id,
        pool?.type,
        pool?.userPositionIndexes?.join(','),
        extraTokenIds.join(','),
      ],
    }
  );
};
