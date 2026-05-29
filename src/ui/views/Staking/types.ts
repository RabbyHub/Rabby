import type {
  StakingFilterItem,
  StakingFilterListResponseApi,
  StakingLink,
  StakingPoolApi,
  StakingPoolCurveMetric,
  StakingPoolCurvePointApi,
  StakingPoolCurveResponseApi,
  StakingPoolDetailResponseApi,
  StakingPoolListParams,
  StakingPoolListResponseApi,
  StakingPoolType,
  StakingProtocol,
  StakingToken,
} from '@/background/service/openapi';

export type {
  StakingFilterItem,
  StakingFilterListResponseApi,
  StakingLink,
  StakingPoolApi,
  StakingPoolCurveMetric,
  StakingPoolCurvePointApi,
  StakingPoolCurveResponseApi,
  StakingPoolDetailResponseApi,
  StakingPoolListParams,
  StakingPoolListResponseApi,
  StakingPoolType,
  StakingProtocol,
  StakingToken,
} from '@/background/service/openapi';

export interface StakingTokens {
  supplies: StakingToken[];
  rewards: StakingToken[];
}

export interface StakingPool extends Omit<StakingPoolApi, 'tokens'> {
  tokens: StakingTokens;
  metricLabel: string;
  userPositionIndexes: string[];
}

export interface StakingPoolList {
  pools: StakingPool[];
  page: {
    start: number;
    limit: number;
    total: number;
  };
}

export interface StakingFilterList {
  protocols: StakingProtocol[];
  chains: StakingFilterItem[];
}

export interface StakingPoolCurvePoint {
  timestamp: number;
  value: number;
}
