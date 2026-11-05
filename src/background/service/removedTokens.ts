import { uniqBy } from 'lodash';
import { z } from 'zod';
import { createPersistStore, patchPersistStore } from 'background/utils';
import { getRemovedTokenKey } from '@/utils/removedTokens';

const removedTokenSchema = z.object({
  tokenId: z.string().min(1),
  chain: z.string().min(1),
});

const removedTokensStoreSchema = z.object({
  removedTokens: z
    .array(removedTokenSchema)
    .default(() => [])
    .transform((tokens) => uniqBy(tokens, getRemovedTokenKey)),
});

export type RemovedToken = z.output<typeof removedTokenSchema>;
export type RemovedTokensServiceStore = z.output<
  typeof removedTokensStoreSchema
>;

const createRemovedTokensStoreTemplate = (): RemovedTokensServiceStore =>
  removedTokensStoreSchema.parse({});

class RemovedTokensService {
  store: RemovedTokensServiceStore = createRemovedTokensStoreTemplate();

  init = async () => {
    this.store = await createPersistStore<RemovedTokensServiceStore>({
      name: 'removedTokens',
      template: createRemovedTokensStoreTemplate(),
      schema: removedTokensStoreSchema,
    });
  };

  patchStore = (partials: Partial<RemovedTokensServiceStore>) => {
    patchPersistStore(this.store, partials);
  };

  getRemovedTokens = (): RemovedToken[] =>
    this.store.removedTokens.map((token) => ({ ...token }));

  isTokenRemoved = (token: RemovedToken): boolean => {
    const key = getRemovedTokenKey(token);
    return this.store.removedTokens.some(
      (item) => getRemovedTokenKey(item) === key
    );
  };

  addRemovedToken = (token: RemovedToken) => {
    if (this.isTokenRemoved(token)) return;

    this.patchStore({
      removedTokens: [token, ...this.store.removedTokens],
    });
  };

  removeRemovedToken = (token: RemovedToken) => {
    if (!this.isTokenRemoved(token)) return;

    const key = getRemovedTokenKey(token);
    this.patchStore({
      removedTokens: this.store.removedTokens.filter(
        (item) => getRemovedTokenKey(item) !== key
      ),
    });
  };
}

export default new RemovedTokensService();
