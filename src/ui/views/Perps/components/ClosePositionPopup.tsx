import React from 'react';
import { Button, Tooltip } from 'antd';
import Popup, { PopupProps } from '@/ui/component/Popup';
import { useTranslation } from 'react-i18next';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import clsx from 'clsx';
import { ReactComponent as RcIconInfo } from 'ui/assets/info-cc.svg';
import { useMemoizedFn } from 'ahooks';
import { formatPercent } from './SingleCoin';
interface ClosePositionPopupProps extends Omit<PopupProps, 'onCancel'> {
  visible: boolean;
  coin: string;
  direction: 'Long' | 'Short';
  positionSize: string;
  providerFee: number;
  pnl: number;
  onCancel: () => void;
  onConfirm: () => void;
  handleClosePosition: () => Promise<void>;
}

export const ClosePositionPopup: React.FC<ClosePositionPopupProps> = ({
  visible,
  coin,
  direction,
  positionSize,
  providerFee,
  pnl,
  onCancel,
  onConfirm,
  handleClosePosition,
  ...rest
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = React.useState<boolean>(false);

  const closePosition = useMemoizedFn(async () => {
    setLoading(true);
    try {
      await handleClosePosition();
      onConfirm();
    } finally {
      setLoading(false);
    }
  });

  React.useEffect(() => {
    if (!visible) {
      setLoading(false);
    }
  }, [visible]);

  const bothFee = React.useMemo(() => {
    return providerFee + 0.0004;
  }, [providerFee]);

  return (
    <Popup
      placement="bottom"
      height={280}
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
        <div className="text-20 font-medium text-r-neutral-title-1 text-center pt-16 pb-12">
          {t('page.perps.closePositionPopup.title', {
            coin,
            direction,
          })}
        </div>

        <div className="flex-1 px-20">
          {/* Position Details Section */}
          <div className="bg-r-neutral-card1 rounded-[8px] p-16 mb-20">
            <div className="space-y-16">
              <div className="flex justify-between items-center">
                <div className="text-13 text-r-neutral-body">
                  {t('page.perps.closePositionPopup.positionSize')}
                </div>
                <div className="text-13 text-r-neutral-title-1 font-medium">
                  {positionSize} {coin}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-13 text-r-neutral-body">
                  {t('page.perps.closePositionPopup.pnl')}
                </div>
                <div
                  className={clsx(
                    'text-13 font-medium',
                    pnl >= 0 ? 'text-r-green-default' : 'text-r-red-default'
                  )}
                >
                  {pnl >= 0 ? '+' : '-'}$
                  {splitNumberByStep(Math.abs(pnl).toFixed(2))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="fixed bottom-0 left-0 right-0 border-t-[0.5px] border-solid border-rabby-neutral-line px-20 py-16 flex flex-col gap-12">
            <Button
              block
              size="large"
              type="primary"
              className="h-[48px] text-15 font-medium bg-r-blue-default border-r-blue-default"
              onClick={closePosition}
              loading={loading}
            >
              {direction === 'Long'
                ? t('page.perps.closeLong')
                : t('page.perps.closeShort')}
            </Button>

            {/* Fee Information */}
            <div className="flex items-center justify-center gap-8 text-13 text-r-neutral-body">
              <span>{formatPercent(bothFee, 4)} fee</span>
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
                <RcIconInfo className="text-rabby-neutral-foot w-14 h-14" />
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </Popup>
  );
};

export default ClosePositionPopup;
