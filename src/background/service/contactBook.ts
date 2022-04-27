import { createPersistStore } from 'background/utils';

export interface ContactBookItem {
  name: string;
  address: string;
  isAlias: boolean;
  isContact: boolean;
}

export type ContactBookStore = Record<string, ContactBookItem | undefined>;

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
    if (this.store[data.address.toLowerCase()]) {
      this.store[data.address.toLowerCase()] = Object.assign(
        {},
        this.store[data.address.toLowerCase()],
        data
      );
    } else {
      this.store[data.address.toLowerCase()] = data;
    }
  };

  listContacts = (): ContactBookItem[] => {
    const list = Object.values(this.store);
    return list.filter((item): item is ContactBookItem => !!item) || [];
  };

  removeAlias = (address: string) => {
    const key = address.toLowerCase();
    if (!this.store[key]) return;
    this.store[key]!.isAlias = false;
  };

  getContactsByMap = () => {
    return this.store;
  };
}

export default new ContactBook();
