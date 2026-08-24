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
  const contactsByAddr = useContactBookStore((state) => state.contactsByAddr);
  const getContactBookAsync = useContactBookStore(
    (state) => state.getContactBookAsync
  );

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
    getContactBookAsync();
    dispatch.accountToDisplay.getAllAccountsToDisplay();
  }, [dispatch.accountToDisplay, getContactBookAsync]);

  return {
    getAddressNote,
    isAddrOnContactBook,
    fetchContactAccounts,
  };
}
