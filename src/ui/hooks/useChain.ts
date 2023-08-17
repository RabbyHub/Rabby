import { useState, useRef, useMemo, useCallback, useEffect } from 'react';

import { findChainByEnum, varyAndSortChainItems } from '@/utils/chain';
import { CHAINS_ENUM, Chain } from '@debank/common';
import { useRabbyDispatch, useRabbySelector } from '../store';

export type ChainSelectorPurpose =
  | 'dashboard'
  | 'sendToken'
  | 'connect'
  | 'swap'
  | 'customRPC'
  | 'addAsset';

type FetchDataStage = false | 'fetching' | 'fetched' | 'inited';
/**
 * @description support mainnet ONLY now
 */
export function useAsyncInitializeChainList({
  supportChains,
  onChainInitializedAsync,
}: {
  supportChains?: Chain['enum'][];
  onChainInitializedAsync?: (firstEnum: CHAINS_ENUM) => void;
}) {
  const { pinned, matteredChainBalances } = useRabbySelector((state) => {
    return {
      pinned: (state.preference.pinnedChain?.filter((item) =>
        findChainByEnum(item)
      ) || []) as CHAINS_ENUM[],
      matteredChainBalances: state.account.matteredChainBalances,
    };
  });

  const { matteredList, unmatteredList } = useMemo(() => {
    return varyAndSortChainItems({
      supportChains,
      pinned,
      matteredChainBalances,
    });
  }, [pinned, supportChains, matteredChainBalances]);

  const dispatch = useRabbyDispatch();

  const fetchChainDataStageRef = useRef<FetchDataStage>(false);
  const chainRef = useRef<CHAINS_ENUM>(CHAINS_ENUM.ETH);
  const [, setSpinner] = useState(0);
  const updateInitStage = useCallback(
    async (nextStage: Exclude<FetchDataStage, false>) => {
      if (!nextStage) return;
      fetchChainDataStageRef.current = nextStage;
      setSpinner((prev) => prev + 1);
    },
    []
  );

  const fetchDataOnce = useCallback(async () => {
    if (fetchChainDataStageRef.current) return;
    updateInitStage('fetching');

    await dispatch.preference.getPreference('pinnedChain');
    await dispatch.account.getMatteredChainBalance({});
    updateInitStage('fetched');
  }, [updateInitStage]);

  useEffect(() => {
    fetchDataOnce();
  }, [fetchDataOnce]);

  const firstEnum = matteredList[0]?.enum;

  const markFinishInitializeChainExternally = useCallback(
    (chain: CHAINS_ENUM) => {
      if (fetchChainDataStageRef.current === 'fetched') {
        chainRef.current = chain;
        updateInitStage('inited');
      }
    },
    []
  );

  useEffect(() => {
    if (firstEnum && fetchChainDataStageRef.current === 'fetched') {
      updateInitStage('inited');
      chainRef.current = firstEnum;
      onChainInitializedAsync?.(firstEnum);
    }
  }, [firstEnum, updateInitStage, onChainInitializedAsync]);

  return {
    matteredList,
    unmatteredList: unmatteredList,
    pinned,
    fetchDataOnce,
    markFinishInitializeChainExternally,
  };
}
