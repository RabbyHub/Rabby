import { MarketData, PositionAndOpenOrder } from '@/ui/models/perps';
import { formatUsdValue, sleep } from '@/ui/utils';
import { useMemoizedFn, useRequest } from 'ahooks';
import { Button, Modal } from 'antd';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import { noop } from 'lodash';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';
import { usePerpsPosition } from '../../Perps/hooks/usePerpsPosition';
import { validatePriceInput } from '../../Perps/utils';
import { DesktopPerpsInput } from '../components/DesktopPerpsInput';
import { PerpsPositionCard } from '../components/PerpsPositionCard';
import { PositionFormatData } from '../components/UserInfoHistory/PositionsInfo';
import { usePerpsProPosition } from '../hooks/usePerpsProPosition';

export interface Props {
  visible: boolean;
  onCancel: () => void;
  onConfirm?: () => void;

  position: PositionFormatData;
  marketData: MarketData;
}

const calculatePnl = ({
  position,
  extPrice,
}: {
  position: PositionFormatData;
  extPrice: number;
}) => {
  const pnl =
    (Number(extPrice) - Number(position.entryPx)) * Number(position.size);
  const percent = (pnl / Number(position.marginUsed)) * 100;
  return { pnl, percent };
};

export const EditTpSlModal: React.FC<Props> = ({
  visible,
  onCancel,
  position,
  marketData,
  onConfirm,
}) => {
  const { t } = useTranslation();

  // todo tp sl from props
  const [tpPrice, setTpPrice] = React.useState<string>('');
  const [slPrice, setSlPrice] = React.useState<string>('');
  const [gainPct, setGainPct] = React.useState<string>('');
  const [lossPct, setLossPct] = React.useState<string>('');
  const resetForm = useMemoizedFn(() => {
    setTpPrice('');
    setSlPrice('');
    setGainPct('');
    setLossPct('');
  });

  useEffect(() => {
    return () => {
      resetForm();
    };
  }, []);

  const handlePriceChange = useMemoizedFn(
    (price: string, type: 'tp' | 'sl') => {
      let value = price.replace(',', '.');
      if (value.startsWith('$')) {
        value = value.slice(1);
      }
      if (
        (/^\d*\.?\d*$/.test(value) || value === '') &&
        validatePriceInput(value, marketData.szDecimals)
      ) {
        if (type === 'tp') {
          setTpPrice(value);
          const { pnl, percent } = calculatePnl({
            position,
            extPrice: Number(value),
          });
          setGainPct(percent ? percent.toFixed(2) : '');
        } else {
          setSlPrice(value);
          const { pnl, percent } = calculatePnl({
            position,
            extPrice: Number(value),
          });
          setLossPct(percent ? (percent * -1).toFixed(2) : '');
        }
      }
    }
  );

  const tpPnl = useMemo(() => {
    if (!tpPrice) {
      return '';
    }

    return calculatePnl({
      position,
      extPrice: Number(tpPrice),
    }).pnl.toFixed(2);
  }, [tpPrice, position]);

  const slPnl = useMemo(() => {
    if (!slPrice) {
      return '';
    }

    return calculatePnl({
      position,
      extPrice: Number(slPrice),
    }).pnl.toFixed(2);
  }, [slPrice, position]);

  // todo validate input

  const { handleSetAutoClose, handleModifyTpSlOrders } = usePerpsProPosition();

  const { loading, runAsync: runSubmit } = useRequest(
    async () => {
      const direction = position.direction;
      if (position.tpItem && position.slItem) {
        // both have tp and sl
        await handleModifyTpSlOrders({
          coin: position.coin,
          direction,
          tp: {
            triggerPx: Number(tpPrice).toString(),
            oid: position.tpItem.oid,
          },
          sl: {
            triggerPx: Number(slPrice).toString(),
            oid: position.slItem.oid,
          },
        });
      } else if (!position.tpItem && !position.slItem) {
        // both not have tp and sl
        await handleSetAutoClose({
          coin: position.coin,
          tpTriggerPx: new BigNumber(tpPrice).isNaN() ? '' : tpPrice,
          slTriggerPx: new BigNumber(slPrice).isNaN() ? '' : slPrice,
          direction,
        });
      } else {
        // only have tp
        if (position.tpItem) {
          await handleModifyTpSlOrders({
            coin: position.coin,
            direction,
            tp: {
              triggerPx: Number(tpPrice).toString(),
              oid: position.tpItem.oid,
            },
          });
          await sleep(10);
          await handleSetAutoClose({
            coin: position.coin,
            tpTriggerPx: '',
            slTriggerPx: new BigNumber(slPrice).isNaN() ? '' : slPrice,
            direction,
          });
        } else if (position.slItem) {
          // only have sl
          await handleModifyTpSlOrders({
            coin: position.coin,
            direction,
            sl: {
              triggerPx: Number(slPrice).toString(),
              oid: position.slItem.oid,
            },
          });
          await sleep(10);
          await handleSetAutoClose({
            coin: position.coin,
            tpTriggerPx: new BigNumber(tpPrice).isNaN() ? '' : tpPrice,
            slTriggerPx: '',
            direction,
          });
        }
      }
    },
    {
      manual: true,
      onSuccess: () => {
        onConfirm?.();
      },
    }
  );

  return (
    <Modal
      bodyStyle={{ padding: 0, maxHeight: 'unset' }}
      centered
      destroyOnClose
      closable
      visible={visible}
      onCancel={onCancel}
      footer={null}
      width={400}
      className="modal-support-darkmode"
      closeIcon={<RcIconCloseCC className="w-[20px] h-[20px]" />}
    >
      <div className="flex flex-col min-h-[520px] bg-r-neutral-bg2">
        <div className="text-center text-20 font-medium text-r-neutral-title-1 mt-16 mb-2">
          Configure TP/SL
        </div>

        <div className="flex-1 px-20 overflow-y-auto pb-24">
          <section className="mb-[12px]">
            <div className="text-[13px] leading-[16px] text-rb-neutral-foot font-medium mb-[8px]">
              Current position
            </div>
            <PerpsPositionCard position={position} marketData={marketData} />
          </section>

          <section className="mb-[8px]">
            <div className="text-[13px] leading-[16px] text-rb-neutral-foot font-medium mb-[8px]">
              Configure TP/SL
            </div>
            <div className="space-y-[8px]">
              <div className="flex items-center gap-[8px]">
                <DesktopPerpsInput
                  prefix={
                    <span className="text-[12px] leading-[14px] text-r-neutral-foot font-medium">
                      TP
                    </span>
                  }
                  value={tpPrice}
                  onChange={(e) => {
                    handlePriceChange(e.target.value, 'tp');
                  }}
                  className="text-right"
                />
                <DesktopPerpsInput
                  prefix={
                    <span className="text-[12px] leading-[14px] text-r-neutral-foot font-medium">
                      Gain
                    </span>
                  }
                  className="text-right"
                  value={gainPct}
                  onChange={(e) => {
                    const percent = e.target.value;
                  }}
                  suffix={
                    <span className="text-[12px] leading-[14px] text-r-neutral-foot font-medium">
                      %
                    </span>
                  }
                />
              </div>
              <div className="flex items-center gap-[8px]">
                <DesktopPerpsInput
                  prefix={
                    <span className="text-[12px] leading-[14px] text-r-neutral-foot font-medium">
                      SL
                    </span>
                  }
                  value={slPrice}
                  onChange={(e) => {
                    handlePriceChange(e.target.value, 'sl');
                  }}
                  className="text-right"
                />
                <DesktopPerpsInput
                  prefix={
                    <span className="text-[12px] leading-[14px] text-r-neutral-foot font-medium">
                      Loss
                    </span>
                  }
                  className="text-right"
                  suffix={
                    <span className="text-[12px] leading-[14px] text-r-neutral-foot font-medium">
                      %
                    </span>
                  }
                  value={lossPct}
                  onChange={(e) => {
                    const percent = e.target.value;
                    // handlePriceChange
                  }}
                />
              </div>
            </div>
          </section>

          <section className="space-y-[8px]">
            <div className="flex items-center justify-between">
              <div className="text-r-neutral-foot text-[12px] leading-[14px] font-medium">
                Take profit expected PnL
              </div>
              <div
                className={clsx(
                  'font-medium text-[12px] leading-[14px]',
                  tpPnl && Number(tpPnl) < 0
                    ? 'text-r-red-default'
                    : 'text-r-green-default'
                )}
              >
                {tpPnl ? formatUsdValue(tpPnl ? Number(tpPnl) : 0) : '-'}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-r-neutral-foot text-[12px] leading-[14px] font-medium">
                Stop loss expected PnL
              </div>
              <div
                className={clsx(
                  'font-medium text-[12px] leading-[14px]',
                  slPnl && Number(slPnl) < 0
                    ? 'text-r-red-default'
                    : 'text-r-green-default'
                )}
              >
                {slPnl ? formatUsdValue(slPnl ? Number(slPnl) : 0) : '-'}
              </div>
            </div>
          </section>
        </div>

        <div className="bottom-0 left-0 right-0 border-t-[0.5px] border-solid border-rabby-neutral-line px-20 py-16 bg-r-neutral-bg2">
          <div className="flex items-center gap-[16px]">
            <Button
              block
              size="large"
              type="ghost"
              onClick={onCancel}
              className={clsx(
                'h-[44px]',
                'text-blue-light',
                'border-blue-light',
                'hover:bg-[#8697FF1A] active:bg-[#0000001A]',
                'before:content-none'
              )}
            >
              {t('global.Cancel')}
            </Button>
            <Button
              block
              size="large"
              type="primary"
              className="h-[44px] text-15 font-medium"
              loading={loading}
              onClick={async () => {
                await runSubmit();
              }}
            >
              {t('global.confirm')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
