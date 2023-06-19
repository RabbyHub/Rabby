import { createContextState } from '@/ui/hooks/contextState';

const [
  SettingVisibleProvider,
  useSettingVisible,
  useSetSettingVisible,
] = createContextState(false);

const [
  QuoteVisibleProvider,
  useQuoteVisible,
  useSetQuoteVisible,
] = createContextState(false);

const [RefreshIdProvider, useRefreshId, useSetRefreshId] = createContextState(
  0
);

export { SettingVisibleProvider, useSettingVisible, useSetSettingVisible };

export { RefreshIdProvider, useRefreshId, useSetRefreshId };

export { QuoteVisibleProvider, useQuoteVisible, useSetQuoteVisible };
