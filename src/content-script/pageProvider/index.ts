// this script is injected into webpage's context
import { EventEmitter } from 'events';
import { ethErrors, serializeError } from 'eth-rpc-errors';
import BroadcastChannelMessage from '@/utils/message/broadcastChannelMessage';
import PushEventHandlers from './pushEventHandlers';
import { domReadyCall, $ } from './utils';
import ReadyPromise from './readyPromise';
import DedupePromise from './dedupePromise';
import { DEXPriceComparison, isUrlMatched } from '@rabby-wallet/widgets';
import { switchChainNotice } from './interceptors/switchChain';
import { switchWalletNotice } from './interceptors/switchWallet';

window.postMessage({
  type: 'rabby:pageProvider:ready',
});

window.addEventListener('message', (event) => {
  if (event.data.type === 'rabby:pageProvider:channelName') {
    const channelName = event.data.data.channelName;
    setup(channelName);
  }
});

const log = (event, ...args) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(
      `%c [rabby] (${new Date().toTimeString().substr(0, 8)}) ${event}`,
      'font-weight: bold; background-color: #7d6ef9; color: white;',
      ...args
    );
  }
};

export interface Interceptor {
  onRequest?: (data: any) => any;
  onResponse?: (res: any, data: any) => any;
}

interface StateProvider {
  accounts: string[] | null;
  isConnected: boolean;
  isUnlocked: boolean;
  initialized: boolean;
  isPermanentlyDisconnected: boolean;
}

export class EthereumProvider extends EventEmitter {
  chainId: string | null = null;
  selectedAddress: string | null = null;
  /**
   * The network ID of the currently connected Ethereum chain.
   * @deprecated
   */
  networkVersion: string | null = null;
  isRabby = true;
  isMetaMask = true;

  _isReady = false;
  _isConnected = false;
  _initialized = false;
  _isUnlocked = false;

  _cacheRequestsBeforeReady: any[] = [];
  _cacheEventListenersBeforeReady: [string | symbol, () => any][] = [];

  _state: StateProvider = {
    accounts: null,
    isConnected: false,
    isUnlocked: false,
    initialized: false,
    isPermanentlyDisconnected: false,
  };

  _metamask = {
    isUnlocked: () => {
      return new Promise((resolve) => {
        resolve(this._isUnlocked);
      });
    },
  };

  private _pushEventHandlers: PushEventHandlers;
  private _requestPromise = new ReadyPromise(2);
  private _dedupePromise = new DedupePromise([]);
  private _bcm: BroadcastChannelMessage;

  constructor({ maxListeners = 100, channelName = '' } = {}) {
    super();
    this._bcm = new BroadcastChannelMessage(channelName);
    this.setMaxListeners(maxListeners);
    this.initialize();
    this.shimLegacy();
    this._pushEventHandlers = new PushEventHandlers(this);
  }

  initialize = async () => {
    document.addEventListener(
      'visibilitychange',
      this._requestPromiseCheckVisibility
    );

    this._bcm.connect().on('message', this._handleBackgroundMessage);
    domReadyCall(() => {
      const origin = location.origin;
      const icon =
        ($('head > link[rel~="icon"]') as HTMLLinkElement)?.href ||
        ($('head > meta[itemprop="image"]') as HTMLMetaElement)?.content;

      const name =
        document.title ||
        ($('head > meta[name="title"]') as HTMLMetaElement)?.content ||
        origin;

      this._bcm.request({
        method: 'tabCheckin',
        params: { icon, name, origin },
      });

      this._requestPromise.check(2);
    });

    try {
      const {
        chainId,
        accounts,
        networkVersion,
        isUnlocked,
      }: any = await this.requestInternalMethods({
        method: 'getProviderState',
      });
      if (isUnlocked) {
        this._isUnlocked = true;
        this._state.isUnlocked = true;
      }
      this.chainId = chainId;
      this.networkVersion = networkVersion;
      this.emit('connect', { chainId });
      this._pushEventHandlers.chainChanged({
        chain: chainId,
        networkVersion,
      });

      this._pushEventHandlers.accountsChanged(accounts);
    } catch {
      //
    } finally {
      this._initialized = true;
      this._state.initialized = true;
      this.emit('_initialized');
    }
  };

  private _requestPromiseCheckVisibility = () => {
    if (document.visibilityState === 'visible') {
      this._requestPromise.check(1);
    } else {
      this._requestPromise.uncheck(1);
    }
  };

  private _handleBackgroundMessage = ({ event, data }) => {
    log('[push event]', event, data);
    if (this._pushEventHandlers[event]) {
      return this._pushEventHandlers[event](data);
    }

    this.emit(event, data);
  };

  isConnected = () => {
    return true;
  };

  // TODO: support multi request!
  request = async (data) => {
    if (!this._isReady) {
      const promise = new Promise((resolve, reject) => {
        this._cacheRequestsBeforeReady.push({
          data,
          resolve,
          reject,
        });
      });
      return promise;
    }
    return this._dedupePromise.call(data.method, () => this._request(data));
  };

  _request = async (data) => {
    if (!data) {
      throw ethErrors.rpc.invalidRequest();
    }

    this._requestPromiseCheckVisibility();

    return this._requestPromise.call(() => {
      if (data.method !== 'eth_call') {
        log('[request]', JSON.stringify(data, null, 2));
      }

      return this._bcm
        .request(data)
        .then((res) => {
          if (data.method !== 'eth_call') {
            log('[request: success]', data.method, res);
          }
          return res;
        })
        .catch((err) => {
          if (data.method !== 'eth_call') {
            log('[request: error]', data.method, serializeError(err));
          }
          throw serializeError(err);
        });
    });
  };

  requestInternalMethods = (data) => {
    return this._dedupePromise.call(data.method, () => this._request(data));
  };

  // shim to matamask legacy api
  sendAsync = (payload, callback) => {
    if (Array.isArray(payload)) {
      return Promise.all(
        payload.map(
          (item) =>
            new Promise((resolve) => {
              this.sendAsync(item, (err, res) => {
                // ignore error
                resolve(res);
              });
            })
        )
      ).then((result) => callback(null, result));
    }
    const { method, params, ...rest } = payload;
    this.request({ method, params })
      .then((result) => callback(null, { ...rest, method, result }))
      .catch((error) => callback(error, { ...rest, method, error }));
  };

  send = (payload, callback?) => {
    if (typeof payload === 'string' && (!callback || Array.isArray(callback))) {
      // send(method, params? = [])
      return this.request({
        method: payload,
        params: callback,
      }).then((result) => ({
        id: undefined,
        jsonrpc: '2.0',
        result,
      }));
    }

    if (typeof payload === 'object' && typeof callback === 'function') {
      return this.sendAsync(payload, callback);
    }

    let result;
    switch (payload.method) {
      case 'eth_accounts':
        result = this.selectedAddress ? [this.selectedAddress] : [];
        break;

      case 'eth_coinbase':
        result = this.selectedAddress || null;
        break;

      default:
        throw new Error('sync method doesnt support');
    }

    return {
      id: payload.id,
      jsonrpc: payload.jsonrpc,
      result,
    };
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

  on = (event: string | symbol, handler: (...args: any[]) => void) => {
    if (!this._isReady) {
      this._cacheEventListenersBeforeReady.push([event, handler]);
      return this;
    }
    return super.on(event, handler);
  };
}

declare global {
  interface Window {
    ethereum: EthereumProvider;
  }
}

function setup(channelName: string) {
  const provider = new EthereumProvider({
    channelName,
  });
  let cacheOtherProvider: EthereumProvider | null = null;
  const rabbyProvider = new Proxy(provider, {
    deleteProperty: (target, prop) => {
      if (prop === 'on' || prop === 'isRabby') {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        delete target[prop];
      }
      return true;
    },
  });

  provider
    .requestInternalMethods({ method: 'isDefaultWallet' })
    .then((isDefaultWallet) => {
      rabbyProvider.on('defaultWalletChanged', switchWalletNotice);
      let finalProvider: EthereumProvider | null = null;
      if (isDefaultWallet || !cacheOtherProvider) {
        finalProvider = rabbyProvider;
        Object.keys(finalProvider).forEach((key) => {
          window.ethereum[key] = (finalProvider as EthereumProvider)[key];
        });
        Object.defineProperty(window, 'ethereum', {
          set() {
            provider.requestInternalMethods({
              method: 'hasOtherProvider',
              params: [],
            });
            return finalProvider;
          },
          get() {
            return finalProvider;
          },
        });
        if (!window.web3) {
          window.web3 = {
            currentProvider: rabbyProvider,
          };
        }
        finalProvider._isReady = true;
        finalProvider.on('rabby:chainChanged', switchChainNotice);
        const widgets = [DEXPriceComparison];
        widgets.forEach((Widget) => {
          provider
            .request({
              method: 'isWidgetDisabled',
              params: [Widget.widgetName],
            })
            .then((isDisabled) => {
              if (!isDisabled) {
                const rule = isUrlMatched(location.href, Widget.include);
                if (rule) {
                  new Widget(rule);
                }
              }
            });
        });
      } else {
        finalProvider = cacheOtherProvider;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        delete rabbyProvider.on;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        delete rabbyProvider.isRabby;
        Object.keys(finalProvider).forEach((key) => {
          window.ethereum[key] = (finalProvider as EthereumProvider)[key];
        });
        const keys = ['selectedAddress', 'chainId', 'networkVersion'];
        keys.forEach((key) => {
          Object.defineProperty(cacheOtherProvider, key, {
            get() {
              return window.ethereum[key];
            },
            set(val) {
              window.ethereum[key] = val;
            },
          });
        });
      }
      provider._cacheEventListenersBeforeReady.forEach(([event, handler]) => {
        (finalProvider as EthereumProvider).on(event, handler);
      });
      provider._cacheRequestsBeforeReady.forEach(
        ({ resolve, reject, data }) => {
          (finalProvider as EthereumProvider)
            .request(data)
            .then(resolve)
            .catch(reject);
        }
      );
    });

  if (window.ethereum) {
    cacheOtherProvider = window.ethereum;
    provider.requestInternalMethods({
      method: 'hasOtherProvider',
      params: [],
    });
  }

  window.ethereum = rabbyProvider;

  Object.defineProperty(window, 'ethereum', {
    set(val) {
      provider.requestInternalMethods({
        method: 'hasOtherProvider',
        params: [],
      });
      cacheOtherProvider = val;
    },
    get() {
      return rabbyProvider;
    },
  });

  if (!window.web3) {
    window.web3 = {
      currentProvider: window.ethereum,
    };
  }

  window.dispatchEvent(new Event('ethereum#initialized'));
}
