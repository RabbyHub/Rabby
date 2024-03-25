export enum OffscreenCommunicationTarget {
  latticeOffscreen = 'lattice-offscreen',
  imkeyOffscreen = 'imkey-offscreen',
  onekeyOffscreen = 'onekey-offscreen',
  bitbox02Offscreen = 'bitbox02-offscreen',
  extension = 'extension-offscreen',
}

export enum OffscreenCommunicationEvents {
  imKeyDeviceConnect = 'imkey-device-connect',
  oneKeyDeviceConnect = 'onekey-device-connect',
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
