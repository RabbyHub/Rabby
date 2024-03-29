// this script is injected into webpage's context
import { EventEmitter } from 'events';
import providerController from '../controller/provider/controller';
import preferenceService from 'background/service/preference';
import notificationService from 'background/service/notification';
import wallet from '../controller/wallet';
import { CHAINS, INTERNAL_REQUEST_SESSION, CHAINS_ENUM } from 'consts';
import { underline2Camelcase } from 'background/utils';
import { findChain } from '@/utils/chain';

interface StateProvider {
  accounts: string[] | null;
  isConnected: boolean;
  isUnlocked: boolean;
  initialized: boolean;
  isPermanentlyDisconnected: boolean;
}

export class EthereumProvider extends EventEmitter {
  currentAccount = '';
  currentAccountType = '';
  currentAccountBrand = '';
  chainId: string | null = null;
  selectedAddress: string | null = null;
  $ctx?: any;

  /**
   * The network ID of the currently connected Ethereum chain.
   * @deprecated
   */
  networkVersion: string | null = null;
  isRabby = true;
  isMetaMask = true;

  _isConnected = true;
  _initialized = true;
  _isUnlocked = true;

  _state: StateProvider = {
    accounts: null,
    isConnected: true,
    isUnlocked: true,
    initialized: true,
    isPermanentlyDisconnected: false,
  };

  _metamask = {
    isUnlocked: () => {
      return new Promise((resolve) => {
        resolve(this._isUnlocked);
      });
    },
  };

  constructor() {
    super();
    this.initialize();
    this.shimLegacy();
  }

  initialize = async () => {
    this._initialized = true;
    this._state.initialized = true;
    this.emit('_initialized');
  };

  isConnected = () => {
    return true;
  };

  // TODO: support multi request!
  request = async (data) => {
    const { method } = data;
    const request = {
      data,
      session: INTERNAL_REQUEST_SESSION,
    };
    const mapMethod = underline2Camelcase(method);
    const currentAccount = preferenceService.getCurrentAccount()!;
    const networkId = this.chainId || CHAINS[CHAINS_ENUM.ETH].id.toString();

    const chain = findChain({
      networkId: networkId,
    });
    if (!chain) {
      throw new Error('chain not found');
    }
    if (!providerController[mapMethod]) {
      // TODO: make rpc whitelist
      if (method.startsWith('eth_') || method === 'net_version') {
        return providerController.ethRpc(request, chain.serverId);
      }
    }
    switch (data.method) {
      case 'eth_accounts':
      case 'eth_requestAccounts':
        return [this.currentAccount];
      case 'personal_sign':
        return new Promise((resolve, reject) => {
          notificationService.on('resolve', (data) => {
            if (data.uiRequestComponent) return;
            resolve(data);
          });
          notificationService.on('reject', (err) => {
            reject(err);
          });
        });
      case 'eth_sendTransaction': {
        const txParams = {
          ...data.params[0],
          chainId: Number(networkId),
        };
        preferenceService.setCurrentAccount({
          address: this.currentAccount,
          type: this.currentAccountType,
          brandName: this.currentAccountBrand,
        });
        if (txParams.gas) {
          delete txParams.gas;
        }
        return wallet
          .sendRequest({
            $ctx: this.$ctx,
            method: 'eth_sendTransaction',
            params: [txParams],
          })
          .finally(() => {
            preferenceService.setCurrentAccount(currentAccount);
          });
      }
      case 'eth_chainId':
        return chain.hex;
      default:
        return providerController[mapMethod](request);
    }
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
}

const provider = new EthereumProvider();

// window.dispatchEvent(new Event('ethereum#initialized'));

export default {
  currentProvider: new Proxy(provider, {
    deleteProperty: () => true,
  }),
};
