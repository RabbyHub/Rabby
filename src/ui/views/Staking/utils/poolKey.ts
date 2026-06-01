import BigNumber from 'bignumber.js';

import type { UnivPoolKey } from '@rabby-wallet/staking-sdk';

import type { StakingPool } from '../types';

const parseFeePercent = (text: string) => {
  const match = text.match(/(\d+(?:\.\d+)?)%/);
  if (!match) {
    return undefined;
  }

  const rawFee = new BigNumber(match[1]).multipliedBy(10000);
  if (!rawFee.isFinite() || !rawFee.isInteger() || rawFee.lte(0)) {
    return undefined;
  }

  return rawFee.toNumber();
};

const parseFeeSuffix = (text?: string) => {
  const match = text?.match(/:(\d{2,6})$/);
  if (!match) {
    return undefined;
  }

  const fee = Number(match[1]);
  return Number.isInteger(fee) && fee > 0 ? fee : undefined;
};

export const getStakingV3Fee = (pool: StakingPool) => {
  if (pool.fee !== undefined && pool.fee !== null) {
    const fee = Number(pool.fee);
    if (Number.isInteger(fee) && fee > 0) {
      return fee;
    }
  }

  const feeTag = pool.tags?.find((tag) => /\d+(?:\.\d+)?%/.test(tag.name));
  const tagFee = feeTag ? parseFeePercent(feeTag.name) : undefined;
  if (tagFee) {
    return tagFee;
  }

  return parseFeeSuffix(pool.name) || parseFeeSuffix(pool.display_name);
};

export const normalizeStakingPoolToPoolKey = (
  pool: StakingPool
): UnivPoolKey => {
  const [token0, token1] = pool.tokens.supplies;

  if (!token0?.id || !token1?.id) {
    throw new Error('Staking pool requires two supply tokens');
  }

  const common = {
    backendPoolId: pool.id,
    chainId: pool.chain_id,
    protocolId: pool.protocol.id,
    deploymentId: pool.deployment_id,
    poolAddress: pool.pool_address,
    token0: token0.id,
    token1: token1.id,
    token0Symbol: token0.symbol,
    token1Symbol: token1.symbol,
  };

  if (pool.type === 'univ2') {
    return {
      ...common,
      type: 'univ2',
    };
  }

  if (pool.type === 'univ3') {
    const fee = getStakingV3Fee(pool);
    if (!fee) {
      throw new Error('Staking V3 pool requires fee tier');
    }

    return {
      ...common,
      type: 'univ3',
      fee,
    };
  }

  throw new Error(`Unsupported staking pool key type: ${pool.type}`);
};
