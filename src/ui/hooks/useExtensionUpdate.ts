import { useEffect, useState } from 'react';
import browser from 'webextension-polyfill';
import { wallet } from '@/ui/wallet';

export const useExtensionUpdate = () => {
  const [hasNewVersion, setHasNewVersion] = useState(false);

  useEffect(() => {
    let mounted = true;
    const onUpdateAvailable = () => setHasNewVersion(true);

    browser.runtime.onUpdateAvailable.addListener(onUpdateAvailable);
    void wallet
      .getPendingExtensionVersion()
      .then((version) => {
        if (mounted && version) setHasNewVersion(true);
      })
      .catch((error) => {
        console.error('[extensionUpdate] failed to read update', error);
      });

    return () => {
      mounted = false;
      browser.runtime.onUpdateAvailable.removeListener(onUpdateAvailable);
    };
  }, []);

  const reloadForUpdate = () => {
    if (hasNewVersion) browser.runtime.reload();
  };

  return { hasNewVersion, reloadForUpdate };
};
