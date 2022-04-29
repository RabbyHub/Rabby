import { PreferenceStore } from 'background/service/preference';
import {
  ContactBookStore,
  ContactBookItem,
} from 'background/service/contactBook';

export default {
  version: 4,
  async migrator(data: {
    preference: PreferenceStore | undefined;
    contactBook: ContactBookStore | undefined;
  }) {
    try {
      const { preference, contactBook } = data;
      if (preference && contactBook) {
        const aliaNames = preference.alianNames;
        const formattedAliaNames: Record<string, ContactBookItem> = {};
        for (const key in aliaNames) {
          formattedAliaNames[key] = {
            name: aliaNames[key],
            address: key,
            isAlias: true,
            isContact: false,
          };
        }
        for (const key in contactBook) {
          if (formattedAliaNames[key]) {
            contactBook[key]!.isAlias = true;
            delete formattedAliaNames[key];
          } else {
            contactBook[key]!.isAlias = false;
          }
          contactBook[key]!.isContact = true;
        }
        const newContactBook = Object.assign(
          {},
          contactBook,
          formattedAliaNames
        );
        delete preference.alianNames;
        return {
          ...data,
          preference,
          contactBook: newContactBook,
        };
      } else {
        return data;
      }
    } catch (e) {
      // drop custom tokens if migrate failed
      return data;
    }
  },
};
