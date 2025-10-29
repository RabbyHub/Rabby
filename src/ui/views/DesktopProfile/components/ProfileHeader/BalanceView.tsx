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
import { CurveThumbnail } from './CurveThumbnail';
import { CurveModal } from './CurveModal';

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
}> = ({ balance, evmBalance, curveChartData, isLoading }) => {
  const { t } = useTranslation();

  const [isShowCurveModal, setIsShowCurveModal] = useState(false);
  const shouldRenderCurve = !isLoading && !!curveChartData;

  const shouldHidePercentChange =
    !curveChartData?.changePercent ||
    isLoading ||
    !curveChartData?.startUsdValue;

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
                {isLoading ? (
                  <Skeleton.Input
                    active
                    className="w-[200px] h-[53px] rounded block"
                  />
                ) : (
                  <div>${splitNumberByStep((balance || 0).toFixed(2))}</div>
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
                    curveChartData?.isLoss
                      ? 'text-r-red-default'
                      : 'text-r-green-default',
                    'text-[20px] leading-[24px] font-medium',
                    {
                      hidden: shouldHidePercentChange,
                    }
                  )}
                >
                  {curveChartData?.isLoss ? '-' : '+'}
                  <span>
                    {curveChartData?.changePercent === '0%'
                      ? '0.00%'
                      : curveChartData?.changePercent}
                  </span>
                  {curveChartData?.change ? (
                    <span>({curveChartData.change})</span>
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
