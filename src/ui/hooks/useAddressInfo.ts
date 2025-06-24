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
    type?: string;
  }
) => {
  const { disableDesc, type } = options || {};
  const [addressDesc, setAddressDesc] = useState<
    AddrDescResponse['desc'] | undefined
  >();
  const [loadingAddrDesc, setLoadingAddrDesc] = useState(true);

  const dispatch = useRabbyDispatch();

  const wallet = useWallet();
  const { accountsList, exchanges } = useRabbySelector((s) => ({
    accountsList: s.accountToDisplay.accountsList,
    exchanges: s.exchange.exchanges,
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
    const targetTypeAccount = accountsList.find(
      (acc) =>
        isSameAddress(acc.address, address) &&
        (type
          ? type.toLocaleLowerCase() === acc.type.toLocaleLowerCase()
          : true)
    );
    const targetSameAddressAccount = accountsList.find((acc) =>
      isSameAddress(acc.address, address)
    );
    const targetAccount =
      targetTypeAccount || targetSameAddressAccount || padWatchAccount(address);

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
    (async () => {
      if (disableDesc && !isValidAddress(address)) {
        return;
      }
      setLoadingAddrDesc(true);
      try {
        const addrDescRes = await wallet.openapi.addrDesc(address);
        const cexId = await wallet.getCexId(address);
        if (addrDescRes) {
          if (cexId) {
            const localCexInfo = exchanges.find(
              (e) => e.id.toLocaleLowerCase() === cexId?.toLocaleLowerCase()
            );
            if (localCexInfo) {
              addrDescRes.desc.cex = {
                id: localCexInfo?.id || '',
                name: localCexInfo?.name || '',
                logo_url: localCexInfo?.logo || '',
                is_deposit: true,
              };
            }
          }
          setAddressDesc(addrDescRes.desc);
        }
      } catch (error) {
        /* empty */
      } finally {
        setLoadingAddrDesc(false);
      }
    })();
  }, [address, dispatch, exchanges]);

  return {
    addressDesc,
    isImported,
    isMyImported,
    targetAccount,
    loading: loadingAddrDesc,
  };
};
