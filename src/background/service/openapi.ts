import axios, { Method } from 'axios';
import { createPersistStore } from 'background/utils';

interface OpenApiConfigValue {
  path: string;
  method: Method;
  params?: string[];
}

interface OpenApiStore {
  host: string;
  config: Record<string, OpenApiConfigValue>;
}

interface ServerChain {
  id: string;
  community_id: number;
  name: string;
  native_token_id: string;
  logo_url: string;
  wrapped_token_id: string;
}

class OpenApi {
  store!: OpenApiStore;

  request = axios.create();

  setHost = async (host: string) => {
    this.store.host = host;
    await this.init();
  };

  getHost = () => {
    return this.store.host;
  };

  init = async () => {
    this.store = await createPersistStore({
      name: 'openapi',
      template: {
        host: 'https://openapi.debank.com',
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
          get_pending_tx_count: {
            path: '/v1/wallet/pending_tx_count',
            method: 'get',
            params: ['id'],
          },
          // 按照优先级从高到低返回多个
          // chain会返回整个对象，其中会包含comunity_id，作为客户端标准id
          recommend_chains: {
            path: '/v1/wallet/recommend_chains',
            method: 'get',
            params: ['origin', 'id'],
          },
          check_origin_to_connect: {
            path: '/v1/wallet/security/check_origin',
            method: 'get',
          },
          explain_origin_to_connect: {
            path: '/v1/wallet/explain_origin',
            method: 'get',
            params: ['origin', 'title', 'return_logo'],
          },
          // 文本签名
          explain_text_to_sign: {
            path: '/v1/wallet/api/explain_text',
            method: 'get',
            params: ['origin', 'text', 'user_addr'],
          },
          check_text_to_sign: {
            path: '/v1/wallet/check_text',
            method: 'post',
            params: ['origin', 'text', 'user_addr'],
          },
          // 交易签名解释
          // 1. 地址和调用函数说明，或者是其他行为，比如转账、授权等等；以及，当前链是否由这个交互地址
          // 2. 预执行是否成功
          // 3. 实际消耗的 gas，以及预估打包时间
          // 4. 代币余额变化
          explain_tx_to_sign: {
            path: '/v1/wallet/explain_tx',
            method: 'get',
          },
          check_tx_to_sign: {
            path: '/v1/wallet/check_tx',
            method: 'post',
          },
          gas_market: {
            path: '/v1/wallet/gas_market',
            method: 'get',
            params: ['chainId', 'custom_price'],
          },
          push_tx: {
            path: '/v1/wallet/push_tx',
            method: 'get',
          },
        },
      },
    });
    this.request = axios.create({
      baseURL: this.store.host,
    });
    await this.getConfig();
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

  getSupportedChains = async (): Promise<ServerChain[]> => {
    const config = this.store.config.get_supported_chains;
    const { data } = await this.request[config.method](config.path);
    return data;
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
}

export default new OpenApi();
