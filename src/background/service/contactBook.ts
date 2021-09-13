import { createPersistStore } from 'background/utils';

export interface ContactBookItem {
  name: string;
  address: string;
}

type ContactBookStore = Record<string, ContactBookItem | undefined>;

class ContactBook {
  store!: ContactBookStore;

  init = async () => {
    this.store = await createPersistStore<ContactBookStore>({
      name: 'contactBook',
      template: {},
    });
  };

  getContactByAddress = (address: string) => {
    return this.store[address.toLowerCase()];
  };

  addContact = (data: ContactBookItem) => {
    this.store[data.address.toLowerCase()] = data;
  };

  removeContact = (address: string) => {
    this.store[address.toLowerCase()] = undefined;
  };

  updateContact = (data: ContactBookItem) => {
    this.store[data.address.toLowerCase()] = data;
  };

  listContacts = (): ContactBookItem[] => {
    const list = Object.values(this.store);
    return list.filter((item): item is ContactBookItem => !!item) || [];
  };
}

export default new ContactBook();
