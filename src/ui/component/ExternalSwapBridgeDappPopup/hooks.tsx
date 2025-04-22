import { SWAP_SUPPORT_CHAINS } from '@/constant';
import { useRabbySelector } from '@/ui/store';
import { findChainByEnum } from '@/utils/chain';
import { CHAINS_ENUM } from '@debank/common';
import pRetry from 'p-retry';
import { useMemo } from 'react';
import { useAsync } from 'react-use';

type SwapBridgeDapps = {
  chain_ids: string[];
  dapp: {
    id: string;
    domain_id: string;
    is_ethereum?: boolean;
    is_push_tx: boolean;
    is_call_rpc: boolean;
    is_website: boolean;
    is_fake: any;
    version: string;
    check_at?: number;
    check_success?: boolean;
    check_desc_text: {
      title?: string;
      words?: string;
      desc?: string;
    };
    is_dapp_predict: number;
    name: string;
    logo_url: any;
    auto_name: string;
    auto_logo_url?: string;
    is_verified: any;
    credit_score: number;
    credit_rank_at: number;
    path?: string;
  };
};

const fetchBridgeDapps = async () => {
  const res = await fetch('http://static.debank.com/bridge_dapp_chains.json');
  const data: SwapBridgeDapps[] = await res.json();
  return data;
};

const fetchSwapDapps = async () => {
  const res = await fetch('http://static.debank.com/swap_dapp_chains.json');
  const data: SwapBridgeDapps[] = await res.json();
  return data;
};

const swapDapps = pRetry(fetchSwapDapps, {
  retries: 2,
});
const bridgeDapps = pRetry(fetchBridgeDapps, {
  retries: 2,
});

export const useExternalSwapBridgeDapps = (
  chain: CHAINS_ENUM | CHAINS_ENUM[],
  type: 'swap' | 'bridge'
) => {
  const bridgeSupportedChains = useRabbySelector(
    (s) => s.bridge.supportedChains
  );

  const { value, loading } = useAsync(() => {
    return type === 'swap' ? swapDapps : bridgeDapps;
  }, [type]);

  const isSupportedChain = useMemo(() => {
    const supportedChains =
      type === 'swap' ? SWAP_SUPPORT_CHAINS : bridgeSupportedChains;
    return Array.isArray(chain)
      ? chain.every((e) => supportedChains.includes(e))
      : supportedChains.includes(chain);
  }, [chain, type, bridgeSupportedChains]);

  const data = useMemo(() => {
    if (!isSupportedChain && value) {
      let filterData: SwapBridgeDapps[] = [];
      if (type === 'swap') {
        const targetChain = findChainByEnum(chain as CHAINS_ENUM);
        if (!targetChain) {
          return [];
        }
        filterData = value?.filter((item) =>
          item.chain_ids.some((e) => e === targetChain.serverId)
        );
      } else {
        const targetFromChain = findChainByEnum(chain[0]);
        const targetToChain = findChainByEnum(chain[1]);

        if (!targetFromChain || !targetToChain) {
          return [];
        }

        filterData = value?.filter(
          (item) =>
            item.chain_ids.some((e) => e === targetFromChain?.serverId) &&
            item.chain_ids.some((e) => e === targetToChain?.serverId)
        );
      }

      return filterData?.map(({ dapp }) => ({
        name:
          dapp.name || dapp.auto_name || dapp.check_desc_text?.title || dapp.id,
        logo: dapp.logo_url || dapp.auto_logo_url,
        domain: dapp.domain_id,
        url: dapp?.path || dapp.id,
      }));
    }
    return [];
  }, [isSupportedChain, value, chain]);

  return {
    data,
    isSupportedChain,
    loading,
  };
};
