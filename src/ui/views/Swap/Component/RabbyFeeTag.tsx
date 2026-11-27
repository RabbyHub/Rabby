import React from 'react';
import { Popover } from 'antd';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import {
  RABBY_FEE_DISCOUNT_CASES,
  RABBY_FEE_TIERS,
  SWAP_FEE_RATE,
} from '../hooks/fee';
import type { RabbyFeeTier } from '../hooks/fee';
import feeRabby from '@/ui/assets/swap/fee-rabby.svg';
import { ReactComponent as RcFeeQuestion } from '@/ui/assets/swap/fee-question.svg';
import { useDocumentClass } from '@/ui/hooks/useDocumentClass';
import styles from './RabbyFeeTag.module.css';

/** Displays the fee and explains the current discount in a popover. */
export const RabbyFeeTag = ({
  type,
  feeTier,
  onOpenCompare,
}: {
  type: keyof typeof RABBY_FEE_DISCOUNT_CASES;
  feeTier: RabbyFeeTier;
  onOpenCompare: () => void;
}) => {
  const { t } = useTranslation();
  const isFree = RABBY_FEE_TIERS[feeTier] === SWAP_FEE_RATE.FREE;
  const feeLabel = isFree
    ? t('page.swap.rabbyFee.free')
    : `${RABBY_FEE_TIERS[feeTier]}%`;
  useDocumentClass(styles.globalActive, feeTier !== 'default');

  if (feeTier === 'default') {
    return (
      <button
        type="button"
        className="text-12 font-medium text-r-blue-default cursor-pointer"
        onClick={onOpenCompare}
      >
        {SWAP_FEE_RATE.DEFAULT}%
      </button>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-4 text-12">
      {!isFree && (
        <span className="font-normal text-r-neutral-foot line-through">
          {SWAP_FEE_RATE.DEFAULT}%
        </span>
      )}
      <Popover
        placement="topRight"
        // Anchor to the tag's right edge: the question center is 12px inward
        // and its top is 2px below the tag. Preserve the existing arrow position.
        align={{ points: ['br', 'tr'], offset: [11, -4] }}
        autoAdjustOverflow={false}
        trigger={['hover', 'focus', 'click']}
        overlayClassName="rabby-fee-discount-popover"
        content={
          <>
            <div className="px-8 mb-8 text-13 font-medium leading-[normal] text-r-neutral-title-1">
              {t('page.swap.rabbyFee.discountTitle')}
            </div>
            <div className="flex flex-col gap-2">
              {RABBY_FEE_DISCOUNT_CASES[type].map((tier) => (
                <div
                  key={tier}
                  className={clsx(
                    'flex w-full items-center justify-between gap-4 rounded-[4px] px-8 py-[7px] text-12 leading-[normal]',
                    tier === feeTier
                      ? 'bg-r-blue-light-1 text-r-blue-default font-medium'
                      : 'bg-transparent text-r-neutral-foot font-normal'
                  )}
                >
                  <span className="min-w-0 truncate">
                    {t(`page.swap.rabbyFee.cases.${tier}`)}
                  </span>
                  <span className="shrink-0">
                    {tier === 'hundredThousand'
                      ? '50%'
                      : t('page.swap.rabbyFee.free')}
                  </span>
                </div>
              ))}
            </div>
          </>
        }
      >
        <button
          type="button"
          className={clsx(styles.feeTag, !isFree && 'half')}
          aria-label={`${feeLabel}: ${t('page.swap.rabbyFee.discountTitle')}`}
        >
          {isFree && <img src={feeRabby} alt="" />}
          <span className={clsx(isFree && 'italic')}>{feeLabel}</span>
          <RcFeeQuestion aria-hidden />
        </button>
      </Popover>
    </div>
  );
};
