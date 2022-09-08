import TrezorConnect from 'trezor-connect';

const TREZOR_CONNECT_MANIFEST = {
  email: 'support@debank.com/',
  appUrl: 'https://debank.com/',
};

export class TrezorKeyring {
  async init() {
    return TrezorConnect.init({ manifest: TREZOR_CONNECT_MANIFEST });
  }

  async getPublicKey(params) {
    return TrezorConnect.getPublicKey(params);
  }

  async ethereumSignTransaction(params) {
    return TrezorConnect.ethereumSignTransaction(params);
  }

  async ethereumSignMessage(params) {
    return TrezorConnect.ethereumSignMessage(params);
  }

  async ethereumSignTypedData(params) {
    return TrezorConnect.ethereumSignTypedData(params);
  }

  close() {
    // This removes the Trezor Connect iframe from the DOM
    // This method is not well documented, but the code it calls can be seen
    // here: https://github.com/trezor/connect/blob/dec4a56af8a65a6059fb5f63fa3c6690d2c37e00/src/js/iframe/builder.js#L181
    TrezorConnect.dispose();
  }
}
