import BigNumber from 'bignumber.js';
import { formatUnits } from 'ethers/lib/utils';

import type { Account } from '@/background/service/preference';
import stats from '@/stats';

import type { StakingPool, StakingToken } from '../types';

export type StakingTxType = 'deposit' | 'withdraw' | 'claim';

type StakingReportToken = Pick<StakingToken, 'id' | 'symbol' | 'price'> & {
  decimals?: number | null;
};

export interface StakingRawReportAsset {
  token?: StakingReportToken | null;
  rawAmount?: string | number | bigint | null;
}

export interface StakingDecimalReportAsset {
  amount?: string | number | null;
  price?: number | null;
}

interface ReportStakingTxParams {
  account: Account;
  pool: StakingPool;
  txId: string;
  txType: StakingTxType;
  usdValue: string | number | BigNumber;
  poolAddress?: string | null;
  createdAt?: number;
}

const toFiniteBigNumber = (value?: string | number | BigNumber | null) => {
  const next = new BigNumber(value || 0);
  return next.isFinite() ? next : new BigNumber(0);
};

const getTokenDecimals = (token?: StakingReportToken | null) => {
  const decimals = token?.decimals;
  return typeof decimals === 'number' && Number.isFinite(decimals)
    ? decimals
    : 18;
};

const getRawAssetUsdValue = ({ token, rawAmount }: StakingRawReportAsset) => {
  if (rawAmount === undefined || rawAmount === null) {
    return new BigNumber(0);
  }

  try {
    const amount = formatUnits(rawAmount.toString(), getTokenDecimals(token));
    return toFiniteBigNumber(amount).multipliedBy(token?.price || 0);
  } catch {
    return new BigNumber(0);
  }
};

export const getStakingPoolToken = (pool: StakingPool) =>
  pool.tokens.supplies
    .map((token) => token.symbol || token.id)
    .filter(Boolean)
    .join('-');

export const getStakingRawAssetsUsdValue = (assets: StakingRawReportAsset[]) =>
  assets
    .reduce(
      (total, asset) => total.plus(getRawAssetUsdValue(asset)),
      new BigNumber(0)
    )
    .toString(10);

export const getStakingDecimalAssetsUsdValue = (
  assets: StakingDecimalReportAsset[]
) =>
  assets
    .reduce(
      (total, asset) =>
        total.plus(
          toFiniteBigNumber(asset.amount).multipliedBy(asset.price || 0)
        ),
      new BigNumber(0)
    )
    .toString(10);

export const reportStakingTx = ({
  account,
  pool,
  txId,
  txType,
  usdValue,
  poolAddress,
  createdAt = Date.now(),
}: ReportStakingTxParams) => {
  const params = {
    created_at: createdAt,
    chain: pool.chain_id || '',
    tx_id: txId || '',
    user_addr: account.address || '',
    protocol_name: pool.protocol.name || pool.protocol.id || '',
    pool_address: poolAddress || pool.pool_address || '',
    pool_token: getStakingPoolToken(pool),
    tx_type: txType,
    usd_value: toFiniteBigNumber(usdValue).toString(10),
    app_version: process.env.release || '0',
    address_type: account.type || '',
  };

  if (process.env.DEBUG) {
    console.debug('[stakingTx payload]', params);
  }

  stats.report('stakingTx', params);
};
