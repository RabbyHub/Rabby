// this script is injected into webpage's context
import { EventEmitter } from 'events';
import { ethErrors, serializeError } from 'eth-rpc-errors';
import BroadcastChannelMessage from '@/utils/message/broadcastChannelMessage';
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

class EthereumProvider extends EventEmitter {
  chainId: string | null = null;
  accounts: string[] = [];
  /**
   * The network ID of the currently connected Ethereum chain.
   * @deprecated
   */
  networkVersion: string | null = null;
  isMetaMask = true;

  private _isConnected = false;
  private requestPromise = new ReadyPromise(2);
  private _bcm = new BroadcastChannelMessage(channelName);

  constructor() {
    super();
    this.initialize();
    this.shimLegacy();
  }

  initialize = async () => {
    this._bcm.connect().on('message', this.handleBackgroundMessage);

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

      this.chainId = chainId;
      this.accounts = accounts;
      this.networkVersion = networkVersion;
      this.emit('connect', { chainId });
      this._isConnected = true;
    } catch {
      //
    }

    document.addEventListener(
      'visibilitychange',
      this._requestPromiseCheckVisibility
    );
  };

  _requestPromiseCheckVisibility = () => {
    if (document.visibilityState === 'visible') {
      this.requestPromise.check(1);
    } else {
      this.requestPromise.uncheck(1);
    }
  };

  handleBackgroundMessage = ({ event, data }) => {
    log('[push event]', event, data);
    if (event === 'disconnect') {
      this.emit(event, ethErrors.provider.disconnected());
      this._isConnected = false;
      return;
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
      log('[request]', JSON.stringify(data, null, 2));

      return this._bcm
        .request({ data })
        .then((res) => {
          log('[request: success]', res);

          return res;
        })
        .catch((err) => {
          log('[request: error]', err);

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
        result = this.accounts;
        break;

      case 'eth_coinbase':
        result = this.accounts[0];
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
