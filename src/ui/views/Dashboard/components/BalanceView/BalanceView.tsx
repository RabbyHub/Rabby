/* eslint "react-hooks/exhaustive-deps": ["error"] */
/* eslint-enable react-hooks/exhaustive-deps */
import type { Account } from '@/background/service/preference';
import { BALANCE_LOADING_CONFS } from '@/constant/timeout';
import { SvgIconOffline } from '@/ui/assets';
import ArrowNextSVG from '@/ui/assets/dashboard/arrow-next.svg';
import { ReactComponent as UpdateSVG } from '@/ui/assets/dashboard/update.svg';
import { ReactComponent as WarningSVG } from '@/ui/assets/dashboard/warning-1.svg';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import useCurrentBalance from '@/ui/hooks/useCurrentBalance';
import { useRabbySelector } from '@/ui/store';
import { IExtractFromPromise } from '@/ui/utils/type';
import { findChain } from '@/utils/chain';
import { Chain } from '@debank/common';
import { useRequest } from 'ahooks';
import { Skeleton, Tooltip } from 'antd';
import clsx from 'clsx';
import { KEYRING_TYPE } from 'consts';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useCommonPopupView, useWallet } from 'ui/utils';
import { OfflineChainNotify } from '../OfflineChainNotify';
import { BalanceLabel } from './BalanceLabel';
import { ChainList } from './ChainList';
import { formChartData, useCurve } from './useCurve';
import {
  useHomeBalanceView,
  useRefreshHomeBalanceView,
} from './useHomeBalanceView';

const Container = styled.div`
  .balance-view-content {
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);

    padding: 16px 8px 16px 16px;
    cursor: pointer;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
    }
  }
`;

export const BalanceView = ({
  currentAccount,
}: {
  currentAccount?: Account | null;
}) => {
  const { t } = useTranslation();

  const { currentHomeBalanceCache } = useHomeBalanceView(
    currentAccount?.address
  );

  const initHasCacheRef = useRef(!!currentHomeBalanceCache?.balance);
  const [accountBalanceUpdateNonce, setAccountBalanceUpdateNonce] = useState(
    initHasCacheRef?.current ? -1 : 0
  );

  useEffect(() => {
    if (!initHasCacheRef?.current) return;
    const timer = setTimeout(() => {
      setAccountBalanceUpdateNonce((prev) => prev + 1);
    }, BALANCE_LOADING_CONFS.TIMEOUT);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const {
    balance: latestBalance,
    evmBalance: latestEvmBalance,
    matteredChainBalances: latestMatteredChainBalances,
    chainBalancesWithValue: latestChainBalancesWithValue,
    success: loadBalanceSuccess,
    balanceLoading,
    balanceFromCache,
    isCurrentBalanceExpired,
    refreshBalance,
    missingList,
  } = useCurrentBalance(currentAccount?.address, {
    update: true,
    noNeedBalance: false,
    nonce: accountBalanceUpdateNonce,
    initBalanceFromLocalCache: !!currentHomeBalanceCache?.balance,
  });

  const {
    curveData: latestCurveData,
    curveChartData: latestCurveChartData,
    refresh: refreshCurve,
    isCurveCollectionExpired,
    isLoading: curveLoading,
  } = useCurve(currentAccount?.address, {
    nonce: accountBalanceUpdateNonce,
    realtimeNetWorth: latestEvmBalance,
    initData: currentHomeBalanceCache?.originalCurveData,
  });
  const wallet = useWallet();

  const {
    balance,
    evmBalance,
    curveChartData,
    matteredChainBalances,
    chainBalancesWithValue,
  } = useMemo(() => {
    const balanceValue = latestBalance || currentHomeBalanceCache?.balance;
    const evmBalanceValue =
      latestEvmBalance || currentHomeBalanceCache?.evmBalance;
    return {
      balance: balanceValue,
      evmBalance: evmBalanceValue,
      curveChartData:
        latestCurveChartData ||
        formChartData(
          currentHomeBalanceCache?.originalCurveData || [],
          balanceValue,
          Date.now()
        ),
      matteredChainBalances: latestMatteredChainBalances.length
        ? latestMatteredChainBalances
        : currentHomeBalanceCache?.matteredChainBalances || [],
      chainBalancesWithValue: latestChainBalancesWithValue.length
        ? latestChainBalancesWithValue
        : currentHomeBalanceCache?.chainBalancesWithValue || [],
    };
  }, [
    latestBalance,
    latestEvmBalance,
    latestMatteredChainBalances,
    latestChainBalancesWithValue,
    latestCurveChartData,
    currentHomeBalanceCache,
  ]);

  const getCacheExpired = useCallback(async () => {
    const res = {
      balanceExpired: await isCurrentBalanceExpired(),
      curveExpired: await isCurveCollectionExpired(),
      expired: false,
    };
    res.expired = res.balanceExpired || res.curveExpired;

    return res;
  }, [isCurrentBalanceExpired, isCurveCollectionExpired]);

  const { isManualRefreshing, onRefresh } = useRefreshHomeBalanceView({
    currentAddress: currentAccount?.address,
    refreshBalance,
    refreshCurve,
    isExpired: getCacheExpired,
  });

  // const refreshTimerlegacy = useRef<NodeJS.Timeout>();
  // only execute once on component mounted or address changed
  useEffect(
    () => {
      (async () => {
        let expirationInfo: IExtractFromPromise<
          ReturnType<typeof getCacheExpired>
        > | null = null;
        if (!currentHomeBalanceCache?.balance) {
          onRefresh({
            balanceExpired: true,
            curveExpired: true,
            isManual: false,
          });
        } else if (
          (expirationInfo = await getCacheExpired()) &&
          expirationInfo.expired
        ) {
          onRefresh({
            balanceExpired: expirationInfo.balanceExpired,
            curveExpired: expirationInfo.curveExpired,
            isManual: false,
          });
        }
      })();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const { data: gnosisNetworks = [] } = useRequest(
    async () => {
      if (currentAccount?.type !== KEYRING_TYPE.GnosisKeyring) {
        return [];
      }
      const networkIds = await wallet.getGnosisNetworkIds(
        currentAccount.address
      );
      const chains = networkIds
        .map((networkId) => {
          return findChain({
            id: Number(networkId),
          });
        })
        .filter((v) => !!v);
      return chains as Chain[];
    },
    {
      refreshDeps: [currentAccount?.address, currentAccount?.type],
    }
  );

  const { activePopup, setData, componentName } = useCommonPopupView();
  const onClickViewAssets = () => {
    activePopup('AssetList');
  };

  useEffect(() => {
    if (componentName === 'AssetList') {
      setData({
        matteredChainBalances: chainBalancesWithValue,
        balance,
        balanceLoading,
        isEmptyAssets: !matteredChainBalances.length,
        isOffline: !loadBalanceSuccess,
      });
    }
  }, [
    chainBalancesWithValue,
    matteredChainBalances.length,
    balance,
    balanceLoading,
    componentName,
    setData,
    loadBalanceSuccess,
  ]);

  const isGnosis = useMemo(() => {
    return currentAccount?.type === KEYRING_TYPE.GnosisKeyring;
  }, [currentAccount]);

  const currentBalance = balance;
  const currentChangePercent = curveChartData?.changePercent;
  const currentIsLoss = curveChartData?.isLoss;
  const currentChangeValue = null;
  const { hiddenBalance } = useRabbySelector((state) => state.preference);

  const shouldShowRefreshButton =
    isManualRefreshing || balanceLoading || curveLoading;

  const couldShowLoadingDueToBalanceNil =
    currentBalance === null || (balanceFromCache && currentBalance === 0);
  // const couldShowLoadingDueToUpdateSource = !balanceFromCache || isManualRefreshing;
  const couldShowLoadingDueToUpdateSource =
    !currentHomeBalanceCache?.balance || isManualRefreshing;

  const shouldShowBalanceLoading =
    couldShowLoadingDueToBalanceNil ||
    (couldShowLoadingDueToUpdateSource && balanceLoading);
  const shouldShowCurveLoading =
    couldShowLoadingDueToBalanceNil ||
    (couldShowLoadingDueToUpdateSource && curveLoading);
  const shouldShowLoading = shouldShowBalanceLoading || shouldShowCurveLoading;
  const shouldHidePercentChange =
    !currentChangePercent ||
    hiddenBalance ||
    shouldShowLoading ||
    !curveChartData?.startUsdValue;

  return (
    <Container>
      <div
        className="balance-view-content relative"
        onClick={onClickViewAssets}
      >
        <div>
          <div className={clsx('group w-[100%] flex gap-[8px] items-end')}>
            <div
              className={clsx(
                'text-[32px] leading-[38px] font-bold text-r-neutral-title2  max-w-full'
              )}
            >
              {shouldShowBalanceLoading ? (
                <Skeleton.Input active className="w-[200px] h-[38px] rounded" />
              ) : (
                <BalanceLabel
                  // isCache={balanceFromCache}
                  balance={currentBalance || 0}
                />
              )}
            </div>
            <div
              className="flex flex-end items-center gap-[8px] mb-[7px] min-h-[20px] cursor-pointer relative"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRefresh({ isManual: true });
              }}
            >
              <div
                className={clsx(
                  currentIsLoss ? 'text-[#FF6E6E]' : 'text-[#33CE43]',
                  'text-15 font-normal',
                  {
                    hidden: shouldHidePercentChange,
                  }
                )}
              >
                {currentIsLoss ? '-' : '+'}
                <span>
                  {currentChangePercent === '0%'
                    ? '0.00%'
                    : currentChangePercent}
                </span>
                {currentChangeValue ? (
                  <span className="ml-4">({currentChangeValue})</span>
                ) : null}
              </div>
              {missingList?.length ? (
                <Tooltip
                  overlayClassName="rectangle font-normal whitespace-pre-wrap"
                  title={t('page.dashboard.home.missingDataTooltip', {
                    text:
                      missingList.join(t('page.dashboard.home.chain')) +
                      t('page.dashboard.home.chainEnd'),
                  })}
                >
                  <div onClick={(evt) => evt.stopPropagation()}>
                    <WarningSVG />
                  </div>
                </Tooltip>
              ) : null}
              <div
                className={clsx({
                  'block animate-spin': shouldShowRefreshButton,
                  hidden: !shouldShowRefreshButton,
                  'group-hover:block': !hiddenBalance,
                })}
              >
                <UpdateSVG />
              </div>
            </div>
          </div>
          <div
            // onClick={onClickViewAssets}
            className={clsx('relative cursor-pointer overflow-hidden mt-[8px]')}
          >
            <div className={clsx('flex')}>
              {shouldShowLoading ? (
                <>
                  <Skeleton.Input
                    active
                    className="w-[130px] h-[20px] rounded"
                  />
                </>
              ) : !loadBalanceSuccess ? (
                <>
                  <SvgIconOffline className="mr-4 text-white" />
                  <span className="leading-tight">
                    {t('page.dashboard.home.offline')}
                  </span>
                </>
              ) : chainBalancesWithValue.length > 0 ? (
                <div
                  className={clsx(
                    'flex items-center gap-[4px] w-full opacity-50'
                  )}
                >
                  <ChainList
                    isGnosis={isGnosis}
                    matteredChainBalances={chainBalancesWithValue.slice(0)}
                    gnosisNetworks={gnosisNetworks}
                  />
                  <div className="ml-auto">
                    <img
                      src={ArrowNextSVG}
                      className={clsx('w-[20px] h-[20px]')}
                    />
                  </div>
                </div>
              ) : (
                <span
                  className={clsx(
                    'text-14 text-r-neutral-title-2',
                    'opacity-70'
                  )}
                >
                  {t('page.dashboard.assets.noAssets')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      <OfflineChainNotify />
    </Container>
  );
};
