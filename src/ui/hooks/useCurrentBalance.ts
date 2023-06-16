import { useEffect, useState } from 'react';
import { useWallet, useWalletRequest } from 'ui/utils';

import type { ChainWithBalance } from 'background/service/openapi';

import { CHAINS } from 'consts';

export interface DisplayChainWithWhiteLogo extends ChainWithBalance {
  logo?: string;
  whiteLogo?: string;
}

const formatChain = (item: ChainWithBalance): DisplayChainWithWhiteLogo => {
  const chainsArray = Object.values(CHAINS);
  const chain = chainsArray.find((chain) => chain.id === item.community_id);

  return {
    ...item,
    logo: chain?.logo || item.logo_url,
    whiteLogo: chain?.whiteLogo,
  };
};

export default function useCurrentBalance(
  account: string | undefined,
  update = false,
  noNeedBalance = false,
  nonce = 0
) {
  const wallet = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [success, setSuccess] = useState(true);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceFromCache, setBalanceFromCache] = useState(false);
  let isCanceled = false;
  const [chainBalances, setChainBalances] = useState<
    DisplayChainWithWhiteLogo[]
  >([]);

  const [getAddressBalance] = useWalletRequest(wallet.getAddressBalance, {
    onSuccess({ total_usd_value, chain_list }) {
      if (isCanceled) return;
      setBalance(total_usd_value);
      setSuccess(true);
      setChainBalances(
        chain_list.filter((item) => item.usd_value > 0).map(formatChain)
      );
      setBalanceLoading(false);
      setBalanceFromCache(false);
    },
    onError() {
      setSuccess(false);
      setBalanceLoading(false);
    },
  });

  const getCurrentBalance = async () => {
    if (!account || noNeedBalance) return;
    setBalanceLoading(true);
    const cacheData = await wallet.getAddressCacheBalance(account);
    if (cacheData) {
      setBalanceFromCache(true);
      setBalance(cacheData.total_usd_value);
      if (update) {
        setBalanceLoading(true);
        getAddressBalance(account.toLowerCase());
      } else {
        setBalanceLoading(false);
      }
    } else {
      getAddressBalance(account.toLowerCase());
      setBalanceLoading(false);
      setBalanceFromCache(false);
    }
  };

  useEffect(() => {
    getCurrentBalance();
    if (!noNeedBalance) {
      wallet.getAddressCacheBalance(account).then((cache) => {
        setChainBalances(
          cache
            ? cache.chain_list
                .filter((item) => item.usd_value > 0)
                .map(formatChain)
            : []
        );
      });
    }
    return () => {
      isCanceled = true;
    };
  }, [account, nonce]);
  return [
    balance,
    chainBalances,
    getAddressBalance,
    success,
    balanceLoading,
    balanceFromCache,
  ] as const;
}
