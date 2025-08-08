import { createContextState } from '@/ui/hooks/contextState';

export const [
  GasAccountRefreshIdProvider,
  useGasAccountRefreshId,
  useGasAccountSetRefreshId,
] = createContextState(0);

export const [
  GasAccountHistoryRefreshIdProvider,
  useGasAccountHistoryRefreshId,
  useGasAccountSetHistoryRefreshId,
] = createContextState(0);
