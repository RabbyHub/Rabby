import React from 'react';
import { Popover } from 'antd';
import clsx from 'clsx';
import styled, { createGlobalStyle } from 'styled-components';
import { useTranslation } from 'react-i18next';
import {
  RABBY_FEE_DISCOUNT_CASES,
  RABBY_FEE_TIERS,
  SWAP_FEE_RATE,
} from '../hooks/fee';
import type { RabbyFeeTier } from '../hooks/fee';
import feeRabby from '@/ui/assets/swap/fee-rabby.svg';
import { ReactComponent as RcFeeQuestion } from '@/ui/assets/swap/fee-question.svg';

const PopoverStyle = createGlobalStyle`
  .rabby-fee-discount-popover {
    &.ant-popover-placement-topRight {
      /* Visible height of Ant Design's 8px arrow with a 2px rounded tip. */
      padding-bottom: calc(10px - 2px * 1.41421356237);
    }
    .ant-popover-content {
      border-radius: 8px;
      backdrop-filter: blur(8.718px);
    }
    .ant-popover-inner {
      width: 240px;
      border: 0.5px solid var(--r-neutral-line);
      border-radius: 8px;
      background: rgba(var(--r-neutral-bg-1-rgb), 0.9);
      box-shadow: 0 13px 15px rgba(0, 0, 0, 0.05),
        0 4px 6.5px rgba(0, 0, 0, 0.05);
    }
    &.ant-popover-placement-topRight .ant-popover-arrow {
      right: 12px;
      bottom: 1px;
    }
    .ant-popover-inner-content {
      width: 100%;
      padding: 10px 8px;
    }
    .ant-popover-arrow-content {
      --antd-arrow-background-color: rgba(var(--r-neutral-bg-1-rgb), 0.9);
    }
  }
`;

const FeeTag = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 1px 6px;
  border: 0;
  border-radius: 4px;
  background: var(--r-green-default);
  color: var(--r-neutral-title-2);
  font-size: 12px;
  font-weight: 500;
  line-height: 14px;
  cursor: pointer;

  &.half {
    background: transparent;
    color: var(--r-green-default);
    box-shadow: inset 0 0 0 1px var(--r-green-default);
  }

  img,
  svg {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }
`;

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
      <PopoverStyle />
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
            <div className="px-8 mb-8 text-13 font-510 leading-[normal] text-r-neutral-title-1">
              {t('page.swap.rabbyFee.discountTitle')}
            </div>
            <div className="flex flex-col gap-2">
              {RABBY_FEE_DISCOUNT_CASES[type].map((tier) => (
                <div
                  key={tier}
                  className={clsx(
                    'flex w-full items-center justify-between gap-4 rounded-[4px] px-8 py-[7px] text-12 leading-[normal]',
                    tier === feeTier
                      ? 'bg-r-blue-light-1 text-r-blue-default font-510'
                      : 'bg-r-neutral-card-1 text-r-neutral-foot font-normal'
                  )}
                >
                  <span>{t(`page.swap.rabbyFee.cases.${tier}`)}</span>
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
        <FeeTag
          type="button"
          className={clsx(!isFree && 'half')}
          aria-label={`${feeLabel}: ${t('page.swap.rabbyFee.discountTitle')}`}
        >
          {isFree && <img src={feeRabby} alt="" />}
          <span className={clsx(isFree && 'italic')}>{feeLabel}</span>
          <RcFeeQuestion aria-hidden />
        </FeeTag>
      </Popover>
    </div>
  );
};
