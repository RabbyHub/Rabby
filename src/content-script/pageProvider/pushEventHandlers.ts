import { ethErrors } from 'eth-rpc-errors';
import { EthereumProvider } from './index';

class PushEventHandlers {
  provider: EthereumProvider;

  constructor(provider) {
    this.provider = provider;
  }

  disconnect = () => {
    this.provider._isConnected = false;
    this.provider.selectedAddress = null;
    this.provider.emit('disconnect', ethErrors.provider.disconnected());
  };

  accountsChanged = (accounts) => {
    if (accounts?.[0] === this.provider.selectedAddress) {
      return;
    }
    this.provider.selectedAddress = accounts?.[0];
    this.provider.emit('accountsChanged', accounts);
  };

  chainChanged = ({ chain, networkVersion }) => {
    if (chain !== this.provider.chainId) {
      this.provider.chainId = chain;
      this.provider.emit('chainChanged', chain);
    }

    if (networkVersion !== this.provider.networkVersion) {
      this.provider.networkVersion = networkVersion;
      this.provider.emit('networkChanged', networkVersion);
    }
  };
}

export default PushEventHandlers;
