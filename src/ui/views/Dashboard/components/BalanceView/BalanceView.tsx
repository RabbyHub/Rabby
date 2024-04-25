/* eslint "react-hooks/exhaustive-deps": ["error"] */
/* eslint-enable react-hooks/exhaustive-deps */
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import useCurrentBalance from '@/ui/hooks/useCurrentBalance';
import { sleep, useCommonPopupView, useWallet } from 'ui/utils';
import { CHAINS, EVENTS, KEYRING_TYPE } from 'consts';
import { SvgIconOffline } from '@/ui/assets';
import clsx from 'clsx';
import { Skeleton } from 'antd';
import { Chain } from '@debank/common';
import { ChainList } from './ChainList';
import { useCurve } from './useCurve';
import { CurvePoint, CurveThumbnail } from './CurveView';
import ArrowNextSVG from '@/ui/assets/dashboard/arrow-next.svg';
import { ReactComponent as UpdateSVG } from '@/ui/assets/dashboard/update.svg';
import { ReactComponent as WarningSVG } from '@/ui/assets/dashboard/warning-1.svg';
import { useDebounce, useInterval, usePrevious } from 'react-use';
import { useRabbySelector } from '@/ui/store';
import { BalanceLabel } from './BalanceLabel';
import { useTranslation } from 'react-i18next';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { findChain } from '@/utils/chain';
import { useShouldHomeBalanceShowLoading } from '@/ui/hooks/useBalanceChange';
import eventBus from '@/eventBus';

const BalanceView = ({ currentAccount, accountBalanceUpdateNonce = 0 }) => {
  const { t } = useTranslation();
  const isShowTestnet = useRabbySelector(
    (state) => state.preference.isShowTestnet
  );
  const {
    balance,
    matteredChainBalances,
    success: loadBalanceSuccess,
    balanceLoading,
    balanceFromCache,
    refreshBalance,
    hasValueChainBalances,
    missingList,
  } = useCurrentBalance(
    currentAccount?.address,
    true,
    false,
    accountBalanceUpdateNonce
  );
  const {
    result: curveData,
    refresh: refreshCurve,
    isLoading: curveLoading,
  } = useCurve(currentAccount?.address, accountBalanceUpdateNonce, balance);
  const wallet = useWallet();
  const [isGnosis, setIsGnosis] = useState(false);
  const [gnosisNetworks, setGnosisNetworks] = useState<Chain[]>([]);
  const [isHover, setHover] = useState(false);
  const [curvePoint, setCurvePoint] = useState<CurvePoint>();
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [isDebounceHover, setIsDebounceHover] = useState(false);

  const {
    checkExpirationInterval,
    checkIfHomeBalanceExpired,
    refreshHomeBalanceExpiration,
  } = useShouldHomeBalanceShowLoading();

  const onRefresh = useCallback(
    async (isManual = true) => {
      isManual && setIsManualRefreshing(true);
      try {
        await Promise.all([refreshBalance(), refreshCurve()]);
        if (!isManual) await sleep(1000);
      } catch (e) {
        console.error(e);
      } finally {
        setIsManualRefreshing(false);
        refreshHomeBalanceExpiration();
      }
    },
    [refreshBalance, refreshCurve, refreshHomeBalanceExpiration]
  );

  useEffect(() => {
    if (checkIfHomeBalanceExpired()) {
      onRefresh(false);
    }

    const handler = async () => {
      console.log('[feat] now TX_COMPLETED');
      if (checkIfHomeBalanceExpired()) {
        onRefresh(false);
      }
    };
    eventBus.addEventListener(EVENTS.TX_COMPLETED, handler);

    return () => {
      eventBus.removeEventListener(EVENTS.TX_COMPLETED, handler);
    };
  }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  useInterval(() => {
    if (checkIfHomeBalanceExpired()) {
      onRefresh(false);
    }
  }, checkExpirationInterval);

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
        matteredChainBalances: hasValueChainBalances,
        balance,
        balanceLoading,
        isEmptyAssets: !matteredChainBalances.length,
        isOffline: !loadBalanceSuccess,
      });
    }
  }, [
    matteredChainBalances,
    balance,
    balanceLoading,
    componentName,
    hasValueChainBalances,
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

  useEffect(() => {
    if (!balanceLoading && !curveLoading) {
      setIsManualRefreshing(false);
    }
  }, [balanceLoading, curveLoading]);

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
    ? curvePoint?.changePercent || curveData?.changePercent
    : curveData?.changePercent;
  const currentIsLoss =
    currentHover && curvePoint ? curvePoint.isLoss : curveData?.isLoss;
  const currentChangeValue = currentHover ? curvePoint?.change : null;
  const { hiddenBalance } = useRabbySelector((state) => state.preference);

  const shouldHidePercentChange = !currentChangePercent || hiddenBalance;
  const shouldRefreshButtonShow =
    isManualRefreshing || balanceLoading || curveLoading;

  const prevAddress = usePrevious(currentAccount?.address);
  const loadedBalanceForThisAddress =
    prevAddress === currentAccount?.address ? balance : null;

  const couldShowLoadingDueToBalanceNil =
    currentBalance === null || (balanceFromCache && currentBalance === 0);
  const couldShowLoadingDueToUpdateSource =
    !loadedBalanceForThisAddress || isManualRefreshing;
  const shouldBalanceShowLoading =
    couldShowLoadingDueToBalanceNil ||
    (couldShowLoadingDueToUpdateSource && balanceLoading);

  const prevCurveData = usePrevious(curveData);

  const curveRenderInfo = {
    curveDataToRender: (loadBalanceSuccess ? curveData : prevCurveData) || null,
    shouldShowCurveLoading:
      couldShowLoadingDueToBalanceNil ||
      (couldShowLoadingDueToUpdateSource && curveLoading),
    shouldRenderCurve: false,
  };
  curveRenderInfo.shouldRenderCurve =
    !isManualRefreshing &&
    !curveLoading &&
    !hiddenBalance &&
    !!curveRenderInfo.curveDataToRender;

  return (
    <div onMouseLeave={onMouseLeave} className={clsx('assets flex')}>
      <div className="left relative overflow-x-hidden mx-10">
        <div className={clsx('amount group', 'text-32 mt-6')}>
          <div className={clsx('amount-number leading-[38px]')}>
            {shouldBalanceShowLoading ? (
              <Skeleton.Input active className="w-[200px] h-[38px] rounded" />
            ) : (
              <BalanceLabel
                isCache={balanceFromCache}
                balance={currentBalance}
              />
            )}
          </div>
          <div
            onClick={onRefresh}
            className={clsx(
              currentIsLoss ? 'text-[#FF6E6E]' : 'text-[#33CE43]',
              'text-15 font-normal mb-[5px]',
              {
                hidden: shouldHidePercentChange,
              }
            )}
          >
            {currentIsLoss ? '-' : '+'}
            <span>
              {currentChangePercent === '0%' ? '0.00%' : currentChangePercent}
            </span>
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
              <div className={clsx('mb-[6px]')}>
                <WarningSVG />
              </div>
            </TooltipWithMagnetArrow>
          ) : null}
          <div
            onClick={onRefresh}
            className={clsx('mb-[5px]', {
              'block animate-spin': shouldRefreshButtonShow,
              hidden: !shouldRefreshButtonShow,
              'group-hover:block': !hiddenBalance,
            })}
          >
            <UpdateSVG />
          </div>
        </div>
        <div
          onClick={onClickViewAssets}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          className={clsx(
            'mt-[4px] mb-10',
            currentHover && 'bg-[#000] bg-opacity-10',
            'rounded-[4px] relative cursor-pointer',
            'overflow-hidden'
          )}
        >
          <img
            src={ArrowNextSVG}
            className={clsx(
              'absolute w-[20px] h-[20px] top-[8px] right-[10px]',
              shouldBalanceShowLoading
                ? !currentHover && 'opacity-0'
                : !currentHover && 'opacity-80'
            )}
          />
          <div
            className={clsx(
              'extra flex h-[28px]',
              'mx-[10px] pt-[8px] mb-[8px]'
            )}
          >
            {shouldBalanceShowLoading ? (
              <>
                <Skeleton.Input active className="w-[130px] h-[20px] rounded" />
              </>
            ) : !loadBalanceSuccess ? (
              <>
                <SvgIconOffline className="mr-4 text-white" />
                <span className="leading-tight">
                  {t('page.dashboard.home.offline')}
                </span>
              </>
            ) : hasValueChainBalances.length > 0 ? (
              <div
                className={clsx(
                  'flex space-x-4',
                  !currentHover && 'opacity-80'
                )}
              >
                <ChainList
                  isGnosis={isGnosis}
                  matteredChainBalances={hasValueChainBalances}
                  gnosisNetworks={gnosisNetworks}
                />
              </div>
            ) : (
              <span
                className={clsx(
                  'text-14 text-r-neutral-title-2',
                  !currentHover && 'opacity-70'
                )}
              >
                {t('page.dashboard.assets.noAssets')}
              </span>
            )}
          </div>
          <div className={clsx('h-[80px] w-full relative')}>
            {!!curveRenderInfo.shouldRenderCurve &&
              curveRenderInfo.curveDataToRender && (
                <CurveThumbnail
                  isHover={currentHover}
                  data={curveRenderInfo.curveDataToRender}
                  onHover={handleHoverCurve}
                />
              )}
            {!!curveRenderInfo.shouldShowCurveLoading && (
              <div className="flex mt-[14px]">
                <Skeleton.Input
                  active
                  className="m-auto w-[360px] h-[72px] rounded"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BalanceView;
