import { useRabbySelector } from '@/ui/store';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import React, { useMemo } from 'react';

export const AccountInfo: React.FC = () => {
  const { accountSummary, positionAndOpenOrders } = useRabbySelector(
    (store) => {
      return store.perps;
    }
  );

  console.log('accountSummary', accountSummary);

  const positionAllPnl = useMemo(() => {
    return positionAndOpenOrders.reduce((acc, asset) => {
      return acc + Number(asset.position.unrealizedPnl || 0);
    }, 0);
  }, [positionAndOpenOrders]);

  return (
    <div className="w-[360px] h-full flex flex-col flex-shrink-0 overflow-hidden">
      <div className="border-b border-solid border-rb-neutral-line p-[16px] flex-shrink-0">
        <div className="text-r-neutral-title-1 text-[14px] font-medium">
          Account Info
        </div>
      </div>
      <div className="flex-1 overflow-auto p-[16px] min-h-0">
        <div className="flex items-center gap-[2px] mb-[16px]">
          <button
            type="button"
            className={clsx(
              'w-full bg-rb-neutral-bg-4 rounded-[8px] py-[9px]',
              'text-[12px] leading-[14px] font-medium text-r-neutral-title-1'
            )}
          >
            Deposit
          </button>
          <button
            type="button"
            className={clsx(
              'w-full bg-rb-neutral-bg-4 rounded-[8px] py-[9px]',
              'text-[12px] leading-[14px] font-medium text-r-neutral-title-1'
            )}
          >
            Withdraw
          </button>
        </div>
        <div className="space-y-[8px] text-[12px] leading-[14px] font-medium">
          <div className="flex items-center justify-between">
            <div className="text-r-neutral-title-1">Total Balance</div>
            <div className="text-r-neutral-title-1">
              {formatUsdValue(
                Number(accountSummary?.accountValue || 0),
                BigNumber.ROUND_DOWN
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-r-neutral-title-1">Available Balance</div>
            <div className="text-r-neutral-title-1">
              {formatUsdValue(
                Number(accountSummary?.withdrawable || 0),
                BigNumber.ROUND_DOWN
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-rb-neutral-foot">Unrealized P&L</div>
            <div
              className={clsx(
                positionAllPnl >= 0
                  ? 'text-rb-green-default'
                  : 'text-rb-red-default'
              )}
            >
              {positionAllPnl >= 0 ? '+' : '-'}$
              {splitNumberByStep(Math.abs(positionAllPnl).toFixed(2))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-rb-neutral-foot">Liquidation risk</div>
            <div className="text-r-neutral-title-1">//todo</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-rb-neutral-foot">Maintenance margin</div>
            <div className="text-r-neutral-title-1">//todo</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-rb-neutral-foot">Cross account leverage</div>
            <div className="text-r-neutral-title-1">
              {(
                Number(accountSummary?.totalNtlPos || 0) /
                Number(accountSummary?.accountValue || 1)
              ).toFixed(2)}
              x
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
