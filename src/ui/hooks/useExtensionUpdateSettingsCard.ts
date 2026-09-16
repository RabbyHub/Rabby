import { useEffect, useState } from 'react';
import {
  selectExtensionUpdateSettingsCard,
  useExtensionUpdateStore,
} from '@/ui/state/extensionUpdate';

export const useExtensionUpdateSettingsCard = () => {
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

  return useExtensionUpdateStore((state) =>
    selectExtensionUpdateSettingsCard(state, now)
  );
};
