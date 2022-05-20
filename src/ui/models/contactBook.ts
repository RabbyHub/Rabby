import { createModel } from '@rematch/core';
import { ContactBookItem } from 'background/service/contactBook';
import { RootModel } from '.';

interface ContactBookState {
  contacts: Record<string, ContactBookItem>;
}

export const contactBook = createModel<RootModel>()({
  name: 'contactBook',

  state: {
    contacts: {},
    aliasNames: {},
  } as ContactBookState,

  reducers: {
    setField(state, payload: Partial<typeof state>) {
      return Object.keys(payload).reduce(
        (accu, key) => {
          accu[key] = payload[key];
          return accu;
        },
        { ...state }
      );
    },
  },

  effects: (dispatch) => ({
    async getContactBookAsync(_?, store?) {
      const contacts: Record<
        string,
        ContactBookItem
      > = await store.app.wallet.getContactsByMap<
        Record<string, ContactBookItem>
      >();
      dispatch.contactBook.setField({ contacts });
      return contacts;
    },

    async listContactAsync(_, store) {
      const contactsMap: Record<string, ContactBookItem> =
        store.contactBook.contacts;
      return Object.values(contactsMap).filter((item) => item.isContact);
    },

    async updateContact(data: ContactBookItem, store) {
      await store.app.wallet.updateContact(data);
      await dispatch.contactBook.getContactBookAsync();
    },

    async removeContact(address: string, store) {
      await store.app.wallet.removeContact(address);
      await dispatch.contactBook.getContactBookAsync();
    },

    async getAliasNamesAsync(_?, store?) {
      const contactsMap: Record<string, ContactBookItem> =
        store.contactBook.contacts;
      return Object.values(contactsMap).filter((item) => item.isAlias);
    },

    async updateAliasName(data: { address: string; name: string }, store) {
      await store.app.wallet.updateAlianName(data.address, data.name);
      await dispatch.contactBook.getContactBookAsync();
    },

    getContactOrAliasByAddress(
      address: string,
      store
    ): ContactBookItem | undefined {
      const contacts: Record<string, ContactBookItem> =
        store.contactBook.contacts;
      return contacts[address.toLowerCase()];
    },
  }),
});
