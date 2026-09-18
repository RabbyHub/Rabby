import { useQuery } from '@tanstack/react-query';
import browser from 'webextension-polyfill';
import { createQueryKey } from '@/ui/query/queryKey';
import { useExtensionUpdateStore } from '@/ui/state/extensionUpdate';

export const useExtensionVersionInfo = () => {
  const pendingVersion = useExtensionUpdateStore((s) => s.pendingVersion);
  const refreshVersionInfo = useExtensionUpdateStore(
    (s) => s.refreshVersionInfo
  );

  return useQuery({
    queryKey: createQueryKey(
      'extensionVersionInfo',
      {},
      {
        versionId: browser.runtime.getManifest().version,
        // A newly downloaded update should recheck the backend immediately.
        pendingVersion,
      }
    ),
    queryFn: refreshVersionInfo,
    staleTime: 60_000,
  });
};
