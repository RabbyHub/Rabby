import { DeviceManagementKitBuilder } from '@ledgerhq/device-management-kit';

import {
  webHidIdentifier,
  webHidTransportFactory,
} from '@ledgerhq/device-transport-kit-web-hid';
import { firstValueFrom } from 'rxjs';

export const isLedgerWebHIDSupported = () => {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.hid &&
    typeof navigator.hid.getDevices === 'function' &&
    typeof navigator.hid.requestDevice === 'function'
  );
};

export const requestLedgerHIDPermission = async () => {
  const dmk = new DeviceManagementKitBuilder()
    .addTransport(webHidTransportFactory)
    .build();

  try {
    await firstValueFrom(dmk.startDiscovering({ transport: webHidIdentifier }));
  } finally {
    await dmk.stopDiscovering().catch(() => {
      // Discovery may not have started if the browser rejected the prompt.
    });
    dmk.close();
  }
};
