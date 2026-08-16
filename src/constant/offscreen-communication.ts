export enum OffscreenCommunicationTarget {
  latticeOffscreen = 'lattice-offscreen',
  imkeyOffscreen = 'imkey-offscreen',
  onekeyOffscreen = 'onekey-offscreen',
  trezorOffscreen = 'trezor-offscreen',
  trezorBrowser = 'trezor-browser',
  bitbox02Offscreen = 'bitbox02-offscreen',
  extension = 'extension-offscreen',
}

export enum OffscreenCommunicationEvents {
  imKeyDeviceConnect = 'imkey-device-connect',
  oneKeyDeviceConnect = 'onekey-device-connect',
  trezorDeviceEvent = 'trezor-device-event',
  bitbox02DeviceConnect = 'bitbox02-device-connect',
  latticeDeviceConnect = 'lattice-device-connect',
}

export enum ImKeyAction {
  unlock = 'imkey-unlock',
  cleanUp = 'imkey-clean-up',
  invokeApp = 'imkey-invoke-app',
}

export enum OneKeyAction {
  init = 'onekey-init',
  evmSignTransaction = 'onekey-evm-sign-transaction',
  evmSignMessage = 'onekey-evm-sign-message',
  evmSignTypedData = 'onekey-evm-sign-typed-data',
  searchDevices = 'onekey-search-devices',
  getPassphraseState = 'onekey-get-passphrase-state',
  evmGetPublicKey = 'onekey-evm-get-public-key',
  getFeatures = 'onekey-get-device-features',
}

export enum TrezorAction {
  init = 'trezor-init',
  dispose = 'trezor-dispose',
  getPublicKey = 'trezor-get-public-key',
  ethereumSignTransaction = 'trezor-sign-transaction',
  ethereumSignMessage = 'trezor-sign-message',
  ethereumSignTypedData = 'trezor-sign-typed-data',
}

export enum TrezorBrowserAction {
  getCurrentWindow = 'trezor-browser-get-current-window',
  createWindow = 'trezor-browser-create-window',
  queryTabs = 'trezor-browser-query-tabs',
  createTab = 'trezor-browser-create-tab',
  getTab = 'trezor-browser-get-tab',
  updateTab = 'trezor-browser-update-tab',
  removeTab = 'trezor-browser-remove-tab',
}

export enum BitBox02Action {
  init = 'bitbox02-init',
  ethSign1559Transaction = 'bitbox02-sign-1559-transaction',
  ethSignTransaction = 'bitbox02-sign-transaction',
  ethSignMessage = 'bitbox02-sign-message',
  ethSignTypedMessage = 'bitbox02-sign-typed-message',
  ethXpub = 'bitbox02-xpub',
}

export enum LatticeAction {
  getCreds = 'lattice-get-creds',
}
/**
 * Defines domain origins that we expect to interface with in our offscreen
 * document. Any reference to a domain as an origin should use this enum
 * instead of constants or literals so that it can be managed and overviewed.
 */
export enum KnownOrigins {
  lattice = 'https://lattice.gridplus.io',
}

export enum LedgerAction {
  ledgerDeviceDisconnect = 'ledger-device-disconnect',
}
