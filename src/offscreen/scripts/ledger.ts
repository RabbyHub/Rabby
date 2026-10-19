import {
  LedgerAction,
  OffscreenCommunicationTarget,
} from '@/constant/offscreen-communication';
import { ledgerUSBVendorId } from '@ledgerhq/devices';
import Browser from 'webextension-polyfill';

const relayLedgerEvent = (event: LedgerAction) => ({
  device,
}: HIDConnectionEvent) => {
  if (device.vendorId === ledgerUSBVendorId) {
    Browser.runtime.sendMessage({
      target: OffscreenCommunicationTarget.extension,
      event,
      productId: device.productId,
    });
  }
};

export function initLedger() {
  navigator.hid?.addEventListener(
    'disconnect',
    relayLedgerEvent(LedgerAction.ledgerDeviceDisconnect)
  );
  // Only feeds the reconnect diagnostics in the Ledger keyring.
  navigator.hid?.addEventListener(
    'connect',
    relayLedgerEvent(LedgerAction.ledgerDeviceConnect)
  );
}
