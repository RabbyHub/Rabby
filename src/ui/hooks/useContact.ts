import { useCallback } from 'react';
import { useRabbyDispatch, useRabbySelector } from '../store';
import { KEYRING_CLASS } from '@/constant';
import { isSameAddress } from '../utils';

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
      const laddr = address.toLowerCase();

      return (
        !!contactsByAddr[laddr]?.isAlias &&
        accountsList.find((account) => isSameAddress(account.address, laddr))
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
