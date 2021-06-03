import { ethErrors } from 'eth-rpc-errors';

class PushEventHandlers {
  provider: any;

  constructor(provider) {
    this.provider = provider;
  }

  disconnect = () => {
    this.provider._isConnected = false;
    this.provider.selectedAddress = null;
    this.provider.emit('disconnect', ethErrors.provider.disconnected());
  };

  accountsChanged = (accounts) => {
    this.provider.selectedAddress = accounts?.[0];
    this.provider.emit('accountsChanged', accounts);
  };
}

export default PushEventHandlers;
