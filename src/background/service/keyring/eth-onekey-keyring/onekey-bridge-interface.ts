import type { CoreApi } from '@onekeyfe/hd-core';

export interface OneKeyBridgeInterface {
  init: () => Promise<void>;
  evmSignTransaction: CoreApi['evmSignTransaction'];
  evmSignMessage: CoreApi['evmSignMessage'];
  evmSignTypedData: CoreApi['evmSignTypedData'];
  searchDevices: CoreApi['searchDevices'];
  getPassphraseState: CoreApi['getPassphraseState'];
  evmGetPublicKey: CoreApi['evmGetPublicKey'];
  cancel: (connectId?: string) => Promise<void>;
  getDeviceState: CoreApi['getDeviceState'];
  setDeviceConnectProtocol?: (
    connectId: string,
    connectProtocol: 'V1' | 'V2' | undefined
  ) => void | Promise<void>;
  openWalletSession: CoreApi['openWalletSession'];
}
