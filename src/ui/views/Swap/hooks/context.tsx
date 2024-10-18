import { createContextState } from '@/ui/hooks/contextState';

const [
  QuoteVisibleProvider,
  useQuoteVisible,
  useSetQuoteVisible,
] = createContextState(false);

export const [
  RabbyFeeProvider,
  useRabbyFee,
  useSetRabbyFee,
] = createContextState({ visible: false } as {
  visible: boolean;
  feeDexDesc?: string;
  dexName?: string;
});

const [RefreshIdProvider, useRefreshId, useSetRefreshId] = createContextState(
  0
);

export { RefreshIdProvider, useRefreshId, useSetRefreshId };

export { QuoteVisibleProvider, useQuoteVisible, useSetQuoteVisible };
