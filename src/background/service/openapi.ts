import axios, { Method } from 'axios';
import rateLimit from 'axios-rate-limit';
import { ethErrors } from 'eth-rpc-errors';
import { createPersistStore } from 'background/utils';
import { CHAINS, INITIAL_OPENAPI_URL } from 'consts';

interface OpenApiConfigValue {
  path: string;
  method: Method;
  params?: string[];
}

interface OpenApiStore {
  host: string;
  config: Record<string, OpenApiConfigValue>;
}

export interface ServerChain {
  id: string;
  community_id: number;
  name: string;
  native_token_id: string;
  logo_url: string;
  wrapped_token_id: string;
  symbol: string;
}

export interface ChainWithBalance extends ServerChain {
  usd_value: number;
}

export interface ChainWithPendingCount extends ServerChain {
  pending_tx_count: number;
}

export type SecurityCheckDecision =
  | 'pass'
  | 'warning'
  | 'danger'
  | 'forbidden'
  | 'loading'
  | 'pending';

export interface SecurityCheckItem {
  alert: string;
  id: number;
}

export interface SecurityCheckResponse {
  decision: SecurityCheckDecision;
  alert: string;
  danger_list: SecurityCheckItem[];
  warning_list: SecurityCheckItem[];
  forbidden_list: SecurityCheckItem[];
}

export interface Tx {
  chainId: number;
  data: string;
  from: string;
  gas: string;
  gasPrice: string;
  nonce: string;
  to: string;
  value: string;
  r?: string;
  s?: string;
  v?: string;
}

export interface TotalBalanceResponse {
  total_usd_value: number;
  chain_list: ChainWithBalance[];
}

export interface TokenItem {
  amount: number;
  chain: string;
  decimals: number;
  display_symbol: string | null;
  id: string;
  is_core: boolean;
  is_verified: boolean;
  is_wallet: boolean;
  is_infinity?: boolean;
  logo_url: string;
  name: string;
  optimized_symbol: string;
  price: number;
  symbol: string;
  time_at: number;
  usd_value?: number;
  raw_amount?: number;
}

export interface GasResult {
  estimated_gas_cost_usd_value: number;
  estimated_gas_cost_value: number;
  estimated_gas_used: number;
  estimated_seconds: number;
  front_tx_count: number;
  max_gas_cost_usd_value: number;
  max_gas_cost_value: number;
  fail?: boolean;
}

export interface GasLevel {
  level: string;
  price: number;
  front_tx_count: number;
  estimated_seconds: number;
  base_fee: number;
}

export interface BalanceChange {
  err_msg: string;
  receive_token_list: TokenItem[];
  send_token_list: TokenItem[];
  success: boolean;
  usd_value_change: number;
}

export interface ExplainTxResponse {
  balance_change: BalanceChange;
  gas: {
    estimated_gas_cost_usd_value: number;
    estimated_gas_cost_value: number;
    estimated_gas_used: number;
    estimated_seconds: number;
  };
  native_token: TokenItem;
  pre_exec: {
    success: boolean;
    err_msg: string;
  };
  recommend: {
    gas: string;
    nonce: string;
  };
  support_balance_change: true;
  type_call?: {
    action: string;
    contract: string;
    contract_protocol_logo_url: string;
    contract_protocol_name: string;
  };
  type_send?: {
    to_addr: string;
    token_symbol: string;
    token_amount: number;
    token: TokenItem;
  };
  type_token_approval?: {
    spender: string;
    spender_protocol_logo_url: string;
    spender_protocol_name: string;
    token_symbol: string;
    token_amount: number;
    is_infinity: boolean;
    token: TokenItem;
  };
  type_cancel_token_approval?: {
    spender: string;
    spender_protocol_logo_url: string;
    spender_protocol_name: string;
    token_symbol: string;
  };
  type_cancel_tx?: any; // TODO
  type_deploy_contract?: any; // TODO
}

interface RPCResponse<T> {
  result: T;
  id: number;
  jsonrpc: string;
  error?: {
    code: number;
    message: string;
  };
}

interface GetTxResponse {
  blockHash: string;
  blockNumber: string;
  from: string;
  gas: string;
  gasPrice: string;
  hash: string;
  input: string;
  nonce: string;
  to: string;
  transactionIndex: string;
  value: string;
  type: string;
  v: string;
  r: string;
  s: string;
  front_tx_count: number;
  code: 0 | -1; // 0: success, -1: failed
  status: -1 | 0 | 1; // -1: failed, 0: pending, 1: success
  gas_used: number;
  token: TokenItem;
}

const maxRPS = 100;

class OpenApiService {
  store!: OpenApiStore;

  request = rateLimit(
    axios.create({
      headers: {
        'X-Client': 'Rabby',
        'X-Version': process.env.release,
      },
    }),
    { maxRPS }
  );

  setHost = async (host: string) => {
    this.store.host = host;
    await this.init();
  };

  getHost = () => {
    return this.store.host;
  };

  ethRpc:
    | ((
        chainId: string,
        arg: { method: string; params: Array<any>; origin?: string }
      ) => Promise<any>)
    | (() => Promise<never>) = async () => {
    throw ethErrors.provider.disconnected();
  };

  init = async () => {
    this.store = await createPersistStore({
      name: 'openapi',
      template: {
        host: INITIAL_OPENAPI_URL,
        config: {
          get_supported_chains: {
            path: '/v1/wallet/supported_chains',
            method: 'get',
            params: [],
          },
          get_total_balance: {
            path: '/v1/user/total_balance',
            method: 'get',
            params: ['id'],
          },
          get_total_balance_v2: {
            path: '/v1/user/total_balance_v2',
            method: 'GET',
            params: ['id'],
          },
          get_pending_tx_count: {
            path: '/v1/wallet/pending_tx_count',
            method: 'get',
            params: ['user_addr'],
          },
          recommend_chains: {
            path: '/v1/wallet/recommend_chains',
            method: 'get',
            params: ['user_addr', 'origin'],
          },
          explain_origin: {
            path: '/v1/wallet/explain_origin',
            method: 'get',
            params: ['user_addr', 'origin'],
          },
          check_origin: {
            path: '/v1/wallet/check_origin',
            method: 'get',
            params: ['user_addr', 'origin'],
          },
          explain_text: {
            path: '/v1/wallet/explain_text',
            method: 'post',
            params: ['user_addr', 'origin', 'text'],
          },
          check_text: {
            path: '/v1/wallet/check_text',
            method: 'post',
            params: ['user_addr', 'origin', 'text'],
          },
          explain_tx: {
            path: '/v1/wallet/explain_tx',
            method: 'post',
            params: ['user_addr', 'origin', 'tx', 'update_nonce'],
          },
          check_tx: {
            path: '/v1/wallet/check_tx',
            method: 'post',
            params: ['user_addr', 'origin', 'tx'],
          },
          gas_market: {
            path: '/v1/wallet/gas_market',
            method: 'get',
            params: ['chain_id', 'custom_price'],
          },
          push_tx: {
            path: '/v1/wallet/push_tx',
            method: 'post',
            params: ['chain_id', 'tx'],
          },
          eth_rpc: {
            path: 'v1/wallet/eth_rpc',
            method: 'post',
            params: ['chain_id', 'method', 'params'],
          },
          get_tx: {
            path: 'v1/wallet/get_tx',
            method: 'GET',
            params: ['chain_id', 'tx_id', 'gas_price'],
          },
          ens: {
            path: 'v1/wallet/ens',
            method: 'GET',
            params: ['text'],
          },
          token_search: {
            path: '/v1/user/token_search',
            method: 'GET',
            params: ['id'],
          },
          token_list: {
            path: '/v1/user/token_list',
            method: 'GET',
            params: ['id', 'is_all'],
          },
          user_token: {
            path: '/v1/user/token',
            method: 'GET',
            params: ['id', 'chain_id', 'token_id'],
          },
        },
      },
    });

    this.request = rateLimit(
      axios.create({
        baseURL: this.store.host,
        headers: {
          'X-Client': 'Rabby',
          'X-Version': process.env.release,
        },
      }),
      { maxRPS }
    );
    this.request.interceptors.response.use((response) => {
      const code = response.data?.err_code || response.data?.error_code;
      const msg = response.data?.err_msg || response.data?.error_msg;

      if (code && code !== 200) {
        if (msg) {
          try {
            throw new Error(JSON.parse(msg.en));
          } catch (e) {
            throw new Error(msg.en);
          }
        }
        throw new Error(response.data);
      }
      return response;
    });
    this._mountMethods();
    const getConfig = async () => {
      try {
        await this.getConfig();
      } catch (e) {
        setTimeout(() => {
          getConfig(); // reload openapi config if load faild 5s later
        }, 5000);
      }
    };
    await getConfig();
  };

  getConfig = async () => {
    const { data } = await this.request.get<Record<string, OpenApiConfigValue>>(
      `${this.store.host}/v1/wallet/config`
    );

    for (const key in data) {
      data[key].method = data[key].method.toLowerCase() as Method;
    }

    this.store.config = data;
  };

  private _mountMethods = () => {
    const config = this.store.config.eth_rpc;
    if (!config) {
      return;
    }

    this.ethRpc = (chain_id, { origin = 'rabby', method, params }) => {
      return this.request[config.method](
        `${config.path}?origin=${origin}&method=${method}`,
        {
          chain_id,
          method,
          params,
        }
      ).then(({ data }: { data: RPCResponse<any> }) => {
        if (data?.error) {
          throw data.error;
        }

        return data?.result;
      });
    };
  };

  getSupportedChains = async (): Promise<ServerChain[]> => {
    // const config = this.store.config.get_supported_chains;
    // const { data } = await this.request[config.method](config.path);
    // return data;
    return Promise.resolve([
      {
        community_id: 1,
        id: 'eth',
        logo_url:
          'https://static.debank.com/image/chain/logo_url/eth/42ba589cd077e7bdd97db6480b0ff61d.png',
        name: 'Ethereum',
        native_token_id: 'eth',
        wrapped_token_id: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        symbol: 'ETH',
      },
      {
        community_id: 56,
        id: 'bsc',
        logo_url:
          'https://static.debank.com/image/chain/logo_url/bsc/7c87af7b52853145f6aa790d893763f1.png',
        name: 'BSC',
        native_token_id: 'bsc',
        wrapped_token_id: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
        symbol: 'BSC',
      },
      {
        community_id: 100,
        id: 'xdai',
        logo_url: '',
        name: '',
        native_token_id: '',
        wrapped_token_id: '',
        symbol: '',
      },
      {
        community_id: 137,
        id: 'matic',
        logo_url: '',
        name: '',
        native_token_id: '',
        wrapped_token_id: '',
        symbol: '',
      },
      {
        community_id: 250,
        id: 'ftm',
        logo_url: '',
        name: '',
        native_token_id: '',
        wrapped_token_id: '',
        symbol: '',
      },
      {
        community_id: 66,
        id: 'okt',
        logo_url: '',
        name: '',
        native_token_id: '',
        wrapped_token_id: '',
        symbol: '',
      },
      {
        community_id: 128,
        id: 'heco',
        logo_url: '',
        name: '',
        native_token_id: '',
        wrapped_token_id: '',
        symbol: '',
      },
      {
        community_id: 43114,
        id: 'avax',
        logo_url: '',
        name: '',
        native_token_id: '',
        wrapped_token_id: '',
        symbol: '',
      },
      {
        community_id: 421611,
        id: 'arb',
        logo_url: '',
        name: '',
        native_token_id: '',
        wrapped_token_id: '',
        symbol: '',
      },
      {
        community_id: 10,
        id: 'op',
        logo_url: '',
        name: '',
        native_token_id: '',
        wrapped_token_id: '',
        symbol: '',
      },
      {
        community_id: 42220,
        id: 'celo',
        logo_url: '',
        name: '',
        native_token_id: '',
        wrapped_token_id: '',
        symbol: '',
      },
      {
        community_id: 1285,
        id: 'movr',
        logo_url: '',
        name: '',
        native_token_id: '',
        wrapped_token_id: '',
        symbol: '',
      },
      {
        community_id: 25,
        id: 'cro',
        logo_url: '',
        name: '',
        native_token_id: '',
        wrapped_token_id: '',
        symbol: '',
      },
      {
        community_id: 288,
        id: 'boba',
        logo_url: '',
        name: '',
        native_token_id: '',
        wrapped_token_id: '',
        symbol: '',
      },
      {
        community_id: 199,
        id: 'btt',
        logo_url: '',
        name: '',
        native_token_id: '',
        wrapped_token_id: '',
        symbol: '',
      },
    ]);
  };

  getRecommendChains = async (
    address: string,
    origin: string
  ): Promise<ServerChain[]> => {
    const config = this.store.config.recommend_chains;
    const { data } = await this.request[config.method](config.path, {
      params: {
        user_addr: address,
        origin,
      },
    });
    return data;
  };

  getTotalBalance = async (address: string): Promise<TotalBalanceResponse> => {
    const config = this.store.config.get_total_balance_v2;
    const { data } = await this.request[config.method](config.path, {
      params: {
        id: address,
      },
    });
    return {
      ...data,
      chain_list: data.chain_list.filter(
        (item) =>
          !!Object.values(CHAINS).find((chain) => chain.serverId === item.id)
      ),
    };
  };

  getPendingCount = async (
    address: string
  ): Promise<{ total_count: number; chains: ChainWithPendingCount[] }> => {
    const config = this.store.config.get_pending_tx_count;
    const { data } = await this.request[config.method](config.path, {
      params: {
        user_addr: address,
      },
    });
    return data;
  };

  checkOrigin = async (
    address: string,
    origin: string
  ): Promise<SecurityCheckResponse> => {
    const config = this.store.config.check_origin;
    const { data } = await this.request[config.method](config.path, {
      params: {
        user_addr: address,
        origin,
      },
    });

    return data;
  };

  checkText = async (
    address: string,
    origin: string,
    text: string
  ): Promise<SecurityCheckResponse> => {
    const config = this.store.config.check_text;
    const { data } = await this.request[config.method](config.path, {
      user_addr: address,
      origin,
      text,
    });
    return data;
  };

  checkTx = async (
    tx: Tx,
    origin: string,
    address: string,
    update_nonce = false
  ): Promise<SecurityCheckResponse> => {
    const config = this.store.config.check_tx;
    const { data } = await this.request[config.method](config.path, {
      user_addr: address,
      origin,
      tx,
      update_nonce,
    });

    return data;
  };

  explainTx = async (
    tx: Tx,
    origin: string,
    address: string,
    update_nonce = false
  ): Promise<ExplainTxResponse> => {
    const config = this.store.config.explain_tx;
    const { data } = await this.request[config.method](config.path, {
      tx,
      user_addr: address,
      origin,
      update_nonce,
    });

    return data;
  };

  pushTx = async (tx: Tx) => {
    const config = this.store.config.push_tx;
    const { data } = await this.request[config.method](config.path, {
      tx,
    });

    return data;
  };

  explainText = async (
    origin: string,
    address: string,
    text: string
  ): Promise<{ comment: string }> => {
    const config = this.store.config.explain_text;
    const { data } = await this.request[config.method](config.path, {
      user_addr: address,
      origin,
      text,
    });

    return data;
  };

  gasMarket = async (
    chainId: string,
    customGas?: number
  ): Promise<GasLevel[]> => {
    const config = this.store.config.gas_market;
    const { data } = await this.request[config.method](config.path, {
      params: {
        chain_id: chainId,
        custom_price: customGas,
      },
    });

    return data;
  };

  getTx = async (
    chainId: string,
    hash: string,
    gasPrice: number
  ): Promise<GetTxResponse> => {
    const config = this.store.config.get_tx;
    const { data } = await this.request[config.method](config.path, {
      params: {
        chain_id: chainId,
        gas_price: gasPrice,
        tx_id: hash,
      },
    });

    return data;
  };

  getEnsAddressByName = async (
    name: string
  ): Promise<{ addr: string; name: string }> => {
    const config = this.store.config.ens;
    const { data } = await this.request[config.method](config.path, {
      params: {
        text: name,
      },
    });

    return data;
  };

  searchToken = async (
    id: string,
    q: string,
    chainId: string
  ): Promise<TokenItem[]> => {
    const config = this.store.config.token_search;
    const { data } = await this.request[config.method](config.path, {
      params: {
        id,
        q,
        chain_id: chainId,
      },
    });

    return data;
  };

  getToken = async (
    id: string,
    chainId: string,
    tokenId: string
  ): Promise<TokenItem> => {
    const config = this.store.config.user_token;
    const { data } = await this.request[config.method](config.path, {
      params: {
        id,
        chain_id: chainId,
        token_id: tokenId,
      },
    });

    return data;
  };

  listToken = async (id: string, chainId: string): Promise<TokenItem[]> => {
    const config = this.store.config.token_list;
    const { data } = await this.request[config.method](config.path, {
      params: {
        id,
        is_all: true,
        chain_id: chainId,
      },
    });

    return data;
  };
}

export default new OpenApiService();
