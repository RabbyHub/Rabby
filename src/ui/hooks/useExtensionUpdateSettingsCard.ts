import { useEffect, useState } from 'react';
import type { ExtensionUpdateStore } from '@/ui/state/extensionUpdate';
import {
  selectExtensionUpdateBadge,
  selectExtensionUpdateSettingsCard,
  useExtensionUpdateStore,
} from '@/ui/state/extensionUpdate';

const useExtensionUpdateVisibility = (
  selector: (state: ExtensionUpdateStore, now: number) => boolean
) => {
  const dismissedUntil = useExtensionUpdateStore(
    (state) => state.settingsCardDismissal?.dismissedUntil ?? 0
  );
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    let timer: number | undefined;
    const refresh = () => {
      window.clearTimeout(timer);
      const currentTime = Date.now();
      setNow(currentTime);
      if (dismissedUntil > currentTime) {
        timer = window.setTimeout(
          refresh,
          Math.min(dismissedUntil - currentTime, 2147483647)
        );
      }
    };
    refresh();
    window.addEventListener('focus', refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [dismissedUntil]);

  return useExtensionUpdateStore((state) => selector(state, now));
};

export const useExtensionUpdateSettingsCard = () =>
  useExtensionUpdateVisibility(selectExtensionUpdateSettingsCard);

export const useExtensionUpdateBadge = () =>
  useExtensionUpdateVisibility(selectExtensionUpdateBadge);
