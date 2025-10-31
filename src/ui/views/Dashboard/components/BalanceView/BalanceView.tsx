/* eslint "react-hooks/exhaustive-deps": ["error"] */
/* eslint-enable react-hooks/exhaustive-deps */
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  useImperativeHandle,
} from 'react';
import useCurrentBalance from '@/ui/hooks/useCurrentBalance';
import { formatUsdValue, useCommonPopupView, useWallet } from 'ui/utils';
import { KEYRING_TYPE } from 'consts';
import { SvgIconOffline } from '@/ui/assets';
import clsx from 'clsx';
import { Skeleton } from 'antd';
import { Chain } from '@debank/common';
import { ChainList } from './ChainList';
import { formChartData, useCurve } from './useCurve';
import { CurvePoint, CurveThumbnail } from './CurveView';
import ArrowNextSVG from '@/ui/assets/dashboard/arrow-next.svg';
import { ReactComponent as UpdateSVG } from '@/ui/assets/dashboard/update.svg';
import { ReactComponent as WarningSVG } from '@/ui/assets/dashboard/warning-1.svg';
import { useDebounce } from 'react-use';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { BalanceLabel } from './BalanceLabel';
import { useTranslation } from 'react-i18next';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { findChain } from '@/utils/chain';
import {
  useHomeBalanceView,
  useRefreshHomeBalanceView,
} from './useHomeBalanceView';
import { BALANCE_LOADING_CONFS } from '@/constant/timeout';
import type { Account } from '@/background/service/preference';
import { IExtractFromPromise } from '@/ui/utils/type';
import { OfflineChainNotify } from '../OfflineChainNotify';
import { RcIconArrowRightCC } from '@/ui/assets/dashboard';

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
  const [isGnosis, setIsGnosis] = useState(false);
  const [gnosisNetworks, setGnosisNetworks] = useState<Chain[]>([]);
  const [isHover, setHover] = useState(false);
  const [curvePoint, setCurvePoint] = useState<CurvePoint>();
  const [isDebounceHover, setIsDebounceHover] = useState(false);

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

  const handleIsGnosisChange = useCallback(async () => {
    if (!currentAccount) return;
    const networkIds = await wallet.getGnosisNetworkIds(currentAccount.address);
    const chains = networkIds
      .map((networkId) => {
        return findChain({
          id: Number(networkId),
        });
      })
      .filter((v) => !!v);
    setGnosisNetworks(chains as Chain[]);
  }, [currentAccount, wallet]);

  const handleHoverCurve = (data) => {
    setCurvePoint(data);
  };

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

  useEffect(() => {
    if (currentAccount) {
      setIsGnosis(currentAccount.type === KEYRING_TYPE.GnosisKeyring);
    }
  }, [currentAccount]);

  useEffect(() => {
    if (isGnosis) {
      handleIsGnosisChange();
    }
  }, [isGnosis, handleIsGnosisChange]);

  useEffect(() => {
    if (!isHover) {
      setCurvePoint(undefined);
    }
  }, [isHover]);

  // useEffect(() => {
  //   if (!balanceLoading && !curveLoading) {
  //     setIsManualRefreshing(false);
  //   }
  // }, [balanceLoading, curveLoading]);

  const onMouseMove = () => {
    setHover(true);
  };
  const onMouseLeave = () => {
    setHover(false);
    setIsDebounceHover(false);
  };

  useDebounce(
    () => {
      if (isHover) {
        setIsDebounceHover(true);
      }
    },
    300,
    [isHover]
  );

  const currentHover = isDebounceHover;

  const currentBalance = currentHover ? curvePoint?.value || balance : balance;
  const currentChangePercent = currentHover
    ? curvePoint?.changePercent || curveChartData?.changePercent
    : curveChartData?.changePercent;
  const currentIsLoss =
    currentHover && curvePoint ? curvePoint.isLoss : curveChartData?.isLoss;
  const currentChangeValue = currentHover ? curvePoint?.change : null;
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
    <div onMouseLeave={onMouseLeave} className={clsx('w-full')}>
      <div
        className="min-h-[132px] w-full cursor-pointer rounded-[8px] bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)]"
        onClick={onClickViewAssets}
      >
        <div
          className={clsx('group w-full flex items-end px-[12px] pt-[10px]')}
        >
          <div
            className={clsx(
              'text-r-neutral-title2 text-[30px] leading-[36px] font-bold max-w-full'
            )}
          >
            {shouldShowBalanceLoading ? (
              <Skeleton.Input
                active
                className="w-[200px] h-[36px] rounded block"
              />
            ) : (
              <BalanceLabel
                // isCache={balanceFromCache}
                balance={currentBalance || 0}
              />
            )}
          </div>
          <div
            className="flex flex-end items-center gap-[8px] mb-[7px] ml-[8px] min-h-[20px] cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRefresh({ isManual: true });
            }}
          >
            <div
              className={clsx(
                currentIsLoss ? 'text-r-red-default' : 'text-r-green-default',
                'text-[15px] leading-[18px] font-medium truncate',
                {
                  hidden: shouldHidePercentChange,
                }
              )}
            >
              {currentIsLoss ? '-' : '+'}
              {currentChangePercent === '0%' ? '0.00%' : currentChangePercent}
              {currentChangeValue ? (
                <span className="ml-4">({currentChangeValue})</span>
              ) : null}
            </div>
            {missingList?.length ? (
              <TooltipWithMagnetArrow
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
              </TooltipWithMagnetArrow>
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
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          className={clsx('mt-[2px]', 'relative cursor-pointer')}
        >
          {/* <img
            src={ArrowNextSVG}
            className={clsx(
              'absolute w-[20px] h-[20px] top-[8px] right-[10px]',
              !currentHover && 'opacity-80'
              // balanceFromCache
              //   ? !currentHover && 'opacity-0'
              //   : !currentHover && 'opacity-80'
            )}
          /> */}
          {!shouldShowLoading && (
            <div className={clsx('px-[12px] pointer-events-none')}>
              {!loadBalanceSuccess ? (
                <div className="flex items-center gap-[4px]">
                  <SvgIconOffline
                    viewBox="0 0 16 16"
                    className="w-[14px] h-[14px] text-r-neutral-title2"
                  />
                  <span className="text-[12px] leading-[14px] text-r-neutral-title2">
                    {t('page.dashboard.home.offline')}
                  </span>
                </div>
              ) : chainBalancesWithValue.length > 0 ? (
                <div
                  className={clsx(
                    'w-full flex items-center gap-[4px]',
                    !currentHover && 'opacity-80'
                  )}
                >
                  <ChainList
                    isGnosis={isGnosis}
                    matteredChainBalances={chainBalancesWithValue.slice(0)}
                    gnosisNetworks={gnosisNetworks}
                  />
                  <RcIconArrowRightCC
                    viewBox="0 0 14 14"
                    className="ml-auto w-[18px] h-[18px] text-r-neutral-title2 opacity-50"
                  />
                </div>
              ) : (
                <div
                  className={clsx(
                    'text-[12px] leading-[14px] text-r-neutral-title-2',
                    !currentHover && 'opacity-70'
                  )}
                >
                  {t('page.dashboard.assets.noAssets')}
                </div>
              )}
            </div>
          )}
          <div className={clsx('h-[66px] w-full relative')}>
            {!!shouldRenderCurve && !!curveChartData && (
              <CurveThumbnail
                isHover={currentHover}
                data={curveChartData}
                showAppChainTips={showAppChainTips}
                onHover={handleHoverCurve}
              />
            )}
            {!!shouldShowLoading && (
              <div className="flex">
                <Skeleton.Input
                  active
                  className="mx-auto mt-[4px] w-[344px] h-[66px] rounded block"
                />
              </div>
            )}
          </div>
        </div>
      </div>
      <OfflineChainNotify />
    </div>
  );
};
