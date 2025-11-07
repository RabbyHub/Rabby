import { Modal } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { useDebounce } from 'react-use';
import styled, { createGlobalStyle } from 'styled-components';
import { CurveThumbnail } from './CurveThumbnail';
import clsx from 'clsx';
import { splitNumberByStep } from '@/ui/utils';
import dayjs from 'dayjs';
import { ReactComponent as RcIconInfoCC } from '@/ui/assets/tips-cc.svg';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';
export type CurvePoint = {
  value: number;
  netWorth: string;
  change: string;
  isLoss: boolean;
  changePercent: string;
  timestamp: number;
};

type Curve = {
  list: CurvePoint[];
  netWorth: string;
  change: string;
  changePercent: string;
  isLoss: boolean;
  isEmptyAssets: boolean;
};

const CurveWrapper = styled.div`
  width: 100%;
  height: 100%;
  z-index: 1;
`;

const GlobalStyle = createGlobalStyle`
  .global-curve-modal {
    padding-bottom: 0;

    .ant-modal-content {
      border-radius: 8px;
      border: 2px solid var(--r-neutral-line, #E0E5EC);
      background: var(--r-neutral-bg2, #F2F4F7);
    }

    .ant-modal-body {
      padding: 20px 20px 16px 20px;
    }
  }
`;

export const CurveModal: React.FC<{
  className?: string;
  curveChartData?: Curve;
  balance?: number | null;
  evmBalance?: number | null;
  visible?: boolean;
  onClose?(): void;
}> = ({ curveChartData, balance, evmBalance, onClose, visible }) => {
  const [isHover, setHover] = useState(false);
  const [curvePoint, setCurvePoint] = useState<CurvePoint>();
  const [isDebounceHover, setIsDebounceHover] = useState(false);
  const { t } = useTranslation();

  const handleHoverCurve = (data) => {
    setCurvePoint(data);
  };

  useEffect(() => {
    if (!isHover) {
      setCurvePoint(undefined);
    }
  }, [isHover]);

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
  const currentChangeValue = currentHover
    ? curvePoint?.change
    : curveChartData?.change;

  const [startTime, endTime] = useMemo(() => {
    return curveChartData?.list?.length
      ? [
          dayjs.unix(curveChartData.list[0].timestamp).format('MM-DD HH:mm'),
          dayjs
            .unix(curveChartData.list[curveChartData.list.length - 1].timestamp)
            .format('MM-DD HH:mm'),
        ]
      : [];
  }, [curveChartData]);

  const showAppChainTips = useMemo(() => {
    return evmBalance !== balance;
  }, [evmBalance, balance]);

  return (
    <>
      <GlobalStyle />
      <Modal
        className="global-curve-modal"
        width={704}
        visible={visible}
        footer={null}
        centered
        closable={false}
        onCancel={onClose}
      >
        <div onMouseLeave={onMouseLeave} onMouseMove={onMouseMove}>
          <div className="flex items-center justify-between">
            <div className="text-r-neutral-foot text-[13px] leading-[16px] mb-[8px]">
              {curvePoint
                ? dayjs.unix(curvePoint.timestamp).format('MM/DD HH:mm')
                : t('page.desktopProfile.CurveModal.netWorth')}
            </div>
            <RcIconCloseCC
              className="w-[20px] h-[20px] cursor-pointer text-r-neutral-foot"
              onClick={onClose}
            />
          </div>
          <div className="text-r-neutral-title1 text-[32px] leading-[38px] font-bold mb-[6px]">
            ${splitNumberByStep((currentBalance || 0).toFixed(2))}
          </div>
          {currentChangePercent ? (
            <div
              className={clsx(
                currentIsLoss ? 'text-r-red-default' : 'text-r-green-default',
                'text-[13px] leading-[16px] font-medium'
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
          ) : null}
          <div className="h-[200px] relative">
            <CurveThumbnail
              isHover={currentHover}
              data={curveChartData}
              showAppChainTips={showAppChainTips}
              width={664}
              height={200}
              onHover={handleHoverCurve}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="text-r-neutral-foot text-[12px] leading-[14px]">
              {startTime}
            </div>
            {showAppChainTips ? (
              <div className="flex items-center">
                <div className="text-r-neutral-title1 mr-[2px]">
                  <RcIconInfoCC width={12} height={12} />
                </div>
                <div className="text-r-neutral-title1 text-[12px] leading-[14px] whitespace-nowrap">
                  {t('page.desktopProfile.CurveModal.appChainTips')}
                </div>
              </div>
            ) : null}
            <div className="text-r-neutral-foot text-[12px] leading-[14px]">
              {endTime}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};
