import { useEffect } from 'react';
import { useWallet } from '@/ui/utils';

export const useScreenshotContextMenuVisible = (visible: boolean) => {
  const wallet = useWallet();

  useEffect(() => {
    wallet.setScreenshotContextMenuVisible(visible).catch(() => {
      // Background may be unavailable while the extension page is closing.
    });

    return () => {
      wallet.setScreenshotContextMenuVisible(true).catch(() => {
        // Background may be unavailable while the extension page is closing.
      });
    };
  }, [visible, wallet]);
};

export const useHideScreenshotContextMenu = () => {
  const wallet = useWallet();

  useEffect(() => {
    const syncContextMenuVisible = (visible: boolean) => {
      wallet.setScreenshotContextMenuVisible(visible).catch(() => {
        // Background may be unavailable while the extension page is closing.
      });
    };
    const syncContextMenuVisibleByVisibilityState = () => {
      syncContextMenuVisible(document.visibilityState !== 'visible');
    };
    const hideContextMenu = () => syncContextMenuVisible(false);
    const restoreContextMenu = () => syncContextMenuVisible(true);

    syncContextMenuVisibleByVisibilityState();
    document.addEventListener(
      'visibilitychange',
      syncContextMenuVisibleByVisibilityState
    );
    window.addEventListener('focus', hideContextMenu);
    window.addEventListener('blur', restoreContextMenu);

    return () => {
      document.removeEventListener(
        'visibilitychange',
        syncContextMenuVisibleByVisibilityState
      );
      window.removeEventListener('focus', hideContextMenu);
      window.removeEventListener('blur', restoreContextMenu);
      wallet.setScreenshotContextMenuVisible(true).catch(() => {
        // Background may be unavailable while the extension page is closing.
      });
    };
  }, [wallet]);
};
