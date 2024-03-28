import { createModel } from '@rematch/core';
import { ContactBookItem } from 'background/service/contactBook';
import { RootModel } from '.';

interface ContactBookState {
  contactsByAddr: Record<string, ContactBookItem>;
}

export const contactBook = createModel<RootModel>()({
  name: 'contactBook',

  state: {
    contactsByAddr: {},
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

  selectors: (slice) => {
    return {
      allAddrs() {
        return slice((contactBook) =>
          Object.values(contactBook.contactsByAddr)
        );
      },
      allAliasAddrs() {
        return slice((contactBook) =>
          Object.values(contactBook.contactsByAddr).filter((x) => !!x.isAlias)
        );
      },
      allContacts() {
        return slice((contactBook) => {
          const list = Object.values(contactBook.contactsByAddr);
          return (
            list.filter((item): item is ContactBookItem => !!item?.isContact) ||
            []
          );
        });
      },
    };
  },

  effects: (dispatch) => ({
    async getContactBookAsync(_: void, store) {
      const contactsByAddr: Record<
        string,
        ContactBookItem
      > = await store.app.wallet.getContactsByMap<
        Record<string, ContactBookItem>
      >();
      Object.values(contactsByAddr).forEach((item) => {
        if (item) {
          item.address = item.address.toLowerCase();
        }
      });
      dispatch.contactBook.setField({ contactsByAddr });
      return contactsByAddr;
    },

    // async getAliasNamesAsync(_:void, store) {
    //   const contactsMap: Record<string, ContactBookItem> =
    //     store.contactBook.contactsByAddr;
    //   return Object.values(contactsMap).filter((item) => item.isAlias);
    // },

    // getContactOrAliasByAddress(
    //   address: string,
    //   store
    // ): ContactBookItem | undefined {
    //   const contactsByAddr: Record<string, ContactBookItem> =
    //     store.contactBook.contactsByAddr;
    //   return contactsByAddr[address.toLowerCase()];
    // },
  }),
});
