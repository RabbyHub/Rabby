import { useEffect, useState } from 'react';
import { useWallet, useWalletRequest } from 'ui/utils';

import type { ChainWithBalance } from 'background/service/openapi';

import { CHAINS } from 'consts';
import { findChain, findChainByServerID } from '@/utils/chain';

export interface DisplayChainWithWhiteLogo extends ChainWithBalance {
  logo?: string;
  whiteLogo?: string;
}

const formatChain = (item: ChainWithBalance): DisplayChainWithWhiteLogo => {
  const chain = findChain({
    id: item.community_id,
  });

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
  const [matteredChainBalances, setChainBalances] = useState<
    DisplayChainWithWhiteLogo[]
  >([]);
  const [hasValueChainBalances, setHasValueChainBalances] = useState<
    DisplayChainWithWhiteLogo[]
  >([]);

  const [missingList, setMissingList] = useState<string[]>();

  const [getAddressBalance] = useWalletRequest(wallet.getAddressBalance, {
    onSuccess({ total_usd_value, chain_list }) {
      if (isCanceled) return;
      setBalance(total_usd_value);
      setSuccess(true);
      const chanList = chain_list
        .filter((item) => item.born_at !== null)
        .map(formatChain);
      setChainBalances(chanList);
      setHasValueChainBalances(chanList.filter((item) => item.usd_value > 0));
      setBalanceLoading(false);
      setBalanceFromCache(false);
    },
    onError(e) {
      setBalanceLoading(false);
      try {
        const { error_code, err_chain_ids } = JSON.parse(e.message);
        if (error_code === 2) {
          const chainNames = err_chain_ids.map((serverId: string) => {
            const chain = findChainByServerID(serverId);
            return chain?.name;
          });
          setMissingList(chainNames);
          setSuccess(true);
          return;
        }
      } catch (e) {
        console.error(e);
      }
      setSuccess(false);
    },
  });

  const getCurrentBalance = async (force = false) => {
    if (!account || noNeedBalance) return;
    setBalanceLoading(true);
    const cacheData = await wallet.getAddressCacheBalance(account);
    const apiLevel = await wallet.getAPIConfig([], 'ApiLevel', false);
    if (cacheData) {
      setBalanceFromCache(true);
      setBalance(cacheData.total_usd_value);
      const chanList = cacheData.chain_list
        .filter((item) => item.born_at !== null)
        .map(formatChain);
      setHasValueChainBalances(chanList.filter((item) => item.usd_value > 0));
      if (update) {
        if (apiLevel < 2) {
          setBalanceLoading(true);
          getAddressBalance(account.toLowerCase(), force);
        } else {
          setBalanceLoading(false);
        }
      } else {
        setBalanceLoading(false);
      }
    } else {
      if (apiLevel < 2) {
        getAddressBalance(account.toLowerCase(), force);
        setBalanceLoading(false);
        setBalanceFromCache(false);
      } else {
        setBalanceLoading(false);
      }
    }
  };

  const refresh = async () => {
    await getCurrentBalance(true);
  };

  useEffect(() => {
    getCurrentBalance();
    if (!noNeedBalance) {
      wallet.getAddressCacheBalance(account).then((cache) => {
        setChainBalances(
          cache
            ? cache.chain_list
                .filter((item) => item.born_at !== null)
                .map(formatChain)
            : []
        );
      });
    }
    return () => {
      isCanceled = true;
    };
  }, [account, nonce]);
  return {
    balance,
    matteredChainBalances,
    getAddressBalance,
    success,
    balanceLoading,
    balanceFromCache,
    refreshBalance: refresh,
    hasValueChainBalances,
    missingList,
  };
}
