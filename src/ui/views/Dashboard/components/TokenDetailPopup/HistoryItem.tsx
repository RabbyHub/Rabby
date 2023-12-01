import styled from 'styled-components';
import { TxDisplayItem, TxHistoryItem } from '@/background/service/openapi';
import { TokenChange, TxInterAddressExplain } from '@/ui/component';
import clsx from 'clsx';
import React from 'react';
import { sinceTime, openInTab, getUITypeName } from 'ui/utils';
import { ellipsis } from 'ui/utils/address';
import { CHAINS } from 'consts';
import { useTranslation } from 'react-i18next';

type HistoryItemProps = {
  data: TxDisplayItem | TxHistoryItem;
  canClickToken?: boolean;
  onClose?: () => void;
} & Pick<TxDisplayItem, 'cateDict' | 'projectDict' | 'tokenDict'>;

const EtherscanLink = styled.div`
  cursor: pointer;
  text-decoration: underline;
  color: var(--r-neutral-foot, #6a7587);
  font-size: 12px;
  line-height: 14px;
`;

export const HistoryItem = ({
  data,
  cateDict,
  projectDict,
  tokenDict,
  canClickToken = true,
  onClose,
}: HistoryItemProps) => {
  const isFailed = data.tx?.status === 0;
  const isScam = data.is_scam;

  const handleClickTxHash = () => {
    const chain = Object.values(CHAINS).find(
      (item) => data.chain === item.serverId
    );
    if (!chain) return;
    const needClose = getUITypeName() !== 'notification';
    openInTab(chain.scanLink.replace(/_s_/, data.id), needClose);
  };
  const { t } = useTranslation();
  return (
    <div
      className={clsx(
        'token-txs-history-card',
        (isScam || isFailed) && 'is-gray'
      )}
    >
      <div className="token-txs-history-card-header">
        {isScam && (
          <div className="tag-scam">
            {t('page.dashboard.tokenDetail.scamTx')}
          </div>
        )}
        <div className="time">{sinceTime(data.time_at)}</div>
        {isFailed && (
          <span className="tx-status is-failed">
            {t('page.dashboard.tokenDetail.txFailed')}
          </span>
        )}
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
          onClose={onClose}
        />
      </div>
    </div>
  );
};
