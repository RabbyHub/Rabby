import type {
  ContactBookItem,
  ContactBookStore as ContactBookServiceStore,
} from '@/background/service/contactBook';
import { createExtensionStoreOptions } from './createStore/createExtensionStoreOptions';
import { createRabbyStore } from './createStore/createRabbyStore';

export type ContactBookState = ContactBookServiceStore;

export function getDefaultContactBookState(): ContactBookState {
  return {};
}

export const selectAllAddrs = (state: ContactBookState) =>
  Object.values(state)
    .filter((item): item is ContactBookItem => !!item)
    .map((item) => ({
      ...item,
      address: item.address.toLowerCase(),
    }));

export const selectAllAliasAddrs = (state: ContactBookState) =>
  selectAllAddrs(state).filter((item) => item.isAlias);

export const selectAllContacts = (state: ContactBookState) =>
  selectAllAddrs(state).filter((item) => item.isContact);

export const selectAliasByAddress = (
  state: ContactBookState,
  address?: string
) => {
  if (!address) return '';

  const contact = state[address.toLowerCase()];
  return contact?.isAlias ? contact.name : '';
};

type CreateContactBookStoreOptions = {
  autoHydrate?: boolean;
};

export const createContactBookStore = ({
  autoHydrate = true,
}: CreateContactBookStoreOptions = {}) =>
  createRabbyStore<ContactBookState>(
    () => getDefaultContactBookState(),
    createExtensionStoreOptions<ContactBookState, 'contactBook'>({
      storageKey: 'contactBook',
      autoHydrate,
      // The UI state intentionally has exactly the same dynamic address keys
      // as the background service. A full snapshot therefore replaces it;
      // incremental broadcasts are still shallow-merged by createRabbyStore.
      merge(persistedState) {
        return { ...persistedState } as ContactBookState;
      },
      onError(error) {
        console.error('[contactBookStore]', error);
      },
    })
  );

export const useContactBookStore = createContactBookStore();

export const useContactAlias = (address?: string) =>
  useContactBookStore((state) => selectAliasByAddress(state, address));

// Keep an explicit, idempotent entry point so startup can retry an automatic
// hydration that failed before the background connection settled.
export const initializeContactBookStore = () =>
  useContactBookStore.persist.hydrate();
