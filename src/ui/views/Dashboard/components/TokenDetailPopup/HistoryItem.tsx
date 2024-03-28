import styled from 'styled-components';
import { TxDisplayItem, TxHistoryItem } from '@/background/service/openapi';
import { TokenChange, TxInterAddressExplain } from '@/ui/component';
import clsx from 'clsx';
import React from 'react';
import { sinceTime, openInTab, getUITypeName } from 'ui/utils';
import { ellipsis } from 'ui/utils/address';
import { CHAINS } from 'consts';
import { useTranslation } from 'react-i18next';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { findChain } from '@/utils/chain';
import { getTxScanLink } from '@/utils';

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
    const chain = findChain({
      serverId: data.chain,
    });
    if (!chain) return;
    const needClose = getUITypeName() !== 'notification';
    openInTab(getTxScanLink(chain.scanLink, data.id), needClose);
  };
  const { t } = useTranslation();
  return (
    <div className={clsx('token-txs-history-card')}>
      <div className="token-txs-history-card-header">
        {isScam && (
          <TooltipWithMagnetArrow
            title={t('page.transactions.txHistory.scamToolTip')}
            className="rectangle w-[max-content] max-w-[340px]"
          >
            <div className="tag-scam opacity-50">{t('global.scamTx')}</div>
          </TooltipWithMagnetArrow>
        )}
        <div
          className={clsx(
            'txs-history-card-header-inner',
            (isScam || isFailed) && 'opacity-50'
          )}
        >
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
      </div>
      <div
        className={clsx(
          'token-txs-history-card-body',
          (isScam || isFailed) && 'opacity-50'
        )}
      >
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
