// this script is injected into webpage's context
import { EventEmitter } from 'events';
import { ethErrors, serializeError } from 'eth-rpc-errors';
import BroadcastChannelMessage from '@/utils/message/broadcastChannelMessage';
import PushEventHandlers from './pushEventHandlers';
import { domReadyCall, $ } from './utils';
import ReadyPromise from '../readyPromise';

declare const channelName;

const log = (event, ...args) => {
  console.log(
    `%c [rabby] (${new Date().toTimeString().substr(0, 8)}) ${event}`,
    'font-weight: bold; background-color: #7d6ef9; color: white;',
    ...args
  );
};

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
  _isConnected = false;

  private pushEventHandlers: PushEventHandlers;
  private requestPromise = new ReadyPromise(2);
  private _bcm = new BroadcastChannelMessage(channelName);

  constructor({ maxListeners = 100 } = {}) {
    super();
    this.setMaxListeners(maxListeners);
    this.initialize();
    this.shimLegacy();
    this.pushEventHandlers = new PushEventHandlers(this);
  }

  initialize = async () => {
    this._bcm.connect().on('message', this._handleBackgroundMessage);

    domReadyCall(() => {
      const origin = top.location.origin;
      const icon =
        ($('head > link[rel~="icon"]') as HTMLLinkElement)?.href ||
        ($('head > meta[itemprop="image"]') as HTMLMetaElement)?.content;

      const name =
        document.title ||
        ($('head > meta[name="title"]') as HTMLMetaElement)?.content ||
        origin;

      this._bcm.request({
        data: {
          method: 'tabCheckin',
          params: { icon, name, origin },
        },
      });

      this.requestPromise.check(2);
    });

    try {
      const { chainId, accounts, networkVersion }: any = await this.request({
        method: 'getProviderState',
      });

      this._isConnected = true;
      this.chainId = chainId;
      this.networkVersion = networkVersion;
      this.emit('connect', { chainId });
      this.pushEventHandlers.chainChanged({
        chain: chainId,
        networkVersion,
      });
      this.pushEventHandlers.accountsChanged(accounts);
    } catch {
      //
    }

    document.addEventListener(
      'visibilitychange',
      this._requestPromiseCheckVisibility
    );
    this.emit('_initialized');
  };

  private _requestPromiseCheckVisibility = () => {
    if (document.visibilityState === 'visible') {
      this.requestPromise.check(1);
    } else {
      this.requestPromise.uncheck(1);
    }
  };

  private _handleBackgroundMessage = ({ event, data }) => {
    log('[push event]', event, data);
    if (this.pushEventHandlers[event]) {
      return this.pushEventHandlers[event](data);
    }

    this.emit(event, data);
  };

  isConnected = () => {
    return this._isConnected;
  };

  request = async (data) => {
    if (!data) {
      throw ethErrors.rpc.invalidRequest();
    }

    this._requestPromiseCheckVisibility();

    return this.requestPromise.call(() => {
      if (data.method !== 'eth_call') {
        log('[request]', JSON.stringify(data, null, 2));
      }

      return this._bcm
        .request({ data })
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

  // shim to matamask legacy api
  sendAsync = (payload, callback) => {
    log('[sendAsync]', payload);
    const { method, params, ...rest } = payload;
    this.request({ method, params })
      .then((result) => callback(null, { ...rest, method, result }))
      .catch((error) => callback(error, { ...rest, method, error }));
  };

  send = (payload, callback?) => {
    if (typeof payload === 'string' && (!callback || Array.isArray(callback))) {
      // send(method, params? = [])
      return this.request({ method: payload, params: callback });
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

      // case 'eth_uninstallFilter':
      //   this.request(payload);
      //   result = true;
      //   break;

      case 'net_version':
        result = this.networkVersion || null;
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
}

declare global {
  interface Window {
    ethereum: EthereumProvider;
  }
}

const provider = new EthereumProvider();

window.ethereum = new Proxy(provider, {
  deleteProperty: () => true,
});

window.dispatchEvent(new Event('ethereum#initialized'));
