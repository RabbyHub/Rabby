import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { checkIsPendingTxGroup, findMaxGasTx } from '@/utils/tx';
import { TxRequest } from '@rabby-wallet/rabby-api/dist/types';
import { Popover } from 'antd';
import {
  TransactionGroup,
  TransactionHistoryItem,
} from 'background/service/transactionHistory';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { SvgPendingSpin } from 'ui/assets';
import IconDropdown from 'ui/assets/signature-record/dropdown.svg';
import IconInfo from 'ui/assets/signature-record/info.svg';
import { sinceTime } from 'ui/utils';
import { MempoolList } from './MempoolList';

export const TransactionPendingTag = ({
  item,
  onReBroadcast,
  txRequests,
}: {
  item: TransactionGroup;
  onReBroadcast?(tx: TransactionHistoryItem): void;
  txRequests: Record<string, TxRequest>;
}) => {
  const { t } = useTranslation();
  const maxGasTx = findMaxGasTx(item.txs);

  const isPending = checkIsPendingTxGroup(item);

  if (!isPending) {
    return null;
  }

  if (maxGasTx.hash && !maxGasTx.reqId) {
    return (
      <div className="pending">
        <SvgPendingSpin className="icon icon-pending-spin" />
        {t('page.activities.signedTx.status.pending')}
      </div>
    );
  }

  if (maxGasTx.hash) {
    return (
      <Popover
        overlayClassName="mempool-list-popover"
        placement="bottomLeft"
        destroyTooltipOnHide
        content={
          <MempoolList
            tx={maxGasTx}
            onReBroadcast={() => onReBroadcast?.(maxGasTx)}
          />
        }
      >
        <div className="pending">
          <SvgPendingSpin className="icon icon-pending-spin" />
          {t('page.activities.signedTx.status.pendingBroadcasted')}

          <img src={IconDropdown} alt="" />
        </div>
      </Popover>
    );
  }

  const txRequest = maxGasTx?.reqId ? txRequests[maxGasTx.reqId] : null;

  const pushAt = txRequest?.push_at;
  const deadline = Math.round((txRequest?.low_gas_deadline || 0) / 60 / 60);

  if (pushAt) {
    return (
      <div className="pending">
        <SvgPendingSpin className="icon icon-pending-spin" />
        {t('page.activities.signedTx.status.pendingBroadcastFailed')}{' '}
        <TooltipWithMagnetArrow
          overlayClassName="rectangle max-w-[330px] w-[max-content]"
          placement="top"
          align={{
            offset: [20, 0],
          }}
          title={
            <>
              {t('page.activities.signedTx.tips.pendingBroadcastRetry', {
                pushAt: sinceTime(pushAt),
              })}{' '}
              <span
                className="cursor-pointer underline"
                onClick={() => {
                  onReBroadcast?.(maxGasTx);
                }}
              >
                {t('page.activities.signedTx.tips.pendingBroadcastRetryBtn')}
              </span>
            </>
          }
        >
          <img src={IconInfo} alt="" />
        </TooltipWithMagnetArrow>
      </div>
    );
  }

  return (
    <div className="pending">
      <SvgPendingSpin className="icon icon-pending-spin" />
      {t('page.activities.signedTx.status.pendingBroadcast')}{' '}
      <TooltipWithMagnetArrow
        overlayClassName="rectangle max-w-[330px] w-[max-content]"
        placement="top"
        align={{
          offset: [20, 0],
        }}
        title={
          <>
            {t('page.activities.signedTx.tips.pendingBroadcast', {
              deadline: deadline,
            })}{' '}
            <span
              className="cursor-pointer underline"
              onClick={() => {
                onReBroadcast?.(maxGasTx);
              }}
            >
              {t('page.activities.signedTx.tips.pendingBroadcastBtn')}
            </span>
          </>
        }
      >
        <img src={IconInfo} alt="" />
      </TooltipWithMagnetArrow>
    </div>
  );
};
