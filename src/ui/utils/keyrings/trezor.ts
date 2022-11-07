import { sleep } from '@/background/utils';
import TrezorConnect from 'trezor-connect';

const TREZOR_CONNECT_MANIFEST = {
  email: 'support@debank.com/',
  appUrl: 'https://debank.com/',
};

export class TrezorKeyring {
  initiated = false;

  async init() {
    this.initiated = false;
    try {
      await TrezorConnect.init({ manifest: TREZOR_CONNECT_MANIFEST });
      this.initiated = true;
    } catch (e) {
      // ignore init error
      this.close();
      this.init();
    }
    return;
  }

  async waitInit() {
    while (!this.initiated) {
      await sleep(500);
    }
  }

  async getPublicKey(params) {
    await this.waitInit();
    return TrezorConnect.getPublicKey(params);
  }

  async ethereumSignTransaction(params) {
    await this.waitInit();
    return TrezorConnect.ethereumSignTransaction(params);
  }

  async ethereumSignMessage(params) {
    await this.waitInit();
    return TrezorConnect.ethereumSignMessage(params);
  }

  async ethereumSignTypedData(params) {
    await this.waitInit();
    return TrezorConnect.ethereumSignTypedData(params);
  }

  close() {
    // This removes the Trezor Connect iframe from the DOM
    // This method is not well documented, but the code it calls can be seen
    // here: https://github.com/trezor/connect/blob/dec4a56af8a65a6059fb5f63fa3c6690d2c37e00/src/js/iframe/builder.js#L181
    TrezorConnect.dispose();
  }
}
