import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TpSlKind } from '../../positionTpSl';

/** `Take Profit` / `Stop Loss` with the 4×12 colour bar from Figma. */
export const TpSlSectionTitle: React.FC<{
  kind: TpSlKind;
  size?: 'default' | 'large';
  extra?: React.ReactNode;
}> = ({ kind, size = 'default', extra }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-[12px]">
      <div className="flex items-center gap-[6px]">
        <span
          className={clsx(
            'h-[12px] w-[4px] shrink-0',
            kind === 'takeProfit' ? 'bg-rb-green-default' : 'bg-rb-red-default'
          )}
        />
        <span
          className={clsx(
            'font-medium text-rb-neutral-title-1',
            size === 'large'
              ? 'text-[16px] leading-[20px]'
              : 'text-[14px] leading-[18px]'
          )}
        >
          {kind === 'takeProfit'
            ? t('page.perpsPro.positionTpSl.takeProfit')
            : t('page.perpsPro.positionTpSl.stopLoss')}
        </span>
      </div>
      {extra}
    </div>
  );
};
