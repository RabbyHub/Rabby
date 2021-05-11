// this script is injected into webpage's context
import { EventEmitter } from 'events';
import { ethErrors, serializeError } from 'eth-rpc-errors';
import DomMessage from '@/utils/message/domMessage';

class EthereumProvider extends EventEmitter {
  chainId = null;
  _hiddenRequests: any[] = [];
  dm: DomMessage | null = null;

  constructor() {
    super();

    this.initialize();
    this.triggerHiddenRequest();
  }

  initialize = async () => {
    this.dm = new DomMessage().connect();
    this.dm.on('message', this.handleBackgroundMessage);

    const { accounts, chainId }: any = await this.request({
      method: 'getProviderState',
    });

    this.chainId = chainId;
    this.emit('connected', { chainId });
  };

  handleBackgroundMessage = ({ event, data }) => {
    if (event === 'disconnect') {
      this.emit(event, ethErrors.provider.disconnected());

      return;
    }

    this.emit(event, data);
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
      if (!this.dm) return;

      if (document.visibilityState === 'visible') {
        for (let i = 0; i < this._hiddenRequests.length; i++) {
          const { data, resolve } = this._hiddenRequests.shift();
          resolve(this.dm.request(data));
        }
      }
    });
  };

  request = async (data) => {
    console.log('[request]', data);

    if (!data) {
      throw ethErrors.rpc.invalidRequest();
    }

    if (document.visibilityState !== 'visible') {
      return this.pushHiddenRequest(data);
    }

    if (!this.dm) return;

    return this.dm
      .request({ data })
      .then((res) => {
        console.log('[request: success]', res);

        return res;
      })
      .catch((err) => {
        console.log('[request: error]', err);

        return Promise.reject(serializeError(err));
      });
  };

  // shim to matamask legacy api
  sendAsync = (payload, callback) => {
    console.log('[request: sendAsync]', payload);
    this.request(payload)
      .then((result) => callback(null, { result }))
      .catch((error) => callback(error, { error }));
  };
}

window.ethereum = new EthereumProvider();
