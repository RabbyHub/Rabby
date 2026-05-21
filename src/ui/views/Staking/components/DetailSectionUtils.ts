import type { StakingPool, StakingProtocol } from '../types';

export type DetailTabKey = 'portfolio' | 'about' | 'security';
export type StakingAction = 'deposit' | 'withdraw' | 'claim';

const getDisplayProtocol = (
  pool: StakingPool,
  protocolMap: Record<string, StakingProtocol>
): StakingProtocol => ({
  ...protocolMap[pool.protocol.id],
  ...pool.protocol,
  logo_url: pool.protocol.logo_url || protocolMap[pool.protocol.id]?.logo_url,
});

export const getVisualPool = (
  pool: StakingPool,
  protocolMap: Record<string, StakingProtocol>
): StakingPool => ({
  ...pool,
  protocol: getDisplayProtocol(pool, protocolMap),
});

export const getActionSupported = (pool: StakingPool, action: StakingAction) =>
  pool.actions?.[action]?.is_supported === true;
