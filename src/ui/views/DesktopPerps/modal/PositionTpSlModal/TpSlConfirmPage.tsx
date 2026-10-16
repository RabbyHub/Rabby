import { MarketData } from '@/ui/state/perps';
import { useRabbySelector } from '@/ui/store';
import { splitNumberByStep } from '@/ui/utils';
import { Button } from 'antd';
import clsx from 'clsx';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PositionFormatData } from '../../components/UserInfoHistory/PositionsInfo';
import { TpSlCommand, formatTpSlAmount } from '../../positionTpSl';
import { resolveTriggerComparator } from '../../tpslTrigger';
import { OrderConfirmCheckbox } from '../OrderConfirmModal';
import {
  formatSignedValue,
  formatSizeRatio,
  getAmountUnitLabel,
} from './format';
import { PositionTpSlPositionCard } from './PositionTpSlHeader';
import { TpSlSectionTitle } from './TpSlSectionTitle';

const ConfirmRow: React.FC<{
  label: string;
  value: string;
  tone?: 'up' | 'down';
}> = ({ label, value, tone }) => (
  <div className="flex items-center justify-between gap-[12px] text-[14px] leading-[18px]">
    <span className="shrink-0 text-rb-neutral-foot">{label}</span>
    <span
      className={clsx(
        'text-right',
        tone === 'up'
          ? 'text-rb-green-default'
          : tone === 'down'
          ? 'text-rb-red-default'
          : 'text-rb-neutral-title-1'
      )}
    >
      {value}
    </span>
  </div>
);

interface TpSlConfirmPageProps {
  command: TpSlCommand;
  position: PositionFormatData;
  marketData: MarketData;
  markPrice: number;
  submitting: boolean;
  onConfirm: (dontShowAgain: boolean) => void;
}

export const TpSlConfirmPage: React.FC<TpSlConfirmPageProps> = ({
  command,
  position,
  marketData,
  markPrice,
  submitting,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const unit = useRabbySelector((s) => s.perps.sizeDisplayUnit);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const szDecimals = marketData.szDecimals ?? 5;
  const quoteAsset = marketData.quoteAsset || 'USDC';
  const unitLabel = getAmountUnitLabel(unit, position.coin, quoteAsset);
  const isLong = position.direction === 'Long';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-[20px] pt-[12px] pb-[24px]">
        <div className="flex flex-col gap-[24px]">
          <PositionTpSlPositionCard
            position={position}
            marketData={marketData}
            markPrice={markPrice}
            variant="entryOnly"
          />
          {command.legs.map((leg) => (
            <section
              key={leg.kind}
              className={clsx(
                'flex flex-col gap-[12px]',
                command.scope === 'partial' && 'px-[10px]'
              )}
            >
              <TpSlSectionTitle kind={leg.kind} size="large" />
              <ConfirmRow
                label={t('page.perpsPro.positionTpSl.triggerPrice')}
                value={`${resolveTriggerComparator(
                  isLong,
                  leg.kind === 'takeProfit'
                )}${splitNumberByStep(leg.triggerPrice)} ${quoteAsset}`}
              />
              {leg.size ? (
                <ConfirmRow
                  label={t('page.perpsPro.positionTpSl.volume')}
                  value={`${splitNumberByStep(
                    formatTpSlAmount({
                      unit,
                      size: leg.size,
                      markPrice,
                      szDecimals,
                    })
                  )} ${unitLabel} (${formatSizeRatio(
                    leg.size,
                    position.size
                  )})`}
                />
              ) : null}
              <ConfirmRow
                label={t('page.perpsPro.positionTpSl.estimatedPnl')}
                value={
                  leg.pnl ? `${formatSignedValue(leg.pnl)} ${quoteAsset}` : '-'
                }
                tone={leg.pnl ? (leg.pnl.gte(0) ? 'up' : 'down') : undefined}
              />
            </section>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-[16px] px-[20px] py-[16px]">
        <div
          className="flex w-full cursor-pointer select-none items-start gap-[8px]"
          onClick={() => setDontShowAgain((value) => !value)}
        >
          <span className="flex h-[14px] w-[14px] shrink-0 items-center">
            <OrderConfirmCheckbox checked={dontShowAgain} />
          </span>
          <span className="min-w-0 flex-1 text-[12px] leading-[14px] text-rb-neutral-foot">
            {t('page.perpsPro.orderConfirm.dontShowAgain', {
              orderType: t('page.perpsPro.orderConfirm.orderTypeName.tpsl'),
            })}
          </span>
        </div>
        <Button
          block
          size="large"
          type="primary"
          loading={submitting}
          className="h-[48px] rounded-[6px] text-[15px] font-medium"
          onClick={() => onConfirm(dontShowAgain)}
        >
          {t('global.confirm')}
        </Button>
      </div>
    </div>
  );
};
