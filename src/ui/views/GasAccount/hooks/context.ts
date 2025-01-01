import { createContextState } from '@/ui/hooks/contextState';

export const [
  GasAccountRefreshIdProvider,
  useGasAccountRefreshId,
  useGasAccountSetRefreshId,
] = createContextState(0);
