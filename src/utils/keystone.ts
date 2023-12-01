import {
  keystoneUSBVendorId,
  StatusCode,
} from '@keystonehq/hw-transport-webusb';
import { message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import browser from 'webextension-polyfill';

const navigator = window.navigator as any;

export const hasConnectedKeystoneDevice = async () => {
  const devices = await navigator.usb.getDevices();
  return (
    devices.filter((device) => device.vendorId === keystoneUSBVendorId).length >
    0
  );
};

export const useKeystoneDeviceConnected = () => {
  const [connected, setConnected] = useState(false);

  const onConnect = async ({ device }) => {
    if (device?.vendorId === keystoneUSBVendorId) {
      setConnected(true);
    }
  };

  const onDisconnect = ({ device }) => {
    if (device?.vendorId === keystoneUSBVendorId) {
      setConnected(false);
    }
  };

  const detectDevice = async () => {
    hasConnectedKeystoneDevice().then((state) => {
      setConnected(state);
    });
  };

  useEffect(() => {
    detectDevice();
    navigator.usb.addEventListener('connect', onConnect);
    navigator.usb.addEventListener('disconnect', onDisconnect);
    browser.windows.onFocusChanged.addListener(detectDevice);

    return () => {
      navigator.usb.removeEventListener('connect', onConnect);
      navigator.usb.removeEventListener('disconnect', onDisconnect);
      browser.windows.onFocusChanged.removeListener(detectDevice);
    };
  });

  return connected;
};

export const useIsKeystoneUsbAvailable = (brand?: string) => {
  const [isAvailable, setIsAvailable] = useState(false);
  const connected = useKeystoneDeviceConnected();

  useEffect(() => {
    setIsAvailable(connected && brand === 'Keystone');
  }, [connected, brand]);

  return isAvailable;
};

const extractErrorCode = (errorMsg: string): number | null => {
  const match = errorMsg.match(/error_code: (\d+)/);
  return match ? parseInt(match[1]) : null;
};

export const useKeystoneUSBErrorMessage = () => {
  const { t } = useTranslation();

  return useCallback(
    (error: any) => {
      let errorMessage = '';

      switch (extractErrorCode(error?.message)) {
        case StatusCode.PRS_EXPORT_ADDRESS_DISALLOWED:
          if (error.message.includes('locked')) {
            errorMessage = t('page.newAddress.keystone.deviceIsLockedError');
          } else {
            errorMessage = t(
              'page.newAddress.keystone.exportAddressJustAllowedOnHomePage'
            );
          }
          break;
        case StatusCode.PRS_EXPORT_ADDRESS_REJECTED:
          errorMessage = t(
            'page.newAddress.keystone.deviceRejectedExportAddress'
          );
          break;
        case StatusCode.PRS_PARSING_DISALLOWED:
          errorMessage = t(
            'page.signFooterBar.keystone.shouldOpenKeystoneHomePageError'
          );
          break;
        case StatusCode.PRS_PARSING_REJECTED:
          errorMessage = t('page.signFooterBar.keystone.hardwareRejectError');
          break;
        case StatusCode.PRS_PARSING_ERROR:
          errorMessage = error?.message;
          break;
        case StatusCode.PRS_PARSING_MISMATCHED_WALLET:
          errorMessage = t('page.signFooterBar.keystone.mismatchedWalletError');
          break;
        case StatusCode.PRS_PARSING_VERIFY_PASSWORD_ERROR:
          errorMessage = t('page.signFooterBar.keystone.verifyPasswordError');
          break;
        default:
          if (error.message.includes('No device selected')) {
            errorMessage = t('page.newAddress.keystone.noDeviceFoundError');
          } else {
            errorMessage = t('page.newAddress.hd.tooltip.disconnected');
          }
      }

      return errorMessage;
    },
    [t]
  );
};

export const useKeystoneUSBErrorCatcher = () => {
  const errorMessageGetter = useKeystoneUSBErrorMessage();

  return useCallback(
    (error: any) => {
      message.error(errorMessageGetter(error));
    },
    [errorMessageGetter]
  );
};
