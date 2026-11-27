import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { query2obj } from '@/ui/utils/url';

/**
 * The current route's query as a flat object, memoized on `location.search`.
 * react-router v5 has no `useSearchParams`; this fills that gap.
 *
 * Unlike react-router v6's hook it returns a plain object rather than a
 * `URLSearchParams`, and has no setter: navigate with `history.push` and
 * `obj2query`. `T` only names the keys a page expects. Every value is a
 * string at runtime, and a missing key is `undefined`.
 *
 * Outside a component, or to read the URL at call time inside a callback,
 * use `query2obj(history.location.search)` instead.
 */
export const useSearchParams = <
  T extends object = Record<string, string>
>() => {
  const { search } = useLocation();
  return useMemo(() => query2obj(search) as T, [search]);
};
