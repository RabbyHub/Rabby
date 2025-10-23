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
import { BalanceLabel } from '@/ui/views/Dashboard/components/BalanceView/BalanceLabel';
import {
  formChartData,
  useCurve,
} from '@/ui/views/Dashboard/components/BalanceView/useCurve';
import {
  useHomeBalanceView,
  useRefreshHomeBalanceView,
} from '@/ui/views/Dashboard/components/BalanceView/useHomeBalanceView';
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
import {
  openInTab,
  splitNumberByStep,
  useCommonPopupView,
  useWallet,
} from 'ui/utils';
import { CurveThumbnail } from './CurveThumbnail';
import { CurveModal } from './CurveModal';

const Container = styled.div`
  margin-bottom: 24px;
  .balance-view-content {
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);

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

  const [isShowCurveModal, setIsShowCurveModal] = useState(false);

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

  const currentBalance = balance;
  const currentChangePercent = curveChartData?.changePercent;
  const currentIsLoss = curveChartData?.isLoss;
  const currentChangeValue = curveChartData.change;
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

  const shouldRenderCurve =
    !shouldShowLoading && !hiddenBalance && !!curveChartData;

  const showAppChainTips = useMemo(() => {
    return evmBalance !== balance;
  }, [evmBalance, balance]);

  return (
    <>
      <Container>
        <div className="balance-view-content relative">
          <div>
            <div className={clsx('group w-[100%] flex gap-[8px] items-end')}>
              <div
                className={clsx(
                  'text-[44px] leading-[53px] font-bold text-r-neutral-title1 max-w-full'
                )}
              >
                {shouldShowBalanceLoading ? (
                  <Skeleton.Input
                    active
                    className="w-[200px] h-[53px] rounded block"
                  />
                ) : (
                  <div>
                    ${splitNumberByStep((currentBalance || 0).toFixed(2))}
                  </div>
                )}
              </div>
              <div
                className="flex flex-end items-center gap-[8px] mb-[7px] min-h-[20px] cursor-pointer relative"
                onClick={(e) => {
                  // e.preventDefault();
                  // e.stopPropagation();
                  // onRefresh({ isManual: true });
                }}
              >
                <div
                  className={clsx(
                    currentIsLoss
                      ? 'text-r-red-default'
                      : 'text-r-green-default',
                    'text-[20px] leading-[24px] font-medium',
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
                    <span>({currentChangeValue})</span>
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
              </div>
            </div>
          </div>
          <div
            className={clsx('w-[400px] h-[100px] absolute top-[-30px] right-0')}
          >
            {!!shouldRenderCurve && !!curveChartData && (
              <div onClick={() => setIsShowCurveModal(true)}>
                <CurveThumbnail
                  // isHover={currentHover}
                  data={curveChartData}
                  showAppChainTips={showAppChainTips}
                  width={400}
                  height={100}
                  // onHover={handleHoverCurve}
                />
              </div>
            )}
            {!!shouldShowLoading && (
              <div className="flex mt-[14px]">
                <Skeleton.Input
                  active
                  className="m-auto w-[400px] h-[80px] rounded block"
                />
              </div>
            )}
          </div>
        </div>
      </Container>
      <CurveModal
        curveChartData={curveChartData}
        balance={balance}
        evmBalance={evmBalance}
        visible={isShowCurveModal}
        onClose={() => {
          setIsShowCurveModal(false);
        }}
      />
    </>
  );
};
