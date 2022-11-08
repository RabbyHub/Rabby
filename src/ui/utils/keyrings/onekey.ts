import { sleep } from '@/background/utils';
import OneKeyConnect from '@onekeyfe/connect';

const ONEKEY_CONNECT_MANIFEST = {
  email: 'support@debank.com/',
  appUrl: 'https://debank.com/',
};

export class OneKeyKeyring {
  initiated = false;

  async init() {
    this.initiated = false;
    try {
      await OneKeyConnect.init({
        manifest: ONEKEY_CONNECT_MANIFEST,
      });
      this.initiated = true;
    } catch (e) {
      // ignore init error
      this.close();
      this.init();
    }
    return;
  }
  close() {
    OneKeyConnect.dispose();
  }

  async waitInit() {
    while (!this.initiated) {
      await sleep(500);
    }
  }

  async getPublicKey(params) {
    await this.waitInit();
    return OneKeyConnect.getPublicKey(params);
  }

  async ethereumSignTransaction(params) {
    await this.waitInit();
    return OneKeyConnect.ethereumSignTransaction(params);
  }

  async ethereumSignMessage(params) {
    await this.waitInit();
    return OneKeyConnect.ethereumSignMessage(params);
  }

  async ethereumSignMessageEIP712(params) {
    await this.waitInit();
    return OneKeyConnect.ethereumSignMessageEIP712(params);
  }
}
