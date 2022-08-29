import axios from 'axios';
import rateLimit from 'axios-rate-limit';
import { ethErrors } from 'eth-rpc-errors';
import { createPersistStore } from 'background/utils';
import { CHAINS, INITIAL_OPENAPI_URL, CHAINS_ENUM } from 'consts';
import { getChain } from '../../utils';

interface OpenApiStore {
  host: string;
}

export interface Chain {
  id: number;
  name: string;
  hex: string;
  logo: string;
  enum: CHAINS_ENUM;
  serverId: string;
  network: string;
  nativeTokenSymbol: string;
  whiteLogo?: string;
  nativeTokenLogo: string;
  nativeTokenAddress: string;
  scanLink: string;
  thridPartyRPC: string;
  nativeTokenDecimals: number;
  selectChainLogo?: string;
  eip: Record<string, boolean>;
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
  trace_id: string;
  error?: {
    code: number;
    msg: string;
  } | null;
}

export interface Tx {
  chainId: number;
  data: string;
  from: string;
  gas?: string;
  gasLimit?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  gasPrice?: string;
  nonce: string;
  to: string;
  value: string;
  r?: string;
  s?: string;
  v?: string;
}

export interface Eip1559Tx {
  chainId: number;
  data: string;
  from: string;
  gas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
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
  content_type?: 'image' | 'image_url' | 'video_url' | 'audio_url' | undefined;
  content?: string | undefined;
  inner_id?: any;
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
  raw_amount_hex_str?: string;
}

export interface TransferingNFTItem {
  chain: string;
  collection: {
    id: string;
    name: string;
    create_at: number;
    chains: string[];
  };
  content: string;
  content_type: NFTItem['content_type'];
  contract_id: string;
  description: string | null;
  detail_url: string;
  id: string;
  inner_id: string;
  name: string;
  total_supply: number;
  amount: number;
}

export interface NFTApprovalResponse {
  tokens: NFTApproval[];
  contracts: NFTApprovalContract[];
  total: string;
}

export interface NFTApprovalContract {
  chain: string;
  contract_name: string;
  contract_id: string;
  amount: string;
  spender: Spender;
  is_erc721: boolean;
  is_erc1155: boolean;
}

export interface NFTApprovalSpender {
  id: string;
  protocol: {
    id: string;
    name: string;
    logo_url: string;
    chain: string;
  } | null;
}

export interface NFTApproval {
  id: string;
  contract_id: string;
  inner_id: string;
  chain: string;
  name: null;
  symbol: string;
  description: null;
  content_type: 'image' | 'image_url' | 'video_url' | 'audio_url' | undefined;
  content: string;
  total_supply: number;
  detail_url: string;
  contract_name: string;
  is_erc721: boolean;
  is_erc1155: boolean;
  amount: string;
  spender: Spender;
}

export interface TokenApproval {
  id: string;
  name: string;
  symbol: string;
  logo_url: string;
  chain: string;
  price: number;
  balance: number;
  spenders: Spender[];
  sum_exposure_usd: number;
  exposure_balance: number;
}

export interface Spender {
  id: string;
  value: number;
  exposure_usd: number;
  protocol: {
    id: string;
    name: string;
    logo_url: string;
    chain: string;
  };
  is_contract: boolean;
  is_open_source: boolean;
  is_hacked: boolean;
  is_abandoned: boolean;
}

export interface AssetItem {
  id: string;
  chain: string;
  name: string;
  site_url: string;
  logo_url: string;
  has_supported_portfolio: boolean;
  tvl: number;
  net_usd_value: number;
  asset_usd_value: number;
  debt_usd_value: number;
}
export interface NFTCollection {
  create_at: string;
  id: string;
  is_core: boolean;
  name: string;
  price: number;
  chain: string;
  tokens: NFTItem[];
}

export interface UserCollection {
  collection: Collection;
  list: NFTItem[];
}
export interface NFTItem {
  chain: string;
  id: string;
  contract_id: string;
  inner_id: string;
  token_id: string;
  name: string;
  contract_name: string;
  description: string;
  usd_price: number;
  amount: number;
  collection_id?: string;
  pay_token: {
    id: string;
    name: string;
    symbol: string;
    amount: number;
    logo_url: string;
    time_at: number;
    date_at?: string;
    price?: number;
  };
  content_type: 'image' | 'image_url' | 'video_url' | 'audio_url';
  content: string;
  detail_url: string;
  total_supply?: string;
  collection?: Collection | null;
  is_erc1155?: boolean;
  is_erc721: boolean;
}

export interface Collection {
  id: string;
  name: string;
  description: null | string;
  logo_url: string;
  is_core: boolean;
  contract_uuids: string[];
  create_at: number;
}

export interface TxDisplayItem extends TxHistoryItem {
  projectDict: TxHistoryResult['project_dict'];
  cateDict: TxHistoryResult['cate_dict'];
  tokenDict: TxHistoryResult['token_dict'];
}
export interface TxHistoryItem {
  cate_id: string | null;
  chain: string;
  debt_liquidated: null;
  id: string;
  other_addr: string;
  project_id: null | string;
  receives: {
    amount: number;
    from_addr: string;
    token_id: string;
  }[];
  sends: {
    amount: number;
    to_addr: string;
    token_id: string;
  }[];
  time_at: number;
  token_approve: {
    spender: string;
    token_id: string;
    value: number;
  } | null;
  tx: {
    eth_gas_fee: number;
    from_addr: string;
    name: string;
    params: any[];
    status: number;
    to_addr: string;
    usd_gas_fee: number;
    value: number;
  } | null;
}
export interface TxHistoryResult {
  cate_dict: Record<string, { id: string; name: string }>;
  history_list: TxHistoryItem[];
  project_dict: Record<
    string,
    {
      chain: string;
      id: string;
      logo_url: string;
      name: string;
    }
  >;
  token_dict: Record<string, TokenItem>;
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
  error?: {
    code: number;
    msg: string;
  } | null;
  receive_nft_list: TransferingNFTItem[];
  receive_token_list: TokenItem[];
  send_nft_list: TransferingNFTItem[];
  send_token_list: TokenItem[];
  success: boolean;
  usd_value_change: number;
}
interface NFTContractItem {
  id: string;
  chain: string;
  name: string;
  symbol: string;
  is_core: boolean;
  time_at: number;
  collection: {
    id: string;
    name: string;
    create_at: number;
  };
}
export interface ExplainTxResponse {
  pre_exec_version: 'v0' | 'v1' | 'v2';
  abi?: {
    func: string;
    params: Array<string[] | number | string>;
  };
  abi_str?: string;
  balance_change: BalanceChange;
  gas: {
    success?: boolean;
    error?: {
      code: number;
      msg: string;
    } | null;
    gas_used: number;
    estimated_gas_cost_usd_value: number;
    estimated_gas_cost_value: number;
    estimated_gas_used: number;
    estimated_seconds: number;
  };
  native_token: TokenItem;
  pre_exec: {
    success: boolean;
    error?: {
      code: number;
      msg: string;
    } | null;
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
  is_gnosis?: boolean;
  gnosis?: ExplainTxResponse;
  type_cancel_single_nft_approval?: {
    spender: string;
    spender_protocol_name: null;
    spender_protocol_logo_url: string;
    token_symbol: null;
    is_nft: boolean;
    nft: NFTItem;
  };
  type_cancel_nft_collection_approval?: {
    spender: string;
    spender_protocol_name: string;
    spender_protocol_logo_url: string;
    token_symbol: string;
    is_nft: boolean;
    nft_contract: NFTContractItem;
    token: TokenItem;
  };
  type_nft_collection_approval?: {
    spender: string;
    spender_protocol_name: string;
    spender_protocol_logo_url: string;
    token_symbol: string;
    is_nft: boolean;
    nft_contract: NFTContractItem;
    token: TokenItem;
    token_amount: number;
    is_infinity: boolean;
  };
  type_single_nft_approval?: {
    spender: string;
    spender_protocol_name: string;
    spender_protocol_logo_url: string;
    token_symbol: string;
    is_nft: boolean;
    nft: NFTItem;
    token: TokenItem;
    token_amount: number;
    is_infinity: boolean;
  };
  type_nft_send?: {
    spender: string;
    spender_protocol_name: null;
    spender_protocol_logo_url: string;
    token_symbol: string;
    token_amount: number;
    is_infinity: boolean;
    is_nft: boolean;
    nft: NFTItem;
  };
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
        'X-Version': process.env.release!,
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
      },
    });

    if (!process.env.DEBUG) {
      this.store.host = INITIAL_OPENAPI_URL;
    }

    this.request = rateLimit(
      axios.create({
        baseURL: this.store.host,
        headers: {
          'X-Client': 'Rabby',
          'X-Version': process.env.release!,
        },
      }),
      { maxRPS }
    );
    this.request.interceptors.response.use((response) => {
      const code = response.data?.err_code || response.data?.error_code;
      const msg = response.data?.err_msg || response.data?.error_msg;

      if (code && code !== 200) {
        if (msg) {
          let err;
          try {
            err = new Error(JSON.parse(msg));
          } catch (e) {
            err = new Error(msg);
          }
          throw err;
        }
        throw new Error(response.data);
      }
      return response;
    });
    this._mountMethods();
  };

  private _mountMethods = () => {
    this.ethRpc = (chain_id, { origin = 'rabby', method, params }) => {
      return this.request
        .post(`/v1/wallet/eth_rpc?origin=${origin}&method=${method}`, {
          chain_id,
          method,
          params,
        })
        .then(({ data }: { data: RPCResponse<any> }) => {
          if (data?.error) {
            throw data.error;
          }

          return data?.result;
        });
    };
  };

  getRecommendChains = async (
    address: string,
    origin: string
  ): Promise<ServerChain[]> => {
    const { data } = await this.request.get('/v1/wallet/recommend_chains', {
      params: {
        user_addr: address,
        origin,
      },
    });
    return data;
  };

  getTotalBalance = async (address: string): Promise<TotalBalanceResponse> => {
    const { data } = await this.request.get('/v1/user/total_balance', {
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
    const { data } = await this.request.get('/v1/wallet/pending_tx_count', {
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
    const { data } = await this.request.get('/v1/wallet/check_origin', {
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
    const { data } = await this.request.post('/v1/wallet/check_text', {
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
    const { data } = await this.request.post('/v1/wallet/check_tx', {
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
    const { data } = await this.request.post('/v1/wallet/explain_tx', {
      tx,
      user_addr: address,
      origin,
      update_nonce,
    });

    return data;
  };

  preExecTx = async ({
    tx,
    origin,
    address,
    updateNonce = false,
    pending_tx_list = [],
  }: {
    tx: Tx;
    origin: string;
    address: string;
    updateNonce: boolean;
    pending_tx_list: Tx[];
  }): Promise<ExplainTxResponse> => {
    const { data } = await this.request.post('/v1/wallet/pre_exec_tx', {
      tx,
      user_addr: address,
      origin,
      update_nonce: updateNonce,
      pending_tx_list,
    });

    return data;
  };

  historyGasUsed = async (params: {
    tx: Tx;
    user_addr: string;
  }): Promise<{
    gas_used: number;
  }> => {
    const { data } = await this.request.post('/v1/wallet/history_tx_used_gas', {
      ...params,
    });

    return data;
  };

  pendingTxList = async (
    tx: Tx,
    origin: string,
    address: string,
    update_nonce = false
  ): Promise<Tx[]> => {
    const { data } = await this.request.post('/v1/wallet/pending_tx_list', {
      tx,
      user_addr: address,
      origin,
      update_nonce,
    });

    return data;
  };

  pushTx = async (tx: Tx, traceId?: string) => {
    const { data } = await this.request.post('/v1/wallet/push_tx', {
      tx,
      traceId,
    });

    return data;
  };

  explainText = async (
    origin: string,
    address: string,
    text: string
  ): Promise<{ comment: string }> => {
    const { data } = await this.request.post('/v1/wallet/explain_text', {
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
    const { data } = await this.request.get('/v1/wallet/gas_market', {
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
    const { data } = await this.request.get('/v1/wallet/get_tx', {
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
    const { data } = await this.request.get('/v1/wallet/ens', {
      params: {
        text: name,
      },
    });

    return data;
  };

  searchToken = async (id: string, q: string): Promise<TokenItem[]> => {
    const { data } = await this.request.get('/v1/user/token_search', {
      params: {
        id,
        q,
        has_balance: false,
      },
    });

    return data?.filter((token) => getChain(token.chain));
  };

  searchSwapToken = async (
    id: string,
    chainId: string,
    q: string,
    is_all = false
  ) => {
    const { data } = await this.request.get('/v1/user/token_search', {
      params: {
        id,
        chain_id: chainId,
        q,
        is_all,
      },
    });
    return data;
  };

  getToken = async (
    id: string,
    chainId: string,
    tokenId: string
  ): Promise<TokenItem> => {
    const { data } = await this.request.get('/v1/user/token', {
      params: {
        id,
        chain_id: chainId,
        token_id: tokenId,
      },
    });

    return data;
  };

  listToken = async (id: string, chainId?: string): Promise<TokenItem[]> => {
    const { data } = await this.request.get('/v1/user/token_list', {
      params: {
        id,
        is_all: false,
        chain_id: chainId,
      },
    });

    return data?.filter((token) => getChain(token.chain));
  };

  customListToken = async (
    uuids: string[],
    id: string
  ): Promise<TokenItem[]> => {
    const { data } = await this.request.post('/v1/user/specific_token_list', {
      id,
      uuids,
    });

    return data?.filter((token) => getChain(token.chain));
  };

  listChainAssets = async (id: string): Promise<AssetItem[]> => {
    const { data } = await this.request.get('/v1/user/simple_protocol_list', {
      params: {
        id,
      },
    });
    return data;
  };

  listNFT = async (id: string, isAll = true): Promise<NFTItem[]> => {
    const { data } = await this.request.get('/v1/user/nft_list', {
      params: {
        id,
        is_all: isAll,
      },
    });
    return data?.filter((nft) => getChain(nft.chain));
  };

  listCollection = async (params: {
    collection_ids: string;
  }): Promise<Collection[]> => {
    const { data } = await this.request.get('/v1/nft/collections', {
      params,
    });
    return data;
  };

  listTxHisotry = async (params: {
    id?: string;
    chain_id?: string;
    token_id?: string;
    coin_id?: string;
    start_time?: number;
    page_count?: number;
  }): Promise<TxHistoryResult> => {
    const { data } = await this.request.get('/v1/user/history_list', {
      params,
    });
    return data;
  };

  tokenPrice = async (tokenName: string): Promise<string> => {
    const { data } = await this.request.get('/v1/token/price_change', {
      params: {
        token: tokenName,
      },
    });

    return data;
  };

  tokenAuthorizedList = async (
    id: string,
    chain_id: string
  ): Promise<TokenApproval[]> => {
    const { data } = await this.request.get('/v1/user/token_authorized_list', {
      params: {
        id,
        chain_id,
      },
    });

    return data;
  };

  userNFTAuthorizedList = async (
    id: string,
    chain_id: string
  ): Promise<NFTApprovalResponse> => {
    const { data } = await this.request.get('/v1/user/nft_authorized_list', {
      params: {
        id,
        chain_id,
      },
    });

    return data;
  };

  getDEXList = async (chain_id: string) => {
    const { data } = await this.request.get<
      {
        id: string;
        name: string;
        logo_url: string;
        site_url: string;
        type: string;
      }[]
    >(testApiPrefix + '/v1/wallet/swap_dex_list', {
      params: {
        chain_id,
      },
    });
    return data;
  };

  getSwapQuote = async (params: {
    chain_id: string;
    dex_id: string;
    pay_token_id: string;
    pay_token_raw_amount: string;
    receive_token_id: string;
  }) => {
    const { data } = await this.request.get<{
      receive_token_raw_amount: number;
      dex_approve_to: string;
      dex_swap_to: string;
      dex_swap_calldata: string;
      is_wrapped: boolean;
      gas: {
        gas_used: number;
        gas_price: number;
        gas_cost_value: number;
        gas_cost_usd_value: number;
      };
      pay_token: TokenItem;
      receive_token: TokenItem;
    }>(testApiPrefix + '/v1/wallet/swap_quote', {
      params,
    });
    return data;
  };

  getSwapTokenList = async (id: string, chainId?: string) => {
    const { data } = await this.request.get<TokenItem[]>(
      testApiPrefix + '/v1/wallet/swap_token_list',
      {
        params: {
          id,
          chain_id: chainId,
          is_all: false,
        },
      }
    );
    return data;
  };
}
// TODO: remove
const testApiPrefix = 'https://alpha-openapi.debank.com';

export default new OpenApiService();
