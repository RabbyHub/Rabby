import { useCallback } from 'react';
import { useRabbyDispatch, useRabbySelector } from '../store';
import { KEYRING_CLASS } from '@/constant';
import { isSameAddress } from '../utils';
import { useContactBookStore } from '@/ui/state/contactBook';

export function useContactAccounts() {
  const dispatch = useRabbyDispatch();
  const accountsList = useRabbySelector(
    (state) => state.accountToDisplay.accountsList
  );
  const contactBook = useContactBookStore();

  const isAddrOnContactBook = useCallback(
    (address?: string) => {
      if (!address) return false;
      const laddr = address.toLowerCase();

      return (
        !!contactBook[laddr]?.isAlias &&
        accountsList.find((account) => isSameAddress(account.address, laddr))
      );
    },
    [accountsList, contactBook]
  );

  const getAddressNote = useCallback(
    (addr) => {
      return contactBook[addr.toLowerCase()]?.name || '';
    },
    [contactBook]
  );

  const fetchContactAccounts = useCallback(() => {
    dispatch.accountToDisplay.getAllAccountsToDisplay();
  }, [dispatch.accountToDisplay]);

  return {
    getAddressNote,
    isAddrOnContactBook,
    fetchContactAccounts,
  };
}
