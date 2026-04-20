import React from 'react';
import { GasAccountHistory } from './History';
import type { useGasAccountHistory } from '../hooks';
import { GasAccountBalanceCard } from './GasAccountBalanceCard';
import { GasAccountWarning } from './GasAccountWarning';

type GasAccountHistoryState = ReturnType<typeof useGasAccountHistory>;

export const GasAccountUserState: React.FC<{
  balance?: number | string | null;
  historyState: GasAccountHistoryState;
  warningMessage?: string;
}> = ({ balance, historyState, warningMessage }) => {
  return (
    <div className="flex min-h-full flex-col pb-20">
      {warningMessage ? <GasAccountWarning message={warningMessage} /> : null}

      <GasAccountBalanceCard balance={balance} />

      <div className="flex-1 min-h-[280px]">
        <GasAccountHistory historyState={historyState} />
      </div>
    </div>
  );
};
