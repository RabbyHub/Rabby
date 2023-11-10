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

export const useExportAddressViaUSBErrorCatcher = () => {
  const { t } = useTranslation();

  return useCallback(
    (error: any) => {
      switch (error?.code) {
        case StatusCode.PRS_EXPORT_ADDRESS_DISALLOWED:
          if (error.message.includes('locked')) {
            message.error(t('page.newAddress.keystone.deviceIsLockedError'));
          } else {
            message.error(
              t('page.newAddress.keystone.exportAddressJustAllowedOnHomePage')
            );
          }
          break;
        case StatusCode.PRS_EXPORT_ADDRESS_REJECTED:
          message.error(
            t('page.newAddress.keystone.deviceRejectedExportAddress')
          );
          break;
        default:
          if (error.message.includes('No device selected')) {
            message.error(t('page.newAddress.keystone.noDeviceFoundError'));
          } else {
            message.error(t('page.newAddress.hd.tooltip.disconnected'));
          }
      }
    },
    [t]
  );
};
