import { TxDisplayItem, TxHistoryItem } from '@/background/service/openapi';
import { TokenChange, TxInterAddressExplain } from '@/ui/component';
import clsx from 'clsx';
import React from 'react';
import { sinceTime } from 'ui/utils';

type HistoryItemProps = {
  data: TxDisplayItem | TxHistoryItem;
} & Pick<TxDisplayItem, 'cateDict' | 'projectDict' | 'tokenDict'>;

export const HistoryItem = ({
  data,
  cateDict,
  projectDict,
  tokenDict,
}: HistoryItemProps) => {
  const isFailed = data.tx?.status === 0;
  return (
    <div className={clsx('token-txs-history-card', isFailed && 'is-failed')}>
      <div className="token-txs-history-card-header">
        <div className="time">{sinceTime(data.time_at)}</div>
        {isFailed && <span className="tx-status is-failed">Failed</span>}
      </div>
      <div className="token-txs-history-card-body">
        <TxInterAddressExplain
          data={data}
          projectDict={projectDict}
          tokenDict={tokenDict}
          cateDict={cateDict}
        ></TxInterAddressExplain>
        <TokenChange data={data} tokenDict={tokenDict} />
      </div>
    </div>
  );
};
