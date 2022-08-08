import TransportWebHID from '@ledgerhq/hw-transport-webhid';
import LedgerEth from '@ledgerhq/hw-app-eth';
import Transport from '@ledgerhq/hw-transport';

export class LedgerKeyring {
  transport: null | Transport;
  app: null | LedgerEth;

  static type: 'LEDGER';

  constructor(options?: any) {
    this.transport = null;
    this.app = null;
    this.init();
  }

  private async init() {
    this.transport = await TransportWebHID.create();
    this.app = new LedgerEth(this.transport);
  }

  close() {
    this.app = null;
    if (this.transport) this.transport.close();
    this.transport = null;
  }

  getAddress: LedgerEth['getAddress'] = (...rest) => {
    return this.app!.getAddress(...rest);
  };

  signTransaction: LedgerEth['signTransaction'] = (...rest) => {
    return this.app!.signTransaction(...rest);
  };

  signPersonalMessage: LedgerEth['signPersonalMessage'] = (...rest) => {
    return this.app!.signPersonalMessage(...rest);
  };

  signEIP712HashedMessage: LedgerEth['signEIP712HashedMessage'] = (...rest) => {
    return this.app!.signEIP712HashedMessage(...rest);
  };
}
