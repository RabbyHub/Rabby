import {
  createPersistStore,
  isSameAddress,
  patchPersistStore,
} from 'background/utils';
import { z } from 'zod';

const whitelistAddressSchema = z
  .string()
  .min(1)
  .transform((address) => address.toLowerCase());

const whitelistsSchema = z.array(whitelistAddressSchema);

const whitelistStoreSchema = z.object({
  enabled: z.boolean().default(true),
  whitelists: whitelistsSchema.default(() => []),
});

export type WhitelistStore = z.output<typeof whitelistStoreSchema>;

const createWhitelistStoreTemplate = (): WhitelistStore =>
  whitelistStoreSchema.parse({});

const normalizeWhitelist = (addresses: string[]) =>
  whitelistsSchema.parse(addresses);

const isSameWhitelist = (current: string[], next: string[]) => {
  const currentSet = new Set(current);
  const nextSet = new Set(next);

  return (
    current.length === next.length &&
    currentSet.size === current.length &&
    nextSet.size === next.length &&
    current.every((address) => nextSet.has(address)) &&
    next.every((address) => currentSet.has(address))
  );
};

class WhitelistService {
  store: WhitelistStore = createWhitelistStoreTemplate();

  init = async () => {
    const storage = await createPersistStore<WhitelistStore>({
      name: 'whitelist',
      template: createWhitelistStoreTemplate(),
      schema: whitelistStoreSchema,
    });
    this.store = storage || this.store;

    const parsedWhitelists = whitelistsSchema.safeParse(this.store.whitelists);
    if (!parsedWhitelists.success) {
      this.store.whitelists = [];
    } else if (
      parsedWhitelists.data.some(
        (address, index) => address !== this.store.whitelists[index]
      )
    ) {
      this.store.whitelists = parsedWhitelists.data;
    }
    if (typeof this.store.enabled !== 'boolean') {
      this.store.enabled = true;
    }
  };

  getStore = () => ({
    enabled: this.isWhitelistEnabled(),
    whitelists: this.store.whitelists,
  });

  getWhitelist = () => {
    return this.store.whitelists;
  };

  enableWhitelist = () => {
    this.commitStore({ enabled: true });
  };

  disableWhiteList = () => {
    this.commitStore({ enabled: false });
  };

  setWhitelist = (addresses: string[]) => {
    this.commitStore({ whitelists: normalizeWhitelist(addresses) });
  };

  updateWhitelistOrder = (addresses: string[]) => {
    if (!Array.isArray(addresses)) {
      throw new Error('Invalid whitelist order');
    }

    const current = normalizeWhitelist(this.store.whitelists);
    const next = normalizeWhitelist(addresses);

    if (!isSameWhitelist(current, next)) {
      throw new Error('Invalid whitelist order');
    }

    this.commitStore({ whitelists: next });
  };

  patchStore = (partials: Partial<WhitelistStore>) => {
    if (Object.keys(partials).some((key) => key !== 'whitelists')) {
      throw new Error('Only whitelist order can be updated without password');
    }
    if (!Object.prototype.hasOwnProperty.call(partials, 'whitelists')) return;
    if (!Array.isArray(partials.whitelists)) {
      throw new Error('Invalid whitelist order');
    }

    const current = normalizeWhitelist(this.store.whitelists);
    const next = normalizeWhitelist(partials.whitelists);
    if (!isSameWhitelist(current, next)) {
      throw new Error('Invalid whitelist order');
    }
    this.commitStore({ whitelists: next });
  };

  private commitStore = (partials: Partial<WhitelistStore>) => {
    patchPersistStore(this.store, partials);
  };

  removeWhitelist = (address: string) => {
    if (!this.store.whitelists.find((item) => isSameAddress(item, address)))
      return;
    this.commitStore({
      whitelists: this.store.whitelists.filter(
        (item) => !isSameAddress(item, address)
      ),
    });
  };

  addWhitelist = (address: string) => {
    if (!address) return;
    if (this.store.whitelists.find((item) => isSameAddress(item, address)))
      return;
    this.commitStore({
      whitelists: [...this.store.whitelists, address.toLowerCase()],
    });
  };

  isWhitelistEnabled = () => {
    // ignore user option from now
    // return this.store.enabled;
    return true;
  };

  isInWhiteList = (address: string) => {
    return this.store.whitelists.some((item) => isSameAddress(item, address));
  };
}

export default new WhitelistService();
