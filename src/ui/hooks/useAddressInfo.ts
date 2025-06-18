import { AddrDescResponse } from '@rabby-wallet/rabby-api/dist/types';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRabbyDispatch, useRabbySelector } from '../store';
import { isValidAddress } from '@ethereumjs/util';
import { isSameAddress, useWallet } from '../utils';
import { padWatchAccount } from '../views/SendPoly/util';

export const useAddressInfo = (address: string) => {
  const [addressDesc, setAddressDesc] = useState<
    AddrDescResponse['desc'] | undefined
  >();
  const [loadingAddrDesc, setLoadingAddrDesc] = useState(true);

  const dispatch = useRabbyDispatch();

  const wallet = useWallet();
  const { accountsList } = useRabbySelector((s) => ({
    accountsList: s.accountToDisplay.accountsList,
  }));

  const { isImported, targetAccount } = useMemo(() => {
    if (!address) {
      return {};
    }
    const isImported = accountsList.some((acc) =>
      isSameAddress(acc.address, address)
    );
    const targetAccount =
      accountsList.find((acc) => isSameAddress(acc.address, address)) ||
      padWatchAccount(address);

    return {
      isImported,
      targetAccount,
    };
  }, []);

  useEffect(() => {
    if (!isValidAddress(address)) {
      return;
    }
    dispatch.accountToDisplay.getAllAccountsToDisplay();
  }, []);

  useEffect(() => {
    if (!isValidAddress(address)) {
      return;
    }
    setLoadingAddrDesc(true);
    wallet.openapi
      .addrDesc(address)
      .then((res) => {
        if (res) {
          setAddressDesc(res.desc);
        }
      })
      .finally(() => {
        setLoadingAddrDesc(false);
      });
  }, [address, dispatch]);

  return {
    addressDesc,
    isImported,
    targetAccount,
    loading: loadingAddrDesc,
  };
};
