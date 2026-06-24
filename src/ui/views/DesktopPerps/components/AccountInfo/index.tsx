import React from 'react';
import clsx from 'clsx';
import BigNumber from 'bignumber.js';
import { useTranslation } from 'react-i18next';
import { formatUsdValue } from '@/ui/utils';
import { DashedUnderlineText } from '../DashedUnderlineText';
import { usePerpsPopupNav } from '@/ui/views/DesktopPerps/hooks/usePerpsPopupNav';
import { RatioGaugeIcon, ratioColor } from './RatioGauge';
import {
  usePerpsAccountSummary,
  SummaryRow as SummaryRowData,
  EquityCol,
} from './usePerpsAccountSummary';

const SummaryRow: React.FC<{ row: SummaryRowData }> = ({ row }) => (
  <div className="flex items-center justify-between">
    {row.tooltip ? (
      <DashedUnderlineText
        needCursor={false}
        tooltipText={row.tooltip}
        className="text-rb-neutral-foot"
      >
        {row.label}
      </DashedUnderlineText>
    ) : (
      <span className="text-rb-neutral-foot">{row.label}</span>
    )}
    {row.gaugeRatio != null ? (
      <div className="font-medium flex items-center gap-[4px]">
        <span className="text-r-neutral-title-1 flex items-center">
          <RatioGaugeIcon ratio={row.gaugeRatio} />
        </span>
        <span style={{ color: ratioColor(row.gaugeRatio) }}>
          {row.valueText}
        </span>
      </div>
    ) : (
      <span className="text-r-neutral-title-1 font-medium">
        {row.valueText}
      </span>
    )}
  </div>
);

const EquityValue: React.FC<{ col: EquityCol }> = ({ col }) => {
  if (col.pnl != null) {
    const pnl = col.pnl;
    return (
      <span
        className={clsx(
          'font-medium',
          pnl >= 0 ? 'text-rb-green-default' : 'text-rb-red-default'
        )}
      >
        {pnl >= 0 ? '+' : '-'}
        {formatUsdValue(Math.abs(pnl), BigNumber.ROUND_DOWN)}
      </span>
    );
  }
  return (
    <span className="text-r-neutral-title-1 font-medium">{col.valueText}</span>
  );
};

const actionButtonClass = clsx(
  'w-full bg-rb-neutral-bg-4 rounded-[8px] h-[32px] flex items-center justify-center',
  'border border-solid border-transparent hover:border-rb-brand-default',
  'text-[12px] leading-[14px] font-medium text-r-neutral-title-1'
);

export const AccountInfo: React.FC = () => {
  const { t } = useTranslation();
  const { openPerpsPopup } = usePerpsPopupNav();
  const summary = usePerpsAccountSummary();

  return (
    <div className="w-full shrink-0 overflow-hidden">
      <div className="px-[12px] pt-[12px] pb-[24px] text-[12px] leading-[14px]">
        {/* Summary section (ratio gauges + per-type rows) */}
        <div className="text-r-neutral-title-1 font-medium mb-[12px]">
          {summary.title}
        </div>
        <div className="space-y-[12px]">
          {summary.summaryRows.map((row) => (
            <SummaryRow key={row.key} row={row} />
          ))}
        </div>

        <div className="h-[1px] bg-rb-neutral-line my-[18px]" />

        {/* Account Equity section */}
        <div className="text-r-neutral-title-1 font-medium mb-[12px]">
          {t('page.perpsPro.accountInfo.accountEquity')}
        </div>
        <div className="flex items-start gap-[8px] mb-[16px]">
          {summary.equityCols.map((col) => (
            <div key={col.key} className="flex-1 min-w-0">
              <div className="text-rb-neutral-foot mb-[4px]">
                {col.tooltip ? (
                  <DashedUnderlineText
                    needCursor={false}
                    tooltipText={col.tooltip}
                    className="text-rb-neutral-foot"
                  >
                    {col.label}
                  </DashedUnderlineText>
                ) : (
                  col.label
                )}
              </div>
              <div className="text-[14px] leading-[16px]">
                <EquityValue col={col} />
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-[8px]">
          <button
            type="button"
            className={actionButtonClass}
            onClick={() => openPerpsPopup('deposit')}
          >
            {t('page.perpsPro.accountInfo.deposit')}
          </button>
          <button
            type="button"
            className={actionButtonClass}
            onClick={() => openPerpsPopup('withdraw')}
          >
            {t('page.perpsPro.accountInfo.withdraw')}
          </button>
        </div>
      </div>
    </div>
  );
};
