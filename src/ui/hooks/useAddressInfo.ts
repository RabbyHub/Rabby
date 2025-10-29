import { useCallback, useEffect, useMemo, useState } from 'react';
import { isValidAddress } from '@ethereumjs/util';
import { AddrDescResponse } from '@rabby-wallet/rabby-api/dist/types';

import { useRabbyDispatch, useRabbySelector } from '../store';
import { padWatchAccount } from '../views/SendPoly/util';
import { isSameAddress, useAlias, useWallet } from '../utils';
import { KEYRING_CLASS } from '@/constant';
import { findAccountByPriority } from '@/utils/account';
import { ellipsisAddress } from '../utils/address';
import type { Account } from '@/background/service/preference';
import type { IDisplayedAccountWithBalance } from '../models/accountToDisplay';

export type AddressInfo = Account | IDisplayedAccountWithBalance;
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
  const [alias] = useAlias(address);
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
          (type ? type.toLowerCase() === acc.type.toLowerCase() : true)
      )
    );

    const targetSameAddressAccount = findAccountByPriority(
      accountsList.filter((acc) => isSameAddress(acc.address, address))
    );
    const targetAccount: AddressInfo | undefined =
      targetTypeAccount || targetSameAddressAccount || padWatchAccount(address);

    return {
      isImported,
      targetAccount: {
        ...targetAccount,
        alianName: alias || ellipsisAddress(address),
      },
      isMyImported,
    };
  }, [accountsList, address, type, alias]);

  useEffect(() => {
    if (!isValidAddress(address)) {
      return;
    }
    dispatch.accountToDisplay.getAllAccountsToDisplay();
  }, []);

  const fetchAddressDesc = useCallback(async () => {
    let addrDescRes: AddrDescResponse | undefined;
    if (addressDesc?.id && isSameAddress(addressDesc?.id, address)) {
      addrDescRes = { desc: addressDesc };
    } else {
      addrDescRes = await wallet.openapi.addrDesc(address);
    }
    const cexId = await wallet.getCexId(address);
    if (addrDescRes) {
      if (cexId) {
        const localCexInfo = exchanges.find(
          (e) => e.id.toLowerCase() === cexId?.toLowerCase()
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
      return addrDescRes;
    }
    return undefined;
  }, [address, addressDesc, exchanges, wallet]);

  const isTokenSupport = useCallback(
    async (
      id: string,
      chain: string
    ): Promise<{
      isCex: boolean;
      isCexSupport: boolean;
      isContractAddress: boolean;
      contractSupportChain: string[];
    }> => {
      try {
        const addrDescRes = await fetchAddressDesc();
        const cexId = addrDescRes?.desc?.cex?.id;

        const isSupportRes = cexId
          ? await wallet.openapi.depositCexSupport(id, chain, cexId)
          : { support: true };
        const isContract =
          Object.keys(addrDescRes?.desc?.contract || {}).length > 0;
        const supportChains = Object.entries(
          addrDescRes?.desc?.contract || {}
        ).map(([chainName]) => chainName?.toLowerCase());

        return {
          isCex: !!cexId,
          isCexSupport: isSupportRes.support,
          isContractAddress: isContract,
          contractSupportChain: supportChains,
        };
      } catch (error) {
        // if error, don't check cex and contract
        return {
          isCex: false,
          isCexSupport: true,
          isContractAddress: false,
          contractSupportChain: [],
        };
      }
    },
    [fetchAddressDesc, wallet]
  );

  useEffect(() => {
    (async () => {
      if (disableDesc && !isValidAddress(address)) {
        setAddressDesc(undefined);
        return;
      }
      setLoadingAddrDesc(true);
      try {
        const addrDescRes = await fetchAddressDesc();
        setAddressDesc(addrDescRes?.desc);
      } catch (error) {
        setAddressDesc(undefined);
      } finally {
        setLoadingAddrDesc(false);
      }
    })();
  }, [address, dispatch, exchanges, disableDesc, wallet, fetchAddressDesc]);

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
    isTokenSupport,
  };
};
