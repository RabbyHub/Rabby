import { useCallback, useEffect, useRef } from 'react';
import { AppChainItem } from '@rabby-wallet/rabby-api/dist/types';
import { APPCHAIN_SYNC_SCENE, CACHE_VALID_DURATION } from '@/db/constants';
import { appChainDbService } from '@/db/services/appChainDbService';
import { syncDbService } from '@/db/services/syncDbService';
import { isFullVersionAccountType } from '@/utils/account';
import { useWallet } from '../utils/WalletContext';
import { loadAppChainList } from '../utils/portfolio/utils';
import { useSafeState } from '../utils/safeState';
import { snapshot2Display } from '../utils/portfolio/utils';
import { DisplayedProject } from '../utils/portfolio/project';
import { isSameAddress } from '../utils';
import { DisplayChainWithWhiteLogo } from './useCurrentBalance';

export interface AppChain {
  logo: string;
  name: string;
  id: string;
  usd_value: number;
}

export const formatAppChain = (app: AppChain): DisplayChainWithWhiteLogo => {
  return {
    ...app,
    logo: app.logo || '',
    name: app.name,
    community_id: 0,
    logo_url: app.logo,
    native_token_id: '',
    wrapped_token_id: '',
    usd_value: app.usd_value,
    symbol: '',
    is_support_history: false,
    born_at: null,
    isAppChain: true,
  };
};
export const useAppChain = (
  userAddr: string | undefined,
  visible = true,
  isTestnet = false
) => {
  const abortProcess = useRef<AbortController>();
  const [appChains, setAppChains] = useSafeState<AppChainItem[]>([]);
  const [data, setData] = useSafeState<DisplayedProject[]>([]);
  const [netWorth, setNetWorth] = useSafeState(0);
  const [hasValue, setHasValue] = useSafeState(false);
  const [isLoading, setLoading] = useSafeState(true);
  const projectDict = useRef<Record<string, DisplayedProject> | null>({});
  const wallet = useWallet();
  const userAddrRef = useRef('');

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (userAddr && !isSameAddress(userAddr, userAddrRef.current)) {
      setAppChains([]);
      setData([]);
      setNetWorth(0);
    }

    if (userAddr) {
      timer = setTimeout(() => {
        if (visible && !isSameAddress(userAddr, userAddrRef.current)) {
          abortProcess.current?.abort();
          userAddrRef.current = userAddr;
          loadProcess();
        }
      });
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };
  }, [userAddr, visible]);

  const applyAppChains = (appChains: AppChainItem[]) => {
    const { list, netWorth: snapshotNetWorth } = snapshot2Display(
      appChains.map((app) => ({
        ...app,
        chain: app.id,
      }))
    );

    projectDict.current = list;
    const snapshotData = Object.values(list)?.sort(
      (m, n) => (n.netWorth || 0) - (m.netWorth || 0)
    );

    setData(snapshotData);
    setAppChains(appChains);
    setHasValue(snapshotData.length > 0);
    setNetWorth(snapshotNetWorth);
  };

  const loadProcess = async ({ forceRefresh = false } = {}) => {
    if (!userAddr) return;

    const currentAbort = new AbortController();
    abortProcess.current = currentAbort;

    projectDict.current = {};
    setLoading(true);
    setAppChains([]);
    setData([]);
    setHasValue(false);

    if (isTestnet) {
      setLoading(false);
      return;
    }

    let currentAppChains: AppChainItem[] = [];
    const matchedAccount = await wallet.getAccountByAddress(userAddr);
    const shouldPersistAppChainCache = matchedAccount
      ? isFullVersionAccountType(matchedAccount as any)
      : false;

    if (shouldPersistAppChainCache) {
      currentAppChains = await appChainDbService.queryAppChains(userAddr);

      if (currentAbort.signal.aborted) {
        setLoading(false);
        return;
      }

      if (currentAppChains.length) {
        applyAppChains(currentAppChains);
        setLoading(false);
      }

      const updatedAt =
        (await syncDbService.getUpdatedAt({
          address: userAddr,
          scene: APPCHAIN_SYNC_SCENE,
        })) || 0;

      const shouldUseDbCache =
        currentAppChains.length > 0 &&
        !forceRefresh &&
        updatedAt > Date.now() - CACHE_VALID_DURATION;

      if (shouldUseDbCache) {
        return;
      }
    } else {
      await Promise.all([
        appChainDbService.deleteForAddress(userAddr),
        syncDbService.deleteSceneForAddress({
          address: userAddr,
          scene: APPCHAIN_SYNC_SCENE,
        }),
      ]);
    }

    try {
      const appChainListRes = await loadAppChainList(userAddr, wallet);

      if (currentAbort.signal.aborted) {
        setLoading(false);
        return;
      }

      currentAppChains = appChainListRes?.apps || [];
      applyAppChains(currentAppChains);

      if (shouldPersistAppChainCache) {
        await appChainDbService.replaceAddressAppChains(
          userAddr,
          currentAppChains
        );
        await syncDbService.setUpdatedAt({
          address: userAddr,
          scene: APPCHAIN_SYNC_SCENE,
          updatedAt: Date.now(),
        });
      }
    } catch (error) {
      // just ignore appChain data
    } finally {
      if (!currentAbort.signal.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    return () => {
      abortProcess.current?.abort();
    };
  }, []);

  const forceRefresh = useCallback(() => {
    loadProcess({ forceRefresh: true });
  }, [loadProcess]);

  return {
    appChains,
    netWorth,
    data,
    hasValue,
    isLoading,
    updateData: forceRefresh,
  };
};

const id2NameMap = {
  hyperliquid: 'Hyperliquid',
  polymarket: 'Polymarket',
};
export const getAppChainNames = (appChainIds: string[]) => {
  const names: string[] = [];
  appChainIds.forEach((id) => {
    if (id2NameMap[id]) {
      names.push(id2NameMap[id]);
    }
  });
  return names.length > 0 ? names.join(' & ') : null;
};
