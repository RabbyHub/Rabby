import { TxDisplayItem, TxHistoryItem } from '@/background/service/openapi';
import { sinceTime } from 'ui/utils';
import clsx from 'clsx';
import React from 'react';
import { getChain } from '@/utils';
import { numberWithCommasIsLtOne } from 'ui/utils';
import { TokenChange, TxId, TxInterAddressExplain } from '@/ui/component';

type HistoryItemProps = {
  data: TxDisplayItem | TxHistoryItem;
} & Pick<TxDisplayItem, 'cateDict' | 'projectDict' | 'tokenDict'>;

export const HistoryItem = ({
  data,
  cateDict,
  projectDict,
  tokenDict,
}: HistoryItemProps) => {
  const chain = getChain(data.chain);
  const isFailed = data.tx?.status === 0;
  const isScam = data.is_scam;
  if (!chain) {
    return null;
  }
  return (
    <div
      className={clsx('txs-history-card', (isScam || isFailed) && 'is-gray')}
    >
      <div className="txs-history-card-header">
        {isScam && <div className="tag-scam">Scam tx</div>}
        <div className="txs-history-card-header-inner">
          <div className="time">{sinceTime(data.time_at)}</div>
          <TxId chain={data.chain} id={data.id} />
        </div>
      </div>
      <div className="txs-history-card-body">
        <TxInterAddressExplain
          data={data}
          projectDict={projectDict}
          tokenDict={tokenDict}
          cateDict={cateDict}
        ></TxInterAddressExplain>
        <TokenChange data={data} tokenDict={tokenDict} />
      </div>
      {(data.tx && data.tx?.eth_gas_fee) || isFailed ? (
        <div className="txs-history-card-footer">
          {data.tx && data.tx?.eth_gas_fee ? (
            <div>
              {' '}
              Gas : {numberWithCommasIsLtOne(data.tx?.eth_gas_fee, 2)}{' '}
              {chain?.nativeTokenSymbol} ($
              {numberWithCommasIsLtOne(data.tx?.usd_gas_fee ?? 0, 2)})
            </div>
          ) : null}
          {isFailed && <span className="tx-status is-failed">Failed</span>}
        </div>
      ) : null}
    </div>
  );
};
