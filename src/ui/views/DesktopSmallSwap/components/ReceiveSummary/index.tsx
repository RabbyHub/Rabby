import clsx from 'clsx';
import React from 'react';

import { ExchangeSettingRow } from '../ExchangeSettingRow';
import { SlippagePopup } from './SlippagePopup';

type ReceiveSummaryProps = {
  totalValue: number;
  formatUsd: (value: number) => string;
};

export const ReceiveSummary: React.FC<ReceiveSummaryProps> = ({
  totalValue,
  formatUsd,
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  return (
    <>
      <section
        className="relative translate-x-0 overflow-hidden w-[520px] flex-shrink-0 rounded-[16px] bg-r-neutral-card-1 px-[24px] py-[32px] flex flex-col"
        style={{ boxShadow: '0 16px 40px rgba(25, 41, 69, 0.06)' }}
        ref={ref}
      >
        <div className="mb-[32px] text-[24px] leading-[29px] font-medium text-r-neutral-title1">
          You Receive
        </div>

        <div className="mb-[32px] flex items-center gap-[16px]">
          <div className="relative w-[40px] h-[40px] rounded-full bg-r-neutral-bg-0 flex items-center justify-center text-[14px] font-semibold text-r-neutral-title1">
            ETH
            <span className="absolute right-[-1px] bottom-[-1px] w-[14px] h-[14px] rounded-full border border-white bg-[#5C6CFF]" />
          </div>
          <div>
            <div className="text-[24px] leading-[29px] font-medium text-r-neutral-title1">
              {formatUsd(totalValue)}
            </div>
            <div className="mt-[8px] text-[15px] leading-[18px] text-r-neutral-title1">
              Expected to receive {totalValue > 0 ? totalValue.toFixed(2) : '0'}{' '}
              ETH
            </div>
          </div>
        </div>

        <div className="border-t border-rabby-neutral-line" />
        <div className="mt-[32px]">
          <ExchangeSettingRow label="Slippage tolerance" value="3%" />

          <ExchangeSettingRow
            label="Single Transaction Gas Limit"
            value="$0.1"
          />
        </div>

        <div className="mt-auto pt-[24px]">
          <button
            type="button"
            className={clsx(
              'w-full h-[60px] rounded-[8px] text-[18px] leading-[20px] font-medium transition-opacity',
              totalValue > 0
                ? 'bg-[#AEB8FF] text-white hover:opacity-90'
                : 'bg-r-neutral-line text-r-neutral-foot cursor-not-allowed'
            )}
            disabled={totalValue <= 0}
          >
            Start convert
          </button>
        </div>
      </section>
      <SlippagePopup
        slippage={0}
        onChange={function (slippage: number): void {
          throw new Error('Function not implemented.');
        }}
        getContainer={() => {
          console.log('ref.current', ref.current);
          return ref.current || document.body;
        }}
      />
    </>
  );
};
