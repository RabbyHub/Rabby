import { useCallback, useEffect, useRef } from 'react';
import produce from 'immer';

import { CACHE_VALID_DURATION, DEFI_SYNC_SCENE } from '@/db/constants';
import { defiDbService } from '@/db/services/defiDbService';
import { syncDbService } from '@/db/services/syncDbService';
import { isFullVersionAccountType } from '@/utils/account';
import { useWallet } from '../WalletContext';
import { chunk } from './utils';
import { useSafeState } from '../safeState';
import { getExpandListSwitch } from './expandList';
import {
  batchLoadProjects,
  loadPortfolioSnapshot,
  snapshot2Display,
  portfolio2Display,
} from './utils';
import { DisplayedProject } from './project';
import { isSameAddress } from '..';
import { ComplexProtocol } from '@rabby-wallet/rabby-api/dist/types';

const chunkSize = 5;

const buildProtocolKey = (protocol: Pick<ComplexProtocol, 'id'>) => protocol.id;

const replaceProtocols = (
  protocols: ComplexProtocol[],
  nextProtocols: ComplexProtocol[]
) => {
  const nextProtocolMap = nextProtocols.reduce((map, protocol) => {
    map[buildProtocolKey(protocol)] = protocol;
    return map;
  }, {} as Record<string, ComplexProtocol>);

  return protocols.map((protocol) => {
    return nextProtocolMap[buildProtocolKey(protocol)] || protocol;
  });
};

export const log = (...args: any) => {
  // console.log(...args);
};

// export const portfolioChangeLoadingAtom = atom(true);

export const usePortfolios = (userAddr: string | undefined, visible = true) => {
  const [data, setData] = useSafeState<DisplayedProject[]>([]);
  const [netWorth, setNetWorth] = useSafeState(0);
  const [hasValue, setHasValue] = useSafeState(false);
  const abortProcess = useRef<AbortController>();
  const [isLoading, setLoading] = useSafeState(true);
  const projectDict = useRef<Record<string, DisplayedProject> | null>({});
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

  const applyProtocols = (protocols: ComplexProtocol[]) => {
    const _hasValue = protocols.some((x) => Object.keys(x).length > 0);
    setHasValue(_hasValue);

    const { list, netWorth: snapshotNetWorth } = snapshot2Display(protocols);

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
      : protocols.map((x) => x.id);
  };

  const loadProcess = async ({ forceRefresh = false } = {}) => {
    if (!userAddr) return;
    projectDict.current = {};

    const currentAbort = new AbortController();
    abortProcess.current = currentAbort;

    setLoading(true);

    log('======Start-Portfolio======', userAddr);
    setData([]);
    setHasValue(false);

    let currentProtocols: ComplexProtocol[] = [];
    const matchedAccount = await wallet.getAccountByAddress(userAddr);
    const shouldPersistDefiCache = matchedAccount
      ? isFullVersionAccountType(matchedAccount as any)
      : false;

    /**
     * 阶段一：本地 DB 缓存
     */
    try {
      if (shouldPersistDefiCache) {
        currentProtocols = await defiDbService.queryProtocols(userAddr);

        if (currentAbort.signal.aborted) {
          log('--Terminate-portfolio-db-cache-', userAddr);
          setLoading(false);
          return;
        }

        if (currentProtocols.length) {
          applyProtocols(currentProtocols);
          setLoading(false);
        }

        const updatedAt =
          (await syncDbService.getUpdatedAt({
            address: userAddr,
            scene: DEFI_SYNC_SCENE,
          })) || 0;

        const shouldUseDbCache =
          currentProtocols.length > 0 &&
          !forceRefresh &&
          updatedAt > Date.now() - CACHE_VALID_DURATION;

        if (shouldUseDbCache) {
          log('<<==Defi-cache-hit==>>', userAddr);
          return;
        }
      } else {
        await Promise.all([
          defiDbService.deleteForAddress(userAddr),
          syncDbService.deleteSceneForAddress({
            address: userAddr,
            scene: DEFI_SYNC_SCENE,
          }),
        ]);
      }
    } catch (error) {
      // 忽略 db 的影响，直接走线上逻辑
      log('--Terminate-portfolio-db-cache-get', userAddr);
    }

    /**
     * 阶段二：接口快照缓存
     */
    let snapshotRes: ComplexProtocol[] = [];
    snapshotRes = await loadPortfolioSnapshot(userAddr, wallet);

    if (currentAbort.signal.aborted || !snapshotRes) {
      log('--Terminate-portfolio-snapshot-', userAddr);
      setLoading(false);
      return;
    }

    currentProtocols = snapshotRes;
    applyProtocols(snapshotRes);
    setLoading(false);

    if (currentAbort.signal.aborted) {
      log('--Terminate-portfolio-loadProjectIds-', userAddr);
      projectDict.current = null;
      setLoading(false);
      return;
    }

    if (!realtimeIds.current.length) {
      if (shouldPersistDefiCache) {
        try {
          await defiDbService.replaceAddressProtocols(
            userAddr,
            currentProtocols
          );
          await syncDbService.setUpdatedAt({
            address: userAddr,
            scene: DEFI_SYNC_SCENE,
            updatedAt: Date.now(),
          });
        } catch (error) {
          // 忽略 db 的影响，不写缓存，直走内存
          log('--Terminate-portfolio-db-cache-set', userAddr);
        }
      }

      log('--Terminate-portfolio-loadProjectIds-', userAddr);
      projectDict.current = null;
      setLoading(false);
      return;
    }

    /**
     * 阶段三：完整逐个 id刷新
     */

    const chunkIds = chunk(realtimeIds.current, chunkSize);

    let realtimeData: DisplayedProject[] = [];
    const realtimeProtocols: ComplexProtocol[] = [];

    await Promise.all(
      chunkIds.map(async (ids) => {
        if (currentAbort.signal.aborted) {
          return;
        }

        const projectListRes = await batchLoadProjects(
          userAddr,
          ids,
          wallet,
          false
        );

        const projects = projectListRes;

        if (!projects?.length || currentAbort.signal.aborted) {
          return;
        }

        realtimeProtocols.push(...projects);

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

    currentProtocols = replaceProtocols(currentProtocols, realtimeProtocols);

    if (shouldPersistDefiCache) {
      try {
        await defiDbService.replaceAddressProtocols(userAddr, currentProtocols);
        await syncDbService.setUpdatedAt({
          address: userAddr,
          scene: DEFI_SYNC_SCENE,
          updatedAt: Date.now(),
        });
      } catch (error) {
        // 忽略 db 的影响，不写缓存，直走内存
        log('--Terminate-portfolio-db-cache-set', userAddr);
      }
    }

    realtimeData = Object.values(projectDict.current)?.sort(
      (m, n) => (n.netWorth || 0) - (m.netWorth || 0)
    );
    setData(realtimeData);

    setNetWorth(realtimeData.reduce((m, n) => m + n.netWorth, 0));
    setLoading(false);

    log('portfolios-end', userAddr);
  };

  const removeProtocol = useCallback(
    (id: string) => {
      setData((pre) => pre?.filter((item) => item.id !== id));
    },
    [setData]
  );

  const forceRefresh = useCallback(() => {
    loadProcess({ forceRefresh: true });
  }, [loadProcess]);

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
    updateData: forceRefresh,
    removeProtocol,
  };
};
