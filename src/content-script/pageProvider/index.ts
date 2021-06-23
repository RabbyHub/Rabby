// this script is injected into webpage's context
import { EventEmitter } from 'events';
import { ethErrors, serializeError } from 'eth-rpc-errors';
import BroadcastChannelMessage from '@/utils/message/broadcastChannelMessage';
import PushEventHandlers from './pushEventHandlers';
import { domReadyCall, $ } from './utils';
import ReadyPromise from './readyPromise';
import DedupePromise from './dedupePromise';

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
  _initialized = false;

  private _pushEventHandlers: PushEventHandlers;
  private _requestPromise = new ReadyPromise(2);
  private _dedupePromise = new DedupePromise([
    'personal_sign',
    'wallet_addEthereumChain',
    'eth_sendTransaction',
    'eth_signTypedData',
    'eth_signTypedData_v1',
    'eth_signTypedData_v3',
    'eth_signTypedData_v4',
  ]);
  private _bcm = new BroadcastChannelMessage(channelName);

  constructor({ maxListeners = 100 } = {}) {
    super();
    this.setMaxListeners(maxListeners);
    this.initialize();
    this.shimLegacy();
    this._pushEventHandlers = new PushEventHandlers(this);
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
        method: 'tabCheckin',
        params: { icon, name, origin },
      });

      this._requestPromise.check(2);
    });

    try {
      const { chainId, accounts, networkVersion }: any = await this.request({
        method: 'getProviderState',
      });

      this._isConnected = true;
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
      this.emit('_initialized');
    }

    document.addEventListener(
      'visibilitychange',
      this._requestPromiseCheckVisibility
    );
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
    return this._isConnected;
  };

  // TODO: support multi request!
  request = async (data) => {
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

  // shim to matamask legacy api
  sendAsync = (payload, callback) => {
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
