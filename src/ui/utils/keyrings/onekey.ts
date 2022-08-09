import OneKeyConnect from '@onekeyfe/connect';

const ONEKEY_CONNECT_MANIFEST = {
  email: 'support@debank.com/',
  appUrl: 'https://debank.com/',
};

export class OneKeyKeyring {
  async init() {
    return OneKeyConnect.manifest(ONEKEY_CONNECT_MANIFEST);
  }

  async getPublicKey(params) {
    return OneKeyConnect.getPublicKey(params);
  }

  async ethereumSignTransaction(params) {
    return OneKeyConnect.ethereumSignTransaction(params);
  }

  async ethereumSignMessage(params) {
    return OneKeyConnect.ethereumSignMessage(params);
  }

  async ethereumSignMessageEIP712(params) {
    return OneKeyConnect.ethereumSignMessageEIP712(params);
  }
}
