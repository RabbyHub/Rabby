import { useEffect, useRef } from 'react';
import produce from 'immer';
import { useWallet } from '../utils/WalletContext';
import { loadAppChainList } from '../utils/portfolio/utils';
import { useSafeState } from '../utils/safeState';
import { snapshot2Display, portfolio2Display } from '../utils/portfolio/utils';
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
      setData([]);
      setNetWorth(0);
    }

    if (userAddr) {
      timer = setTimeout(() => {
        if (visible && !isSameAddress(userAddr, userAddrRef.current)) {
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

  const loadProcess = async () => {
    if (!userAddr) return;
    projectDict.current = {};
    setLoading(true);
    setData([]);
    setHasValue(false);

    if (isTestnet) {
      setLoading(false);
      return;
    }

    const { list } = snapshot2Display([]);
    projectDict.current = list;

    // load app chain list
    const appChainListRes = await loadAppChainList(userAddr, wallet);
    if (!appChainListRes?.apps?.length) {
      return;
    }
    appChainListRes.apps.forEach((app) => {
      if (projectDict.current) {
        projectDict.current = produce(projectDict.current, (draft) => {
          portfolio2Display({ ...app, chain: app.id }, draft);
        });
      }
    });

    const realtimeData = Object.values(projectDict.current)?.sort(
      (m, n) => (n.netWorth || 0) - (m.netWorth || 0)
    );
    setData(realtimeData);
    setHasValue(true);
    setNetWorth(realtimeData.reduce((m, n) => m + n.netWorth, 0));
    setLoading(false);
  };

  return {
    netWorth,
    data,
    hasValue,
    isLoading,
    updateData: loadProcess,
  };
};
