import { Skeleton } from 'antd';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import React from 'react';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils/number';
import type { usePerpsHomePnl } from '@/ui/views/Perps/hooks/usePerpsHomePnl';

export const PerpsHomeBalance = ({
  status,
  amount,
  hidden,
}: ReturnType<typeof usePerpsHomePnl> & { hidden: boolean }) => {
  if (hidden) {
    return (
      <div className="absolute bottom-[6px] text-[11px] leading-[13px] font-medium text-r-neutral-foot">
        *****
      </div>
    );
  }
  if (status === 'blank') return null;
  if (status === 'loading') {
    return (
      <div className="absolute bottom-[6px] text-[11px] font-medium">
        <Skeleton.Button
          active
          className="h-[10px] block rounded-[2px]"
          style={{ width: 42 }}
        />
      </div>
    );
  }

  let label = '--';
  let color = 'text-r-neutral-foot';
  if (amount) {
    if (amount.kind === 'pnl') {
      const isUp = amount.value >= 0;
      color = isUp ? 'text-r-green-default' : 'text-r-red-default';
      label = `${isUp ? '+' : '-'}$${splitNumberByStep(
        Math.abs(amount.value).toFixed(2)
      )}`;
    } else {
      label = formatUsdValue(amount.value, BigNumber.ROUND_DOWN);
    }
  }
  return (
    <div
      className={clsx(
        'absolute bottom-[6px] text-[11px] leading-[13px] font-medium',
        color
      )}
    >
      {label}
    </div>
  );
};
