import { ethErrors } from 'eth-rpc-errors';
import { EthereumProvider } from './index';

class PushEventHandlers {
  provider: EthereumProvider;

  constructor(provider) {
    this.provider = provider;
  }

  _emit(event, data) {
    if (this.provider._initialized) {
      this.provider.emit(event, data);
    }
  }

  connect = (data) => {
    if (!this.provider._isConnected) {
      this.provider._isConnected = true;
      this._emit('connect', data);
    }
  };

  disconnect = () => {
    this.provider._isConnected = false;
    this.provider.selectedAddress = null;
    const disconnectError = ethErrors.provider.disconnected();

    this._emit('accountsChanged', []);
    this._emit('disconnect', disconnectError);
    this._emit('close', disconnectError);
  };

  accountsChanged = (accounts) => {
    if (accounts?.[0] === this.provider.selectedAddress) {
      return;
    }

    this.provider.selectedAddress = accounts?.[0];
    this._emit('accountsChanged', accounts);
  };

  chainChanged = ({ chain, networkVersion }) => {
    this.connect({ chainId: chain });

    if (chain !== this.provider.chainId) {
      this.provider.chainId = chain;
      this._emit('chainChanged', chain);
    }

    if (networkVersion !== this.provider.networkVersion) {
      this.provider.networkVersion = networkVersion;
      this._emit('networkChanged', networkVersion);
    }
  };
}

export default PushEventHandlers;
