import { useEffect, useRef } from 'react';
import produce from 'immer';
import { Dayjs } from 'dayjs';
// import { atom, useSetAtom } from 'jotai';

import { CHAIN_ID_LIST, syncChainIdList } from 'consts';
import { useWallet } from '../WalletContext';
import { chunk, loadTestnetPortfolioSnapshot } from './utils';
import { useSafeState } from '../safeState';
import { getExpandListSwitch } from './expandList';
import {
  batchLoadProjects,
  batchLoadHistoryProjects,
  loadPortfolioSnapshot,
  snapshot2Display,
  portfolio2Display,
  patchPortfolioHistory,
  getMissedTokenPrice,
} from './utils';
import { DisplayedProject } from './project';
import { isSameAddress } from '..';
import { ComplexProtocol } from '@rabby-wallet/rabby-api/dist/types';

const chunkSize = 5;

export const log = (...args: any) => {
  // console.log(...args);
};

// export const portfolioChangeLoadingAtom = atom(true);

export const usePortfolios = (
  userAddr: string | undefined,
  timeAt?: Dayjs,
  visible = true,
  isTestnet = false
) => {
  const [data, setData] = useSafeState<DisplayedProject[]>([]);
  const [netWorth, setNetWorth] = useSafeState(0);
  const [hasValue, setHasValue] = useSafeState(false);
  const abortProcess = useRef<AbortController>();
  const [isLoading, setLoading] = useSafeState(true);
  const projectDict = useRef<Record<string, DisplayedProject> | null>({});
  const historyTime = useRef<number>();
  const historyLoad = useRef<boolean>(false);
  const realtimeIds = useRef<string[]>([]);
  const wallet = useWallet();
  const userAddrRef = useRef('');
  // const setPortfolioChangeLoading = useSetAtom(portfolioChangeLoadingAtom);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (userAddr && !isSameAddress(userAddr, userAddrRef.current)) {
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

  useEffect(() => {
    if (timeAt) {
      historyTime.current = timeAt.unix();

      if (!isLoading) {
        loadHistory();
      }
    } else {
      historyTime.current = 0;
    }
    // eslint-disable-next-line
  }, [timeAt, isLoading]);

  const loadProcess = async () => {
    if (!userAddr) return;
    projectDict.current = {};

    const currentAbort = new AbortController();
    abortProcess.current = currentAbort;

    historyLoad.current = false;

    setLoading(true);
    // setPortfolioChangeLoading(withHistory);

    log('======Start-Portfolio======', userAddr);
    setData([]);
    setHasValue(false);

    let snapshotRes: ComplexProtocol[] = [];
    if (isTestnet) {
      snapshotRes = await loadTestnetPortfolioSnapshot(userAddr, wallet);
    } else {
      snapshotRes = await loadPortfolioSnapshot(userAddr, wallet);
    }

    if (currentAbort.signal.aborted || !snapshotRes) {
      log('--Terminate-portfolio-snapshot-', userAddr);
      setLoading(false);
      return;
    }

    // request success
    const _hasValue = Object.values(snapshotRes).some(
      (x) => Object.keys(x).length > 0
    );

    if (_hasValue) {
      setHasValue(true);
    }

    const { list, netWorth: snapshotNetWorth } = snapshot2Display(snapshotRes);

    projectDict.current = list;
    const snapshotData = Object.values(list)?.sort(
      (m, n) => (n.netWorth || 0) - (m.netWorth || 0)
    );
    setData(snapshotData);
    setNetWorth(snapshotNetWorth);

    const { thresholdIndex, hasExpandSwitch } = getExpandListSwitch(
      snapshotData,
      snapshotNetWorth
    );

    realtimeIds.current = hasExpandSwitch
      ? snapshotData.slice(0, thresholdIndex).map((x) => x.id)
      : snapshotRes.map((x) => x.id);

    if (currentAbort.signal.aborted || !realtimeIds.current.length) {
      log('--Terminate-portfolio-loadProjectIds-', userAddr);
      projectDict.current = null;
      setLoading(false);
      return;
    }

    const chunkIds = chunk(realtimeIds.current, chunkSize);

    let realtimeData: DisplayedProject[] = [];

    await Promise.all(
      chunkIds.map(async (ids) => {
        if (currentAbort.signal.aborted) {
          return;
        }

        const projectListRes = await batchLoadProjects(
          userAddr,
          ids,
          wallet,
          isTestnet
        );

        const projects = projectListRes;

        if (!projects?.length || currentAbort.signal.aborted) {
          return;
        }

        projects.forEach((project) => {
          if (!currentAbort.signal.aborted && projectDict.current) {
            log('#####################REALTIME###############################');
            projectDict.current = produce(projectDict.current, (draft) => {
              portfolio2Display(project, draft);
            });
          }
        });
      })
    );

    realtimeData = Object.values(projectDict.current)?.sort(
      (m, n) => (n.netWorth || 0) - (m.netWorth || 0)
    );
    setData(realtimeData);

    setNetWorth(realtimeData.reduce((m, n) => m + n.netWorth, 0));
    setLoading(false);

    loadHistory(currentAbort);
    log('portfolios-end', userAddr);
  };

  const loadHistory = async (currentAbort = new AbortController()) => {
    if (
      !historyTime.current ||
      currentAbort.signal.aborted ||
      !userAddr ||
      historyLoad.current
    ) {
      return;
    }

    historyLoad.current = true;
    syncChainIdList();
    const historyIds = realtimeIds.current.filter(
      (x) =>
        projectDict.current![x].chain &&
        CHAIN_ID_LIST.get(projectDict.current![x].chain!)?.isSupportHistory
    );

    const historyIdsArr = chunk(historyIds, chunkSize);

    if (currentAbort.signal.aborted || !historyIdsArr.length) {
      return;
    }

    await Promise.all(
      historyIdsArr.map(async (ids) => {
        const historyProjectListRes = await batchLoadHistoryProjects(
          userAddr,
          ids,
          wallet,
          historyTime.current,
          isTestnet
        );
        const projects = historyProjectListRes;

        if (!projects?.length) {
          return;
        }

        projects.forEach((project) => {
          if (!currentAbort.signal.aborted && projectDict.current) {
            projectDict.current = produce(projectDict.current, (draft) => {
              patchPortfolioHistory(project, draft);
            });
          }
        });
      })
    );

    if (currentAbort.signal.aborted) {
      return;
    }
    const historyList = Object.values(projectDict.current!)?.sort(
      (m, n) => (n.netWorth || 0) - (m.netWorth || 0)
    );

    setData(historyList);

    // 可能有获取失败的，也需要通过 priceChange 来算大概的变化
    const notSuportHistoryProjects = realtimeIds.current.filter(
      (x) => !projectDict.current![x]._historyPatched
    );

    // 是否存在没有被 patchHistory 的（不支持历史结点 | 获取失败的），需要再去请求它之前的价格来计算大致的 usdChange
    const missedTokens = notSuportHistoryProjects.reduce((m, n) => {
      const pChain = projectDict.current![n]?.chain;

      if (!pChain) {
        return m;
      }

      m[pChain] = m[pChain] || new Set();

      projectDict.current![n]._portfolios?.forEach((x) => {
        x._tokenList?.forEach((t) => {
          m[pChain].add(t._tokenId);
        });
      });

      return m;
    }, {} as Record<string, Set<string>>);

    if (currentAbort.signal.aborted) {
      return;
    }

    const priceDicts = await getMissedTokenPrice(
      missedTokens,
      historyTime.current,
      wallet,
      isTestnet
    );

    if (currentAbort.signal.aborted || !projectDict.current || !priceDicts) {
      return;
    }

    projectDict.current = produce(projectDict.current, (draft) => {
      notSuportHistoryProjects?.forEach((pId) => {
        if (priceDicts?.[draft[pId].chain!]) {
          draft[pId].patchPrice(priceDicts?.[draft[pId].chain!]);
        }
      });
    });

    if (currentAbort.signal.aborted) {
      return;
    }

    const priceProjects = Object.values(projectDict.current!)?.sort(
      (m, n) => (n.netWorth || 0) - (m.netWorth || 0)
    );
    setData(priceProjects);
    // setPortfolioChangeLoading(false);
  };

  useEffect(() => {
    return () => {
      abortProcess.current?.abort();
    };
  }, []);

  return {
    netWorth,
    data,
    hasValue,
    isLoading,
    updateData: loadProcess,
  };
};
