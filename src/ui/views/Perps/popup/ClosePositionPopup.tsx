import React, { useMemo } from 'react';
import { Button, Tooltip } from 'antd';
import Popup, { PopupProps } from '@/ui/component/Popup';
import { useTranslation } from 'react-i18next';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import clsx from 'clsx';
import { ReactComponent as RcIconInfo } from 'ui/assets/info-cc.svg';
import { useMemoizedFn } from 'ahooks';
import { formatPercent } from '../utils';
import { PERPS_MINI_USD_VALUE } from '../constants';
import { PerpsSlider } from '../components/PerpsSlider';

const PERPS_EXCHANGE_FEE_NUMBER = 0.0004;

interface ClosePositionPopupProps extends Omit<PopupProps, 'onCancel'> {
  visible: boolean;
  coin: string;
  direction: 'Long' | 'Short';
  positionSize: string;
  marginUsed: number;
  markPrice: number;
  entryPrice: number;
  providerFee: number;
  pnl: number;
  onCancel: () => void;
  onConfirm: () => void;
  handleClosePosition: (closePercent: number) => Promise<void>;
}

export const ClosePositionPopup: React.FC<ClosePositionPopupProps> = ({
  visible,
  coin,
  direction,
  positionSize,
  marginUsed,
  markPrice,
  entryPrice,
  providerFee,
  pnl,
  onCancel,
  onConfirm,
  handleClosePosition,
  ...rest
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [closePercent, setClosePercent] = React.useState<number>(100);

  const closePosition = useMemoizedFn(async () => {
    setLoading(true);
    try {
      await handleClosePosition(closePercent);
      onConfirm();
    } finally {
      setLoading(false);
    }
  });

  const minClosePercent = useMemo(() => {
    const minSizeValue = PERPS_MINI_USD_VALUE / markPrice;
    const percentValue = (minSizeValue / Number(positionSize)) * 100;

    // add one percent to avoid rounding error
    return Math.min(100, Math.round(percentValue + 1));
  }, [markPrice, positionSize]);

  React.useEffect(() => {
    if (!visible) {
      setLoading(false);
      setClosePercent(100);
    }
  }, [visible]);

  const closedPnl = useMemo(() => {
    return (pnl * closePercent) / 100;
  }, [pnl, closePercent]);

  const bothFee = useMemo(() => {
    return providerFee + PERPS_EXCHANGE_FEE_NUMBER;
  }, [providerFee]);

  const isValidClosePercent = useMemo(() => {
    if (loading) {
      return true;
    }

    return closePercent >= minClosePercent;
  }, [closePercent, minClosePercent, loading]);

  return (
    <Popup
      placement="bottom"
      height={420}
      isSupportDarkMode
      bodyStyle={{ padding: 0 }}
      destroyOnClose
      push={false}
      closable
      visible={visible}
      onCancel={onCancel}
      {...rest}
    >
      <div className="flex flex-col h-full bg-r-neutral-bg2 rounded-t-[16px]">
        <div className="text-20 font-medium text-r-neutral-title-1 text-center pt-16 pb-20 leading-[24px]">
          {t('page.perpsDetail.PerpsClosePositionPopup.title')}
        </div>

        <div className="flex-1 px-20 overflow-y-auto">
          {/* Amount Section */}
          <div className="bg-r-neutral-card1 border border-rabby-neutral-line rounded-[20px] py-16 px-20 mb-12">
            <div className="flex justify-between items-center mb-4">
              <div className="text-20 font-bold text-r-blue-default leading-[24px]">
                {t('page.perpsDetail.PerpsClosePositionPopup.amount')}
              </div>
            </div>
            <div className="flex justify-between items-center h-[40px]">
              <div className="flex items-center gap-4">
                <span className="text-20 font-bold text-r-neutral-back leading-[24px]">
                  ${splitNumberByStep(marginUsed.toFixed(2))}
                </span>
                <span className="text-15 font-medium text-r-neutral-foot leading-[22px]">
                  {t('page.perpsDetail.PerpsClosePositionPopup.total')}
                </span>
              </div>
              <span
                style={{ fontSize: '36px' }}
                className="font-bold text-r-blue-default"
              >
                {closePercent}%
              </span>
            </div>
            <div className="mb-8 h-[14px]">
              {!isValidClosePercent && (
                <span className="text-14 font-medium text-r-red-default">
                  {t(
                    'page.perpsDetail.PerpsClosePositionPopup.minimumWarning',
                    {
                      percent: minClosePercent,
                    }
                  )}
                </span>
              )}
            </div>
            <div className="mt-16">
              <PerpsSlider
                value={closePercent}
                onValueChange={setClosePercent}
                showPercentage={false}
              />
            </div>
          </div>

          {/* PNL Card */}
          <div className="bg-r-neutral-card1 rounded-[16px] p-16 mb-12">
            <div className="flex flex-col gap-12">
              <div className="flex justify-between items-center">
                <span className="text-14 font-medium text-rb-neutral-body leading-[18px]">
                  {t('page.perpsDetail.PerpsClosePositionPopup.receive')}:
                </span>
                <span className="text-17 font-bold text-r-neutral-title-1 leading-[22px]">
                  +$
                  {splitNumberByStep(
                    ((marginUsed * closePercent) / 100).toFixed(2)
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-14 font-medium text-rb-neutral-body leading-[18px]">
                  {t('page.perpsDetail.PerpsClosePositionPopup.closedPnl')}:
                </span>
                <span
                  className={clsx(
                    'text-17 font-bold leading-[22px]',
                    closedPnl >= 0
                      ? 'text-r-green-default'
                      : 'text-r-red-default'
                  )}
                >
                  {closedPnl >= 0 ? '+' : '-'}$
                  {splitNumberByStep(Math.abs(closedPnl).toFixed(2))}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-8 text-13 text-r-neutral-body mb-12">
            <span>
              {t('page.perpsDetail.PerpsClosePositionPopup.fee')}:{' '}
              {formatPercent(bothFee, 4)}
            </span>
            <Tooltip
              overlayClassName={clsx('rectangle')}
              placement="top"
              title={
                <div>
                  <div className="text-13 text-r-neutral-title-2">
                    {t('page.perps.rabbyFeeTips')}
                  </div>
                  <div className="text-13 text-r-neutral-title-2">
                    {t('page.perps.providerFeeTips', {
                      fee: formatPercent(providerFee, 4),
                    })}
                  </div>
                </div>
              }
              align={{ targetOffset: [0, 0] }}
            >
              <RcIconInfo className="text-rabby-neutral-foot w-18 h-18" />
            </Tooltip>
          </div>
          {/* Action Button */}
          <div className="fixed bottom-0 left-0 right-0 border-t-[0.5px] border-solid border-rabby-neutral-line px-20 py-16 flex flex-col">
            <Button
              block
              size="large"
              type="primary"
              className="h-[48px] text-15 font-medium bg-r-blue-default border-r-blue-default"
              onClick={closePosition}
              loading={loading}
              disabled={!isValidClosePercent}
            >
              {t('page.perpsDetail.PerpsClosePositionPopup.confirm')}
            </Button>
          </div>
        </div>
      </div>
    </Popup>
  );
};

export default ClosePositionPopup;
