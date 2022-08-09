import OneKeyConnect from '@onekeyfe/connect';

const ONEKEY_CONNECT_MANIFEST = {
  email: 'support@debank.com/',
  appUrl: 'https://debank.com/',
};

export class OneKeyKeyring {
  private async init() {
    OneKeyConnect.manifest(ONEKEY_CONNECT_MANIFEST);
  }

  getPublicKey = (params) => {
    return OneKeyConnect.getPublicKey(params);
  };

  ethereumSignTransaction = (params) => {
    return OneKeyConnect.ethereumSignTransaction(params);
  };

  ethereumSignMessage = (params) => {
    return OneKeyConnect.ethereumSignMessage(params);
  };

  ethereumSignMessageEIP712 = (params) => {
    return OneKeyConnect.ethereumSignMessageEIP712(params);
  };
}
