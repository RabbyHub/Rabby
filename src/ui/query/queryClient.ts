import { QueryClient } from '@tanstack/react-query';

export const QUERY_STALE_TIME = 0;
export const QUERY_GC_TIME = 5 * 60 * 1000;

/**
 * Creates the in-memory server-state client for one Rabby UI context.
 *
 * Extension windows are separate JavaScript contexts, so this cache is not
 * persisted or broadcast between popup, notification, tab, and desktop UIs.
 */
export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_TIME,
        gcTime: QUERY_GC_TIME,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

export const queryClient = createQueryClient();
