// this script is injected into webpage's context
import EventEmitter from 'events';
import { ethErrors, serializeError } from 'eth-rpc-errors';
import { Message } from 'helper';

const { DomMessage } = Message;

class EthereumProvider extends EventEmitter {
  chainId = null;
  _hiddenRequests = [];

  constructor() {
    super();

    this.initialize();
    this.triggerHiddenRequest();
  }

  initialize = async () => {
    this.dm = new DomMessage('provider-cs').connect();
    this.dm.on('message', this.handleBackgroundMessage);

    const { accounts, chainId } = await this.request({
      method: 'getProviderState',
    });

    this.chainId = chainId;
    this.emit('connected', { chainId });
  };

  handleBackgroundMessage = ([type, data]) => {
    if (type === 'disconnect') {
      this.emit(type, ethErrors.provider.disconnected());

      return;
    }

    this.emit(type, data);
  };

  isConnected = () => {
    return true;
  };

  pushHiddenRequest = (data) => {
    return new Promise((resolve, reject) => {
      this._hiddenRequests.push({
        data,
        resolve,
        reject,
      });
    });
  };

  triggerHiddenRequest = async () => {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        for (let i = 0; i < this._hiddenRequests.length; i++) {
          const { data, resolve } = this._hiddenRequests.shift();
          resolve(this.dm.request(data));
        }
      }
    });
  };

  request = async (data) => {
    if (!data) {
      throw ethErrors.rpc.invalidRequest();
    }

    if (document.visibilityState !== 'visible') {
      return this.pushHiddenRequest(data);
    }

    return this.dm
      .request({ data })
      .catch((err) => Promise.reject(serializeError(err)));
  };

  // shim to matamask legacy api
  sendAsync = (payload, callback) => {
    this.request(payload)
      .then((result) => callback(null, { result }))
      .catch((error) => callback(error, { error }));
  };
}

window.ethereum = new EthereumProvider();
