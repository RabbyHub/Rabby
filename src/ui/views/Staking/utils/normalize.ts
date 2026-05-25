import type {
  StakingFilterList,
  StakingFilterListResponseApi,
  StakingPool,
  StakingPoolApi,
  StakingPoolCurvePoint,
  StakingPoolCurvePointApi,
  StakingPoolCurveResponseApi,
  StakingPoolList,
  StakingPoolListResponseApi,
  StakingTokens,
} from '../types';

const normalizeTokens = (pool: StakingPoolApi): StakingTokens => {
  const tokens = pool.tokens || {};
  return {
    supplies: tokens.supplies || tokens.supplys || [],
    rewards: tokens.rewards || [],
  };
};

export const normalizeStakingPool = (pool: StakingPoolApi): StakingPool => {
  const tokens = normalizeTokens(pool);

  return {
    ...pool,
    tokens,
    deployment_id: pool.deployment_id || pool.deploymentId,
    metricLabel: pool.metric_label || (pool.type === 'erc4626' ? 'APY' : 'APR'),
    userPositionIndexes: pool.user_position_indexes || [],
  };
};

export const normalizeStakingPoolList = (
  response: StakingPoolListResponseApi | StakingPoolApi[] | undefined,
  fallback?: { start?: number; limit?: number }
): StakingPoolList => {
  if (Array.isArray(response)) {
    return {
      pools: response.map(normalizeStakingPool),
      page: {
        start: fallback?.start || 0,
        limit: fallback?.limit || response.length,
        total: response.length,
      },
    };
  }

  const rawPools = response?.pools || response?.list || [];
  const start = response?.page?.start ?? fallback?.start ?? 0;
  const limit = response?.page?.limit ?? fallback?.limit ?? rawPools.length;

  return {
    pools: rawPools.map(normalizeStakingPool),
    page: {
      start,
      limit,
      total: response?.page?.total ?? rawPools.length,
    },
  };
};

export const normalizeStakingFilterList = (
  response: StakingFilterListResponseApi | undefined
): StakingFilterList => {
  return {
    protocols: response?.protocols || [],
    chains: response?.chains || [],
  };
};

const normalizeCurvePoint = (
  point: StakingPoolCurvePointApi
): StakingPoolCurvePoint | null => {
  const timestamp = Array.isArray(point)
    ? point[0]
    : point.timestamp ?? point.time_at ?? point.date_at;
  const value = Array.isArray(point) ? point[1] : point.value;

  if (
    typeof timestamp !== 'number' ||
    typeof value !== 'number' ||
    Number.isNaN(timestamp) ||
    Number.isNaN(value)
  ) {
    return null;
  }

  return {
    timestamp,
    value,
  };
};

export const normalizeStakingPoolCurve = (
  response: StakingPoolCurveResponseApi | undefined
): StakingPoolCurvePoint[] => {
  const rawPoints = Array.isArray(response)
    ? response
    : response?.list || response?.data || [];

  return rawPoints.reduce<StakingPoolCurvePoint[]>((result, point) => {
    const normalized = normalizeCurvePoint(point);
    if (normalized) {
      result.push(normalized);
    }
    return result;
  }, []);
};
