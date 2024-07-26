import { KEYRING_CLASS } from '@/constant';

export const WaitingSignComponent = {
  [KEYRING_CLASS.WALLETCONNECT]: 'WatchAddressWaiting',
  [KEYRING_CLASS.HARDWARE.KEYSTONE]: 'QRHardWareWaiting',
  [KEYRING_CLASS.HARDWARE.LEDGER]: 'LedgerHardwareWaiting',
  [KEYRING_CLASS.HARDWARE.GRIDPLUS]: 'CommonWaiting',
  [KEYRING_CLASS.HARDWARE.ONEKEY]: 'CommonWaiting',
  [KEYRING_CLASS.HARDWARE.TREZOR]: 'CommonWaiting',
  [KEYRING_CLASS.HARDWARE.BITBOX02]: 'CommonWaiting',
  [KEYRING_CLASS.MNEMONIC]: 'PrivatekeyWaiting',
  [KEYRING_CLASS.PRIVATE_KEY]: 'PrivatekeyWaiting',
  [KEYRING_CLASS.Coinbase]: 'CoinbaseWaiting',
  [KEYRING_CLASS.HARDWARE.IMKEY]: 'ImKeyHardwareWaiting',
};

export const WaitingSignMessageComponent = {
  [KEYRING_CLASS.WALLETCONNECT]: 'WatchAddressWaiting',
  [KEYRING_CLASS.HARDWARE.KEYSTONE]: 'QRHardWareWaiting',
  [KEYRING_CLASS.HARDWARE.LEDGER]: 'LedgerHardwareWaiting',
  [KEYRING_CLASS.HARDWARE.GRIDPLUS]: 'CommonWaiting',
  [KEYRING_CLASS.HARDWARE.ONEKEY]: 'CommonWaiting',
  [KEYRING_CLASS.HARDWARE.TREZOR]: 'CommonWaiting',
  [KEYRING_CLASS.HARDWARE.BITBOX02]: 'CommonWaiting',
  [KEYRING_CLASS.Coinbase]: 'CoinbaseWaiting',
  [KEYRING_CLASS.HARDWARE.IMKEY]: 'ImKeyHardwareWaiting',
  [KEYRING_CLASS.MNEMONIC]: 'PrivatekeyWaiting',
  [KEYRING_CLASS.PRIVATE_KEY]: 'PrivatekeyWaiting',
};
