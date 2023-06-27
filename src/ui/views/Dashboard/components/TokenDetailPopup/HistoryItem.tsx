import styled from 'styled-components';
import { TxDisplayItem, TxHistoryItem } from '@/background/service/openapi';
import { TokenChange, TxInterAddressExplain } from '@/ui/component';
import clsx from 'clsx';
import React from 'react';
import { sinceTime, openInTab } from 'ui/utils';
import { ellipsis } from 'ui/utils/address';
import { CHAINS } from 'consts';

type HistoryItemProps = {
  data: TxDisplayItem | TxHistoryItem;
  canClickToken?: boolean;
} & Pick<TxDisplayItem, 'cateDict' | 'projectDict' | 'tokenDict'>;

const EtherscanLink = styled.div`
  cursor: pointer;
  text-decoration: underline;
  color: #707880;
  font-size: 12px;
  line-height: 14px;
`;

export const HistoryItem = ({
  data,
  cateDict,
  projectDict,
  tokenDict,
  canClickToken = true,
}: HistoryItemProps) => {
  const isFailed = data.tx?.status === 0;
  const isScam = data.is_scam;

  const handleClickTxHash = () => {
    const chain = Object.values(CHAINS).find(
      (item) => data.chain === item.serverId
    );
    if (!chain) return;
    openInTab(chain.scanLink.replace(/_s_/, data.id));
  };
  return (
    <div
      className={clsx(
        'token-txs-history-card',
        (isScam || isFailed) && 'is-gray'
      )}
    >
      <div className="token-txs-history-card-header">
        {isScam && <div className="tag-scam">Scam tx</div>}
        <div className="time">{sinceTime(data.time_at)}</div>
        {isFailed && <span className="tx-status is-failed">Failed</span>}
        <EtherscanLink onClick={handleClickTxHash}>
          {ellipsis(data.id)}
        </EtherscanLink>
      </div>
      <div className="token-txs-history-card-body">
        <TxInterAddressExplain
          data={data}
          projectDict={projectDict}
          tokenDict={tokenDict}
          cateDict={cateDict}
        ></TxInterAddressExplain>
        <TokenChange
          data={data}
          tokenDict={tokenDict}
          canClickToken={canClickToken}
        />
      </div>
    </div>
  );
};
