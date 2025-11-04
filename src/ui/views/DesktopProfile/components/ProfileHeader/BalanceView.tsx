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
  CurveChartData,
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
import { CurvePoint, CurveThumbnail } from './CurveThumbnail';
import { CurveModal } from './CurveModal';
import { useDebounce } from 'react-use';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';

const Container = styled.div`
  margin-bottom: 24px;
  .balance-view-content {
  }
`;

export const BalanceView: React.FC<{
  balance?: number | null;
  evmBalance?: number | null;
  curveChartData?: CurveChartData;
  isLoading?: boolean;
  isManualRefreshing?: boolean;
  balanceLoading?: boolean;
  curveLoading?: boolean;
  balanceFromCache?: boolean;
}> = ({
  balance,
  evmBalance,
  curveChartData,
  isLoading,
  isManualRefreshing,
  balanceLoading,
  curveLoading,
  balanceFromCache,
}) => {
  const { t } = useTranslation();
  const [isHover, setHover] = useState(false);
  const [curvePoint, setCurvePoint] = useState<CurvePoint>();
  const [isDebounceHover, setIsDebounceHover] = useState(false);
  const currentAccount = useCurrentAccount();

  const { currentHomeBalanceCache } = useHomeBalanceView(
    currentAccount?.address
  );

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
    !shouldShowLoading && !hiddenBalance && !!curveChartData && !isLoading;

  const showAppChainTips = useMemo(() => {
    return evmBalance !== balance;
  }, [evmBalance, balance]);

  const handleHoverCurve = (data) => {
    setCurvePoint(data);
    console.log('hover', data);
  };

  return (
    <>
      <Container onMouseLeave={onMouseLeave}>
        <div className="balance-view-content relative">
          <div>
            <div className={clsx('group w-[100%] flex gap-[8px] items-end')}>
              <div
                className={clsx(
                  'text-[44px] leading-[53px] font-bold text-r-neutral-title1 max-w-full'
                )}
              >
                {isLoading ? (
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
                className="flex flex-end items-center gap-[8px] mb-[7px] min-h-[20px] relative"
                onClick={(e) => {
                  // e.preventDefault();
                  // e.stopPropagation();
                  // onRefresh({ isManual: true });
                }}
              >
                <div
                  className={clsx(
                    currentIsLoss
                      ? 'text-rb-red-default'
                      : 'text-rb-green-default',
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
                      : curveChartData?.changePercent}
                  </span>
                  {currentChangeValue ? (
                    <span>({currentChangeValue})</span>
                  ) : null}
                </div>
                {/* {missingList?.length ? (
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
                ) : null} */}
              </div>
            </div>
          </div>
          <div
            className={clsx('w-[400px] h-[100px] absolute top-[-30px] right-0')}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
          >
            {!!shouldRenderCurve && !!curveChartData && (
              <CurveThumbnail
                isHover={currentHover}
                data={curveChartData}
                showAppChainTips={showAppChainTips}
                onHover={handleHoverCurve}
                width={400}
                height={100}
              />
            )}
            {!!isLoading && (
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
    </>
  );
};
