// this script is injected into webpage's context
import EventEmitter from 'events';
import { Message } from 'helper';

const { DomMessage } = Message;

class EthereumProvider extends EventEmitter {
  chainId = null;
  _hiddenRequests = [];

  constructor() {
    super();

    this.initialize();
    this.processHiddenRequest();
  }

  initialize = async () => {
    this.dm = new DomMessage('provider-cs').connect();
    // for event listen
    this.dm.on('message', ([type, data]) => {
      console.log('type', type);

      if (type === 'disconnect') {
        this.emit(
          type,
          new CloseEvent('closed', {
            code: 1000,
          })
        );

        return;
      }
      this.emit(type, data);
    });

    const { accounts, chainId } = await this.request({
      method: 'getProviderState',
    });

    this.chainId = chainId;
    this.emit('connected', { chainId });
  };

  isConnected = () => {
    return true;
  };

  processHiddenRequest = async () => {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        for (let i = 0; i < this._hiddenRequests.length; i++) {
          const { data, resolve } = this._hiddenRequests.shift();
          resolve(this.dm.request(data));
        }
      }
    });
  };

  request = (args) => {
    if (!args) {
      throw new Error('xxxx');
    }

    if (document.visibilityState !== 'visible') {
      return new Promise((resolve, reject) => {
        this._hiddenRequests.push({
          data: args,
          resolve,
          reject,
        });
      });
    }

    return this.dm.request({ data: args });
  };

  // shim to matamask legacy api
  sendAsync = (payload, callback) => {
    this.request(payload)
      .then((result) => callback(null, { result }))
      .catch((err) => callback(err, { error: new Error('reject') }));
  };
}

window.ethereum = new EthereumProvider();
