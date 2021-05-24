// this script is injected into webpage's context
import { EventEmitter } from 'events';
import { ethErrors, serializeError } from 'eth-rpc-errors';
import BroadcastChannelMessage from '@/utils/message/broadcastChannelMessage';

const bcmChannel = new URLSearchParams(
  document!.currentScript!.getAttribute('src')!.split('?')[1]
).get('channel')!;

const log = (event, ...args) => {
  console.log(
    `%c [rabby] (${new Date().toTimeString().substr(0, 8)}) ${event}`,
    'font-weight: bold; color: #7d6ef9',
    ...args
  );
};

class EthereumProvider extends EventEmitter {
  chainId = null;
  isMetamask = true;
  private _hiddenRequests: any[] = [];
  private _bcm = new BroadcastChannelMessage(bcmChannel);

  constructor() {
    super();

    this.initialize();
    this.triggerHiddenRequest();
    this.shimLegacy();
  }

  initialize = async () => {
    this._bcm.connect().on('message', this.handleBackgroundMessage);

    try {
      const { chainId }: any = await this.request({
        method: 'getProviderState',
      });

      this.chainId = chainId;
      this.emit('connect', { chainId });
    } catch {
      //
    }
  };

  handleBackgroundMessage = ({ event, data }) => {
    log('[push event]', event, data);
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
      if (document.visibilityState === 'visible') {
        while (this._hiddenRequests.length) {
          const { data, resolve } = this._hiddenRequests.shift();

          log('[request:hidden]', data);
          resolve(
            this._bcm
              .request({ data })
              .then((res) => {
                log('[request:hidden: success]', res);

                return res;
              })
              .catch((err) => {
                log('[request:hidden: error]', err);

                return Promise.reject(serializeError(err));
              })
          );
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

    log('[request]', data);
    return this._bcm
      .request({ data })
      .then((res) => {
        log('[request: success]', res);

        return res;
      })
      .catch((err) => {
        log('[request: error]', err);

        return Promise.reject(serializeError(err));
      });
  };

  // shim to matamask legacy api
  sendAsync = (payload, callback) => {
    this.request(payload)
      .then((result) => callback(null, { result }))
      .catch((error) => callback(error, { error }));
  };

  shimLegacy = () => {
    const legacyMethods = [
      ['enable', 'eth_requestAccounts'],
      ['net_version', 'net_version'],
    ];

    for (const [_method, method] of legacyMethods) {
      this[_method] = () => this.request({ method });
    }
  };
}

declare global {
  interface Window {
    ethereum: EthereumProvider;
  }
}

window.ethereum = new Proxy(new EthereumProvider(), {
  get(target, prop, receiver) {
    log('*****i want****', prop);

    return Reflect.get(target, prop, receiver);
  },
});
