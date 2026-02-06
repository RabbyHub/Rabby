export type IframeSyncContext = {
  isActive: boolean;
  locationSearch: string;
  updateSearchParams: (updater: (params: URLSearchParams) => void) => void;
};

export type SyncIframeUrlToQueryOptions = {
  nextUrl?: string | null;
  context: IframeSyncContext;
};

export const getSafeSyncUrl = (value?: string | null) => {
  if (!value) {
    return '';
  }
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return parsed.toString();
  } catch (err) {
    return '';
  }
};

export const syncIframeUrlToQuery = ({
  nextUrl,
  context,
}: SyncIframeUrlToQueryOptions): string | null => {
  const safeUrl = getSafeSyncUrl(nextUrl);
  if (!safeUrl) {
    return null;
  }
  if (!context.isActive) {
    return safeUrl;
  }
  const currentSyncUrl = new URLSearchParams(context.locationSearch).get(
    'syncUrl'
  );
  if (currentSyncUrl === safeUrl) {
    return safeUrl;
  }
  context.updateSearchParams((params) => params.set('syncUrl', safeUrl));
  return safeUrl;
};
