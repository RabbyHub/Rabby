import { useEffect, useMemo, useState } from 'react';
import { isValidAddress } from '@ethereumjs/util';
import { AddrDescResponse } from '@rabby-wallet/rabby-api/dist/types';

import { useRabbyDispatch, useRabbySelector } from '../store';
import { padWatchAccount } from '../views/SendPoly/util';
import { isSameAddress, useWallet } from '../utils';
import { KEYRING_CLASS } from '@/constant';
import { findAccountByPriority } from '@/utils/account';

export const useAddressInfo = (
  address: string,
  options?: {
    disableDesc?: boolean;
    type?: string;
  }
) => {
  const { disableDesc, type } = options || {};

  const wallet = useWallet();
  const dispatch = useRabbyDispatch();
  const { accountsList, exchanges } = useRabbySelector((s) => ({
    accountsList: s.accountToDisplay.accountsList,
    exchanges: s.exchange.exchanges,
  }));

  const [addressDesc, setAddressDesc] = useState<
    AddrDescResponse['desc'] | undefined
  >();
  const [loadingAddrDesc, setLoadingAddrDesc] = useState(true);

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
    const targetTypeAccount = findAccountByPriority(
      accountsList.filter(
        (acc) =>
          isSameAddress(acc.address, address) &&
          (type
            ? type.toLocaleLowerCase() === acc.type.toLocaleLowerCase()
            : true)
      )
    );

    const targetSameAddressAccount = findAccountByPriority(
      accountsList.filter((acc) => isSameAddress(acc.address, address))
    );
    const targetAccount =
      targetTypeAccount || targetSameAddressAccount || padWatchAccount(address);

    return {
      isImported,
      targetAccount,
      isMyImported,
    };
  }, [accountsList, address, type]);

  useEffect(() => {
    if (!isValidAddress(address)) {
      return;
    }
    dispatch.accountToDisplay.getAllAccountsToDisplay();
  }, []);

  useEffect(() => {
    (async () => {
      if (disableDesc && !isValidAddress(address)) {
        setAddressDesc(undefined);
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
        setAddressDesc(undefined);
      } finally {
        setLoadingAddrDesc(false);
      }
    })();
  }, [address, dispatch, exchanges, disableDesc, wallet]);

  const tmpCexInfo = useMemo(() => {
    // 已导入的地址不需要强制展示交易所信息，本地有标才展示
    if (isImported || !addressDesc?.cex?.id) {
      return undefined;
    }
    return {
      id: addressDesc?.cex?.id,
      name: addressDesc?.cex?.name,
      logo: addressDesc?.cex?.logo_url,
    };
  }, [isImported, addressDesc]);

  return {
    addressDesc,
    isImported,
    isMyImported,
    targetAccount,
    loading: loadingAddrDesc,
    tmpCexInfo,
  };
};
