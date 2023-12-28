import { useEffect, useState } from 'react';
import { useWallet, useWalletRequest } from 'ui/utils';

import type { ChainWithBalance } from 'background/service/openapi';

import { CHAINS } from 'consts';
import { findChainByServerID } from '@/utils/chain';

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
  nonce = 0,
  includeTestnet = false
) {
  const wallet = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [testnetBalance, setTestnetBalance] = useState<number | null>(null);
  const [success, setSuccess] = useState(true);
  const [testnetSuccess, setTestnetSuccess] = useState(true);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [testnetBalanceLoading, setTestnetBalanceLoading] = useState(false);
  const [balanceFromCache, setBalanceFromCache] = useState(false);
  const [testnetBalanceFromCache, setTestnetBalanceFromCache] = useState(false);
  let isCanceled = false;
  const [matteredChainBalances, setChainBalances] = useState<
    DisplayChainWithWhiteLogo[]
  >([]);
  const [testnetMatteredChainBalances, setTestnetChainBalances] = useState<
    DisplayChainWithWhiteLogo[]
  >([]);
  const [hasValueChainBalances, setHasValueChainBalances] = useState<
    DisplayChainWithWhiteLogo[]
  >([]);
  const [
    hasTestnetValueChainBalances,
    setHasTestnetValueChainBalances,
  ] = useState<DisplayChainWithWhiteLogo[]>([]);
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

  const [getTestnetBalance] = useWalletRequest(wallet.getAddressBalance, {
    onSuccess({ total_usd_value, chain_list }) {
      if (isCanceled) return;
      setTestnetBalance(total_usd_value);
      setTestnetSuccess(true);
      const chanList = chain_list
        .filter((item) => item.born_at !== null)
        .map(formatChain);
      setTestnetChainBalances(chanList);
      setHasTestnetValueChainBalances(
        chanList.filter((item) => item.usd_value > 0)
      );
      setTestnetBalanceLoading(false);
      setTestnetBalanceFromCache(false);
    },
    onError() {
      setTestnetSuccess(false);
      setTestnetBalanceLoading(false);
    },
  });

  const getCurrentBalance = async (force = false) => {
    if (!account || noNeedBalance) return;
    setBalanceLoading(true);
    const cacheData = await wallet.getAddressCacheBalance(account);
    if (cacheData) {
      setBalanceFromCache(true);
      setBalance(cacheData.total_usd_value);
      if (update) {
        setBalanceLoading(true);
        getAddressBalance(account.toLowerCase(), force);
        if (includeTestnet) {
          getTestnetBalance(account.toLowerCase(), force, true);
        }
      } else {
        setBalanceLoading(false);
      }
    } else {
      getAddressBalance(account.toLowerCase(), force);
      if (includeTestnet) {
        getTestnetBalance(account.toLowerCase(), force, true);
      }
      setBalanceLoading(false);
      setBalanceFromCache(false);
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
  return [
    balance,
    matteredChainBalances,
    getAddressBalance,
    success,
    balanceLoading,
    balanceFromCache,
    refresh,
    hasValueChainBalances,
    testnetBalance,
    testnetMatteredChainBalances,
    getTestnetBalance,
    testnetSuccess,
    testnetBalanceLoading,
    testnetBalanceFromCache,
    hasTestnetValueChainBalances,
    missingList,
  ] as const;
}
