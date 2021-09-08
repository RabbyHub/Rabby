import cloneDeep from 'lodash/cloneDeep';
import { createPersistStore } from 'background/utils';

export interface ContactBookItem {
  name: string;
  address: string;
}

type ContactBookStore = Record<string, ContactBookItem>;

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
    const storeCopy = cloneDeep(this.store);
    delete storeCopy[address.toLowerCase()];
    this.store = storeCopy;
  };

  updateContact = (data: ContactBookItem) => {
    this.store[data.address.toLowerCase()] = data;
  };

  listContacts = () => {
    return Object.values(this.store) || [];
  };
}

export default new ContactBook();
