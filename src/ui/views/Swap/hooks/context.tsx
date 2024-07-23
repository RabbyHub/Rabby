import { createContextState } from '@/ui/hooks/contextState';

const [
  QuoteVisibleProvider,
  useQuoteVisible,
  useSetQuoteVisible,
] = createContextState(false);

export const [
  RabbyFeeVisibleProvider,
  useRabbyFeeVisible,
  useSetRabbyFeeVisible,
] = createContextState(false);

const [RefreshIdProvider, useRefreshId, useSetRefreshId] = createContextState(
  0
);

export { RefreshIdProvider, useRefreshId, useSetRefreshId };

export { QuoteVisibleProvider, useQuoteVisible, useSetQuoteVisible };
