import { decodeFunctionData } from 'viem';
import type { Hex } from 'viem';
import {
  UNIV3_NPM_ABI,
  buildUniv3DecreaseAndCollectTx,
} from '@rabby-wallet/staking-sdk';
import type {
  StakingPool as SdkStakingPool,
  Univ3AddressBookEntry,
} from '@rabby-wallet/staking-sdk';

import { hasStakingPendingResolved } from '@/ui/views/Staking/utils/pendingResolution';
import { isFullUniv3Withdraw } from '@/ui/views/Staking/utils/univ3Withdraw';

const TOKEN_ID = '6869678';
const POSITION_LIQUIDITY = '1042545038158242799';
const USER = '0x000000000000000000000000000000000000dead';
const MAX_UINT128 = 2n ** 128n - 1n;

const univ3Entry: Univ3AddressBookEntry = {
  type: 'univ3',
  poolIds: ['bsc:pancakeswap-v3-test-pool'],
  chainId: 'bsc',
  protocolId: 'pancakeswap',
  poolAddress: '0x1111111111111111111111111111111111111111',
  verification: 'documented',
  factory: '0x0bfbcf9fa4f9c56b0f40a671ad40e0805a091865',
  pool: '0x1111111111111111111111111111111111111111',
  nonfungiblePositionManager: '0x46a15b0b27311cedf172ab29e4f4766fbe7f4364',
  spender: '0x46a15b0b27311cedf172ab29e4f4766fbe7f4364',
  token0: '0x55d398326f99059ff775485246999027b3197955',
  token1: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
  fee: 500,
  tickSpacing: 10,
};

const pool = {
  id: univ3Entry.poolIds[0],
  pool_address: univ3Entry.poolAddress,
  chain_id: 'bsc',
  type: 'univ3',
  protocol: {
    id: 'pancakeswap',
    name: 'PancakeSwap',
  },
  tokens: {
    supplies: [],
    rewards: [],
  },
} as SdkStakingPool;

const buildWithdrawTx = ({
  liquidity,
  burnToken,
}: {
  liquidity: string;
  burnToken: boolean;
}) =>
  buildUniv3DecreaseAndCollectTx(
    burnToken
      ? {
          pool,
          from: USER,
          receiver: USER,
          evmChainId: 56,
          addressBook: [univ3Entry],
          tokenId: TOKEN_ID,
          position: {
            token0: univ3Entry.token0,
            token1: univ3Entry.token1,
            fee: univ3Entry.fee,
          },
          liquidity,
          amount0Min: '0',
          amount1Min: '0',
          deadline: '9999999999',
          burnToken: true,
          positionLiquidity: POSITION_LIQUIDITY,
        }
      : {
          pool,
          from: USER,
          receiver: USER,
          evmChainId: 56,
          addressBook: [univ3Entry],
          tokenId: TOKEN_ID,
          position: {
            token0: univ3Entry.token0,
            token1: univ3Entry.token1,
            fee: univ3Entry.fee,
          },
          liquidity,
          amount0Min: '0',
          amount1Min: '0',
          deadline: '9999999999',
        }
  );

const decodeMulticall = (data: Hex) => {
  const multicall = decodeFunctionData({
    abi: UNIV3_NPM_ABI,
    data,
  });
  expect(multicall.functionName).toBe('multicall');

  const calls = multicall.args?.[0] as Hex[];
  return calls.map((call) =>
    decodeFunctionData({
      abi: UNIV3_NPM_ABI,
      data: call,
    })
  );
};

describe('Univ3 withdraw burn handling', () => {
  it('treats only positive full-liquidity withdraws as burnable', () => {
    expect(
      isFullUniv3Withdraw({
        positionLiquidity: POSITION_LIQUIDITY,
        withdrawLiquidity: POSITION_LIQUIDITY,
      })
    ).toBe(true);
    expect(
      isFullUniv3Withdraw({
        positionLiquidity: POSITION_LIQUIDITY,
        withdrawLiquidity: (BigInt(POSITION_LIQUIDITY) - 1n).toString(),
      })
    ).toBe(false);
    expect(
      isFullUniv3Withdraw({
        positionLiquidity: '0',
        withdrawLiquidity: '0',
      })
    ).toBe(false);
  });

  it('builds withdraw-all calldata as decreaseLiquidity, collect, burn', () => {
    const buildResult = buildWithdrawTx({
      liquidity: POSITION_LIQUIDITY,
      burnToken: true,
    });
    const calls = decodeMulticall(buildResult.tx.data);

    expect(calls.map((call) => call.functionName)).toEqual([
      'decreaseLiquidity',
      'collect',
      'burn',
    ]);

    const decreaseParams = calls[0].args?.[0] as {
      tokenId: bigint;
      liquidity: bigint;
    };
    expect(decreaseParams.tokenId).toBe(BigInt(TOKEN_ID));
    expect(decreaseParams.liquidity).toBe(BigInt(POSITION_LIQUIDITY));

    const collectParams = calls[1].args?.[0] as {
      tokenId: bigint;
      recipient: string;
      amount0Max: bigint;
      amount1Max: bigint;
    };
    expect(collectParams.tokenId).toBe(BigInt(TOKEN_ID));
    expect(collectParams.recipient.toLowerCase()).toBe(USER);
    expect(collectParams.amount0Max).toBe(MAX_UINT128);
    expect(collectParams.amount1Max).toBe(MAX_UINT128);

    expect(calls[2].args?.[0]).toBe(BigInt(TOKEN_ID));
  });

  it('does not include burn for partial withdraw calldata', () => {
    const partialLiquidity = (BigInt(POSITION_LIQUIDITY) / 2n).toString();
    const buildResult = buildWithdrawTx({
      liquidity: partialLiquidity,
      burnToken: false,
    });
    const calls = decodeMulticall(buildResult.tx.data);

    expect(calls.map((call) => call.functionName)).toEqual([
      'decreaseLiquidity',
      'collect',
    ]);
    expect(calls[0].args?.[0]).toMatchObject({
      tokenId: BigInt(TOKEN_ID),
      liquidity: BigInt(partialLiquidity),
    });
  });

  it('resolves V3 withdraw pending when burned tokenId disappears', () => {
    const resolved = hasStakingPendingResolved(
      {
        action: 'withdraw',
        poolType: 'univ3',
        positionId: TOKEN_ID,
        baseline: {
          positionsCount: 1,
          positionIds: [TOKEN_ID],
          suppliedByToken: {
            [`bsc-${univ3Entry.token0}`]: '1',
          },
          rewardsByToken: {},
          univ3Positions: {
            [TOKEN_ID]: {
              liquidity: POSITION_LIQUIDITY,
              tokensOwed0: '0',
              tokensOwed1: '0',
            },
          },
        },
      },
      {
        supplied: [],
        rewards: [],
        positionsCount: 0,
        positions: [],
      }
    );

    expect(resolved).toBe(true);
  });
});
