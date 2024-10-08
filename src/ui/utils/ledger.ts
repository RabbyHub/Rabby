import { ledgerUSBVendorId } from '@ledgerhq/devices';
import { useEffect, useState } from 'react';
import browser from 'webextension-polyfill';
import { hasConnectedLedgerDevice, useWallet } from '@/ui/utils';
import { KEYRING_CLASS } from '@/constant';
import { useTranslation } from 'react-i18next';
import React from 'react';

export enum LedgerHDPathType {
  LedgerLive = 'LedgerLive',
  Legacy = 'Legacy',
  BIP44 = 'BIP44',
}

export const LedgerHDPathTypeLabel = {
  [LedgerHDPathType.LedgerLive]: 'Ledger Live',
  [LedgerHDPathType.BIP44]: 'BIP44',
  [LedgerHDPathType.Legacy]: 'Ledger Legacy',
};

export const useLedgerDeviceConnected = () => {
  const [connected, setConnected] = useState(false);

  const onConnect = async ({ device }) => {
    if (device.vendorId === ledgerUSBVendorId) {
      setConnected(true);
    }
  };

  const onDisconnect = ({ device }) => {
    if (device.vendorId === ledgerUSBVendorId) {
      setConnected(false);
    }
  };

  const detectDevice = async () => {
    hasConnectedLedgerDevice().then((state) => {
      setConnected(state);
    });
  };

  useEffect(() => {
    detectDevice();
    // TODO: firefox unSupport
    navigator.hid?.addEventListener('connect', onConnect);
    navigator.hid?.addEventListener('disconnect', onDisconnect);
    browser.windows.onFocusChanged.addListener(detectDevice);

    return () => {
      navigator.hid?.removeEventListener('connect', onConnect);
      navigator.hid?.removeEventListener('disconnect', onDisconnect);
      browser.windows.onFocusChanged.removeListener(detectDevice);
    };
  }, []);

  return connected;
};

// Fork from https://github.com/MetaMask/metamask-mobile/blob/0c45fbfb082da964403fc230e84f20921d980598/app/components/hooks/Ledger/useLedgerBluetooth.ts#L151
export function useCheckEthApp() {
  const wallet = useWallet();
  const { t } = useTranslation();

  const checkEthApp = React.useCallback(
    async (cb: (result: boolean) => void) => {
      try {
        await wallet.requestKeyring(
          KEYRING_CLASS.HARDWARE.LEDGER,
          'cleanUp',
          null
        );
      } catch (e: any) {
        console.error(e);
      }
      const { appName } = await wallet.requestKeyring(
        KEYRING_CLASS.HARDWARE.LEDGER,
        'getAppAndVersion',
        null
      );

      if (appName === 'BOLOS') {
        try {
          cb(false);
          await wallet.requestKeyring(
            KEYRING_CLASS.HARDWARE.LEDGER,
            'openEthApp',
            null
          );
          return false;
        } catch (e: any) {
          if (e.name === 'TransportStatusError') {
            switch (e.statusCode) {
              case 0x6984:
              case 0x6807:
                throw new Error(
                  t(
                    'page.newAddress.ledger.error.ethereum_app_not_installed_error'
                  )
                );
              case 0x6985:
              case 0x5501:
                throw new Error(
                  t(
                    'page.newAddress.ledger.error.ethereum_app_unconfirmed_error'
                  )
                );
            }
          }

          throw new Error(
            t('page.newAddress.ledger.error.ethereum_app_open_error')
          );
        }
      } else if (appName !== 'Ethereum') {
        try {
          await wallet.requestKeyring(
            KEYRING_CLASS.HARDWARE.LEDGER,
            'quitApp',
            null
          );
        } catch (e) {
          throw new Error(
            t('page.newAddress.ledger.error.running_app_close_error')
          );
        }

        return checkEthApp(cb);
      }
      cb(true);
      return true;
    },
    []
  );

  return checkEthApp;
}

export const isLedgerLockError = (message = '') => {
  return (
    message.includes('0x5515') ||
    message.includes('0x6b0c') ||
    message.includes('0x650f')
  );
};
