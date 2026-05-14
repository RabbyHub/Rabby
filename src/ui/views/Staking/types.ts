export type StakingPoolType = 'erc4626' | 'univ2' | 'univ3';

export type StakingPoolCurveMetric = 'tvl' | 'apr';

export interface StakingLink {
  type: 'website' | 'twitter' | string;
  name: string;
  url: string;
}

export interface StakingProtocol {
  id: string;
  name?: string;
  logo_url?: string;
  is_holding?: boolean;
  site_url?: string;
  twitter_url?: string;
  about?: {
    description?: string;
    links?: StakingLink[];
  };
}

export interface StakingToken {
  id: string;
  chain_id?: string;
  chain?: string;
  symbol: string;
  logo_url?: string;
  price?: number;
  decimals?: number;
}

export interface StakingTokensApi {
  supplys?: StakingToken[];
  supplies?: StakingToken[];
  rewards?: StakingToken[];
}

export interface StakingTokens {
  supplies: StakingToken[];
  rewards: StakingToken[];
}

export interface StakingTag {
  id?: string;
  name: string;
}

export interface StakingActionState {
  is_supported: boolean;
  reason?: string;
}

export interface StakingActions {
  deposit?: StakingActionState;
  withdraw?: StakingActionState;
  claim?: StakingActionState;
}

export interface StakingPoolApi {
  id: string;
  pool_address?: string;
  chain_id: string;
  type: StakingPoolType;
  deployment_id?: string;
  deploymentId?: string;
  fee?: number | string;
  create_at?: number;
  protocol: StakingProtocol;
  name?: string;
  display_name?: string;
  metric_label?: string;
  tokens?: StakingTokensApi;
  tags?: StakingTag[];
  tvl?: number | null;
  apr?: number | null;
  is_holding?: boolean;
  user_position_usd_value?: number | null;
  user_position_indexes?: string[];
  actions?: StakingActions;
}

export interface StakingPool extends Omit<StakingPoolApi, 'tokens'> {
  tokens: StakingTokens;
  metricLabel: string;
  userPositionIndexes: string[];
}

export interface StakingPoolListParams {
  q?: string;
  chain_id?: string;
  protocol_id?: string;
  user_addr?: string;
  start?: number;
  limit?: number;
  order_by?: 'tvl' | string;
  order?: 'asc' | 'desc' | string;
}

export interface StakingPoolListResponseApi {
  pools?: StakingPoolApi[];
  list?: StakingPoolApi[];
  page?: {
    start?: number;
    limit?: number;
    total?: number;
  };
}

export interface StakingPoolList {
  pools: StakingPool[];
  page: {
    start: number;
    limit: number;
    total: number;
  };
}

export interface StakingFilterItem {
  id: string;
  name?: string;
  logo_url?: string;
}

export interface StakingFilterListResponseApi {
  protocols?: StakingProtocol[];
  chains?: StakingFilterItem[];
}

export interface StakingFilterList {
  protocols: StakingProtocol[];
  chains: StakingFilterItem[];
}

export interface StakingPoolDetailResponseApi {
  pool?: StakingPoolApi;
}

export type StakingPoolCurvePointApi =
  | [number, number]
  | {
      timestamp?: number;
      time_at?: number;
      date_at?: number;
      value?: number;
    };

export type StakingPoolCurveResponseApi =
  | StakingPoolCurvePointApi[]
  | {
      list?: StakingPoolCurvePointApi[];
      data?: StakingPoolCurvePointApi[];
    };

export interface StakingPoolCurvePoint {
  timestamp: number;
  value: number;
}
