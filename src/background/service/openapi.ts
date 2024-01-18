import { INITIAL_OPENAPI_URL, INITIAL_TESTNET_OPENAPI_URL } from '@/constant';
import { OpenApiService } from '@rabby-wallet/rabby-api';
import { createPersistStore } from 'background/utils';
export * from '@rabby-wallet/rabby-api/dist/types';
import { WebSignApiPlugin } from '@rabby-wallet/rabby-api/dist/plugins/web-sign';

const testnetStore = new (class TestnetStore {
  store!: { host: string; testnetHost: string };

  constructor() {
    createPersistStore({
      name: 'openapi',
      template: {
        host: INITIAL_OPENAPI_URL,
        testnetHost: INITIAL_TESTNET_OPENAPI_URL,
      },
    }).then((res) => {
      this.store = res;
    });
  }
  get host() {
    return this.store.testnetHost;
  }
  set host(value) {
    this.store.testnetHost = value;
  }
})();

class EXtendsOpenApiService extends OpenApiService {
  getRabbyPoints = async (params: {
    id: string;
  }): Promise<{
    id: string;
    invite_code?: string;
    logo_url: string;
    logo_thumbnail_url: string;
    web3_id: string;
    claimed_points: number;
    total_claimed_points: number;
  }> => {
    const { data } = await this.request.get('/v1/points/user', { params });
    return data;
  };

  checkRabbyPointsInviteCode = async (params: {
    code: string;
  }): Promise<{ invite_code_exist: boolean }> => {
    const { data } = await this.request.get(
      '/v1/points/user/invite_code_exist',
      { params }
    );
    return data;
  };

  setRabbyPointsInviteCode = async (params: {
    id: string;
    signature: string;
    invite_code: string;
  }): Promise<{ code: number }> => {
    const { data } = await this.request.post(
      '/v1/points/user/invite_code',
      params
    );
    return data;
  };

  checkRabbyPointClaimable = async (params: {
    id: string;
  }): Promise<{ claimable: boolean }> => {
    const { data } = await this.request.get('/v1/points/user/claimable', {
      params,
    });
    return data;
  };

  getRabbyPointsSnapshot = async (params: {
    id: string;
  }): Promise<{
    id: string;
    address_balance: number;
    metamask_swap: number;
    rabby_old_user: number;
    rabby_nadge: number;
    rabby_nft: number;
    extra_bouns: number;
    claimed: boolean;
    snapshot_at: number;
  }> => {
    const { data } = await this.request.get('/v1/points/snapshot', { params });
    return data;
  };

  claimRabbyPointsSnapshot = async (params: {
    id: string;
    signature: string;
    invite_code?: string;
  }): Promise<{
    error_code: number;
    error_msg?: string;
  }> => {
    const { data } = await this.request.post(
      '/v1/points/claim_snapshot',
      params
    );
    return data;
  };

  getRabbyPointsTopUsers = async (params: {
    id: string;
  }): Promise<
    {
      id: string;
      logo_url: string;
      logo_thumbnail_url: string;
      web3_id: string;
      claimed_points: number;
    }[]
  > => {
    const { data } = await this.request.get('/v1/points/top_user', { params });
    return data;
  };

  getRabbyPointsList = async (params: {
    id: string;
  }): Promise<
    {
      id: number;
      title: string;
      description: string;
      start_at: number;
      end_at: number;
      claimable_points: number;
    }[]
  > => {
    const { data } = await this.request.get('/v1/points/campaign_list', {
      params,
    });
    return data;
  };

  claimRabbyPointsById = async (params: {
    campaign_id: number;
    user_id: string;
    signature: string;
  }): Promise<{ error_code: number }> => {
    const { data } = await this.request.post(
      '/v1/points/claim_campaign',
      params
    );
    return data;
  };
}

const service = new EXtendsOpenApiService({
  plugin: WebSignApiPlugin,
  store: !process.env.DEBUG
    ? {
        host: INITIAL_OPENAPI_URL,
        testnetHost: INITIAL_TESTNET_OPENAPI_URL,
      }
    : createPersistStore({
        name: 'openapi',
        template: {
          host: INITIAL_OPENAPI_URL,
          testnetHost: INITIAL_TESTNET_OPENAPI_URL,
        },
      }),
});

export const testnetOpenapiService = new EXtendsOpenApiService({
  plugin: WebSignApiPlugin,
  store: !process.env.DEBUG
    ? {
        host: INITIAL_TESTNET_OPENAPI_URL,
        testnetHost: INITIAL_TESTNET_OPENAPI_URL,
      }
    : testnetStore,
});

export default service;
