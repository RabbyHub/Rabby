import { TxDisplayItem, TxHistoryItem } from '@/background/service/openapi';
import { TokenChange, TxInterAddressExplain } from '@/ui/component';
import clsx from 'clsx';
import React from 'react';
import { sinceTime, openInTab, getUITypeName, getUiType } from 'ui/utils';
import { ellipsis } from 'ui/utils/address';
import { CHAINS } from 'consts';
import { useTranslation } from 'react-i18next';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { findChain } from '@/utils/chain';
import { getTxScanLink } from '@/utils';
import { DesktopTokenChange } from '@/ui/views/DesktopProfile/components/TransactionsTabPane/DesktopTokenChange';
import { TxHistoryItemRow } from '@/db/schema/history';

const isDesktop = getUiType().isDesktop;
type HistoryItemProps = {
  data: TxHistoryItemRow;
  canClickToken?: boolean;
  onClose?: () => void;
  isInDesktopActionModal?: boolean;
};

export const HistoryItem = ({
  data,
  canClickToken = true,
  onClose,
  isInDesktopActionModal,
}: HistoryItemProps) => {
  const isFailed = data.tx?.status === 0;
  const isScam = data.is_scam;
  const needUseTokenDetailModal = isDesktop && !isInDesktopActionModal;

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
            className="rectangle w-[max-content]"
          >
            <div className="tag-scam opacity-50">{t('global.scamTx')}</div>
          </TooltipWithMagnetArrow>
        )}
        <div
          className={clsx(
            'txs-history-card-header-inner whitespace-nowrap flex-1 gap-12 flex items-center',
            (isScam || isFailed) && 'opacity-50'
          )}
        >
          <div className="time">{sinceTime(data.time_at)}</div>
          {isFailed && (
            <span className="tx-status is-failed">
              {t('page.dashboard.tokenDetail.txFailed')}
            </span>
          )}
          <div
            className="cursor-pointer underline text-r-neutral-foot text-12"
            onClick={handleClickTxHash}
          >
            {ellipsis(data.id)}
          </div>
        </div>
      </div>
      <div
        className={clsx(
          'token-txs-history-card-body',
          (isScam || isFailed) && 'opacity-50'
        )}
      >
        <TxInterAddressExplain data={data}></TxInterAddressExplain>
        <TokenChange
          data={data}
          canClickToken={canClickToken}
          onClose={onClose}
        />
      </div>
    </div>
  );
};
