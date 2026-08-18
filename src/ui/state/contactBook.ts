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
      Record<string, ContactBookItem>
    >();
    const normalizedContacts = Object.fromEntries(
      Object.entries(contactsByAddr).map(([address, item]) => [
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
