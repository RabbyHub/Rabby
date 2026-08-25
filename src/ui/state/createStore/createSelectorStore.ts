import { createWithEqualityFn } from 'zustand/traditional';

/**
 * React Redux selectors may return a freshly allocated object. Zustand's base
 * React 18 hook treats that value as an uncached external-store snapshot and
 * can enter a nested render loop. The selector-aware variant memoizes the
 * selected value for a stable source snapshot and preserves the legacy
 * useSelector behavior during Rematch migrations.
 */
export const createSelectorStore = createWithEqualityFn;
