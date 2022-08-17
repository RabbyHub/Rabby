import * as SDK from 'gridplus-sdk';

const SDK_TIMEOUT = 120000;
const CONNECT_TIMEOUT = 20000;

export class LatticeKeyring {
  app: null | SDK.Client;
  options: any;

  constructor(options?: any) {
    this.app = null;
    this.options = options;
  }

  async init() {
    this.app = new SDK.Client(this.options);
  }

  getStateData() {
    return this.app!.getStateData();
  }

  getActiveWallet() {
    return this.app!.getActiveWallet();
  }

  sign: SDK.Client['sign'] = (...params) => {
    return this.app!.sign(...params);
  };

  getAddresses: SDK.Client['getAddresses'] = (...params) => {
    return this.app!.getAddresses(...params);
  };

  getFwVersion: SDK.Client['getFwVersion'] = (...params) => {
    return this.app!.getFwVersion(...params);
  };

  // Attempt to connect with a Lattice using a shorter timeout. If
  // the device is unplugged it will time out and we don't need to wait
  // 2 minutes for that to happen.
  connect: SDK.Client['connect'] = async (...params) => {
    let result;
    try {
      this.app!.timeout = CONNECT_TIMEOUT;

      result = await this.app!.connect(...params);
    } finally {
      this.app!.timeout = SDK_TIMEOUT;
    }

    return result;
  };

  getTxDataType() {
    return window.txData?.type;
  }
}

declare global {
  interface Window {
    txData: any;
  }
}
