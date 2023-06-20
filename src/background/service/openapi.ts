import { INITIAL_OPENAPI_URL } from '@/constant';
import { OpenApiService } from '@rabby-wallet/rabby-api';
import { createPersistStore } from 'background/utils';
export * from '@rabby-wallet/rabby-api/dist/types';

const service = new OpenApiService({
  store: await createPersistStore({
    name: 'openapi',
    template: {
      host: INITIAL_OPENAPI_URL,
    },
  }),
});

export default service;
