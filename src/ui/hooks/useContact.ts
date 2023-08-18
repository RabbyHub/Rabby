import { useCallback } from 'react';
import { useRabbyDispatch, useRabbySelector } from '../store';
import { KEYRING_CLASS } from '@/constant';

export function useContactAccounts() {
  const dispatch = useRabbyDispatch();
  const { accountsList, contactsByAddr } = useRabbySelector((state) => {
    return {
      accountsList: state.accountToDisplay.accountsList,
      contactsByAddr: state.contactBook.contactsByAddr,
    };
  });

  const isAddrOnContactBook = useCallback(
    (address?: string) => {
      if (!address) return false;

      return (
        !!contactsByAddr[address.toLowerCase()]?.isAlias &&
        accountsList.find(
          (account) =>
            account.address === address && account.type === KEYRING_CLASS.WATCH
        )
      );
    },
    [accountsList, contactsByAddr]
  );

  const getAddressNote = useCallback(
    (addr) => {
      return contactsByAddr[addr.toLowerCase()]?.name || '';
    },
    [contactsByAddr]
  );

  const fetchContactAccounts = useCallback(() => {
    dispatch.contactBook.getContactBookAsync();
    dispatch.accountToDisplay.getAllAccountsToDisplay();
  }, []);

  return {
    getAddressNote,
    isAddrOnContactBook,
    fetchContactAccounts,
  };
}
