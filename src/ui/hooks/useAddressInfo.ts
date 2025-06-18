import { AddrDescResponse } from '@rabby-wallet/rabby-api/dist/types';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRabbyDispatch, useRabbySelector } from '../store';
import { isValidAddress } from '@ethereumjs/util';
import { isSameAddress, useWallet } from '../utils';
import { padWatchAccount } from '../views/SendPoly/util';
import { KEYRING_CLASS } from '@/constant';

export const useAddressInfo = (
  address: string,
  options?: {
    disableDesc?: boolean;
  }
) => {
  const { disableDesc } = options || {};
  const [addressDesc, setAddressDesc] = useState<
    AddrDescResponse['desc'] | undefined
  >();
  const [loadingAddrDesc, setLoadingAddrDesc] = useState(true);

  const dispatch = useRabbyDispatch();

  const wallet = useWallet();
  const { accountsList } = useRabbySelector((s) => ({
    accountsList: s.accountToDisplay.accountsList,
  }));

  const { isImported, targetAccount, isMyImported } = useMemo(() => {
    if (!address) {
      return {};
    }
    const isImported = accountsList.some((acc) =>
      isSameAddress(acc.address, address)
    );
    const isMyImported = accountsList
      .filter(
        (acc) =>
          acc.type !== KEYRING_CLASS.WATCH && acc.type !== KEYRING_CLASS.GNOSIS
      )
      .some((acc) => isSameAddress(acc.address, address));
    const targetAccount =
      accountsList.find((acc) => isSameAddress(acc.address, address)) ||
      padWatchAccount(address);

    return {
      isImported,
      targetAccount,
      isMyImported,
    };
  }, []);

  useEffect(() => {
    if (!isValidAddress(address)) {
      return;
    }
    dispatch.accountToDisplay.getAllAccountsToDisplay();
  }, []);

  useEffect(() => {
    if (disableDesc && !isValidAddress(address)) {
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
    isMyImported,
    targetAccount,
    loading: loadingAddrDesc,
  };
};
