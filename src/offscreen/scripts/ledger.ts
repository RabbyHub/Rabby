import {
  LedgerAction,
  OffscreenCommunicationTarget,
} from '@/constant/offscreen-communication';
import { ledgerUSBVendorId } from '@ledgerhq/devices';
import Browser from 'webextension-polyfill';

export function initLedger() {
  navigator.hid.addEventListener('disconnect', ({ device }) => {
    if (device.vendorId === ledgerUSBVendorId) {
      Browser.runtime.sendMessage({
        target: OffscreenCommunicationTarget.extension,
        event: LedgerAction.ledgerDeviceDisconnect,
      });
    }
  });
}
