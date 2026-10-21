import { MarketData } from '@/ui/state/perps';
import { splitNumberByStep } from '@/ui/utils';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconBackCC } from 'ui/assets/back-cc.svg';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';
import { PerpsDisplayCoinName } from '../../../Perps/components/PerpsDisplayCoinName';
import type { PositionFormatData } from '../../components/UserInfoHistory/PositionsInfo';

const ICON_BUTTON =
  'flex h-[20px] w-[20px] items-center justify-center border-0 bg-transparent p-0 disabled:cursor-not-allowed disabled:opacity-50';

export const PositionTpSlTitleBar: React.FC<{
  title: string;
  onBack?: () => void;
  onClose: () => void;
  disabled?: boolean;
}> = ({ title, onBack, onClose, disabled }) => (
  <div className="grid h-[56px] shrink-0 grid-cols-[20px_1fr_20px] items-center gap-[16px] px-[20px]">
    {onBack ? (
      <button
        type="button"
        className={clsx(ICON_BUTTON, 'text-rb-neutral-title-1')}
        disabled={disabled}
        onClick={onBack}
      >
        <RcIconBackCC className="h-[20px] w-[20px]" />
      </button>
    ) : (
      <span />
    )}
    <span className="truncate text-center text-[20px] leading-[24px] font-medium text-rb-neutral-title-1">
      {title}
    </span>
    <button
      type="button"
      className={clsx(ICON_BUTTON, 'text-rb-neutral-body')}
      disabled={disabled}
      onClick={onClose}
    >
      <RcIconCloseCC className="h-[20px] w-[20px]" />
    </button>
  </div>
);

export const PositionTpSlPositionCard: React.FC<{
  position: PositionFormatData;
  marketData: MarketData;
  markPrice: number;
  /** `entryOnly`: the confirmation page's one-row card. */
  variant?: 'full' | 'entryOnly';
}> = ({ position, marketData, markPrice, variant = 'full' }) => {
  const { t } = useTranslation();
  const pxDecimals = marketData.pxDecimals ?? 2;
  const items = [
    {
      key: 'entry',
      label: t('page.perpsPro.positionTpSl.entryPrice'),
      value: splitNumberByStep(position.entryPx),
    },
    {
      key: 'mark',
      label: t('page.perpsPro.positionTpSl.markPrice'),
      value:
        markPrice > 0 ? splitNumberByStep(markPrice.toFixed(pxDecimals)) : '-',
    },
    {
      key: 'liq',
      label: t('page.perpsPro.positionTpSl.estLiqPrice'),
      value:
        Number(position.liquidationPx) > 0
          ? splitNumberByStep(position.liquidationPx)
          : '-',
    },
  ];

  return (
    <div
      className={clsx(
        'flex flex-col rounded-[6px] bg-r-neutral-card3',
        variant === 'full' ? 'gap-[12px] p-[16px]' : 'gap-[8px] p-[16px]'
      )}
    >
      <div className="flex items-center gap-[6px]">
        <PerpsDisplayCoinName
          item={marketData}
          separator="-"
          showDexTag
          className="text-[16px] leading-[19px] font-medium"
          baseClassName="text-rb-neutral-title-1"
          quoteClassName="text-rb-neutral-title-1"
        />
        <span
          className={clsx(
            'flex h-[16px] items-center rounded-[3px] px-[4px] text-[10px] leading-[16px] font-medium text-rb-neutral-title-1',
            // Figma's 功能色 green/red-light-2 (#58C669@27% / #FF736B@20%).
            // Read the raw tokens: `html.perps-pro-theme` remaps the
            // `--rb-*-light-2` vars to the -r palette (antd-overwrite.less).
            position.direction === 'Long'
              ? 'bg-[var(--rb-dark-green-light-2)]'
              : 'bg-[var(--rb-dark-red-light-2)]'
          )}
        >
          {position.direction.toLowerCase()} {position.leverage}x
        </span>
      </div>
      {variant === 'full' ? (
        <div className="flex gap-[48px]">
          {items.map((item) => (
            <div
              key={item.key}
              className="flex min-w-0 flex-1 flex-col gap-[3px]"
            >
              <span className="text-[12px] leading-[20px] text-rb-neutral-secondary">
                {item.label}
              </span>
              <span className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-[12px] leading-[20px] text-rb-neutral-secondary">
            {items[0].label}
          </span>
          <span className="text-[12px] leading-[14px] font-medium text-rb-neutral-title-1">
            {items[0].value}
          </span>
        </div>
      )}
    </div>
  );
};
