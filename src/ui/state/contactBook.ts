import type { ContactBookItem } from '@/background/service/contactBook';
import { wallet } from '@/ui/wallet';
import { create } from 'zustand';

export type ContactBookState = {
  contactsByAddr: Record<string, ContactBookItem>;
};

type ContactBookActions = {
  getContactBookAsync: () => Promise<Record<string, ContactBookItem>>;
};

export type ContactBookStore = ContactBookState & ContactBookActions;

export function getDefaultContactBookState(): ContactBookState {
  return {
    contactsByAddr: {},
  };
}

export const selectAllAddrs = (state: ContactBookState) =>
  Object.values(state.contactsByAddr);

export const selectAllAliasAddrs = (state: ContactBookState) =>
  selectAllAddrs(state).filter((item) => !!item.isAlias);

export const selectAllContacts = (state: ContactBookState) =>
  selectAllAddrs(state).filter(
    (item): item is ContactBookItem => !!item?.isContact
  );

export const useContactBookStore = create<ContactBookStore>()((set) => ({
  ...getDefaultContactBookState(),

  async getContactBookAsync() {
    const contactsByAddr = await wallet.getContactsByMap<
      Record<string, ContactBookItem | undefined>
    >();
    // The background store is `Record<string, ContactBookItem | undefined>`
    // and legacy data does carry empty entries. Drop them here rather than
    // dereferencing them -- a throw would leave every reader with an empty
    // contact book and no error to show.
    const normalizedContacts = Object.fromEntries(
      Object.entries(contactsByAddr)
        .filter((entry): entry is [string, ContactBookItem] => !!entry[1])
        .map(([address, item]) => [
          address,
          {
            ...item,
            address: item.address.toLowerCase(),
          },
        ])
    ) as Record<string, ContactBookItem>;

    set({ contactsByAddr: normalizedContacts });
    return normalizedContacts;
  },
}));
