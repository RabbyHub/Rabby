import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { Popover } from 'antd';
import {
  TransactionGroup,
  TransactionHistoryItem,
} from 'background/service/transactionHistory';
import { CHAINS } from 'consts';
import maxBy from 'lodash/maxBy';
import minBy from 'lodash/minBy';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SvgPendingSpin } from 'ui/assets';
import IconDropdown from 'ui/assets/signature-record/dropdown.svg';
import IconInfo from 'ui/assets/signature-record/info.svg';
import {
  fromNow,
  isSameAddress,
  sinceTime,
  timeago,
  useWallet,
} from 'ui/utils';
import { MempoolList } from './MempoolList';
import { findMaxGasTx } from '@/utils/tx';
import { TxRequest } from '@rabby-wallet/rabby-api/dist/types';
import { formatTimeFromNow } from '../../ApprovalManagePage/utils';

export const TransactionPendingTag = ({
  item,
  onReBroadcast,
  txRequests,
}: {
  item: TransactionGroup;
  onReBroadcast?(tx: TransactionHistoryItem): void;
  txRequests: Record<string, TxRequest>;
}) => {
  console.log(item);
  const { t } = useTranslation();
  const wallet = useWallet();
  const chain = Object.values(CHAINS).find((c) => c.id === item.chainId)!;
  const originTx = minBy(item.txs, (tx) => tx.createdAt)!;
  const maxGasTx = findMaxGasTx(item.txs)!;
  const completedTx = item.txs.find((tx) => tx.isCompleted);
  const isCompleted =
    !item.isPending || item.isSubmitFailed || maxGasTx.isWithdrawed;
  const isCanceled =
    !item.isPending &&
    item.txs.length > 1 &&
    isSameAddress(completedTx!.rawTx.from, completedTx!.rawTx.to);

  const isPending =
    item.isPending && !item.isSubmitFailed && !maxGasTx.isWithdrawed;

  if (isPending) {
    console.log('maxGasTx', maxGasTx);
  }

  if (!isPending) {
    return null;
  }

  if (maxGasTx.hash) {
    return (
      <Popover
        placement="bottom"
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

  const pushAt = maxGasTx?.reqId
    ? txRequests[maxGasTx.reqId]?.push_at
    : undefined;

  if (pushAt) {
    return (
      <div className="pending">
        <SvgPendingSpin className="icon icon-pending-spin" />
        {t('page.activities.signedTx.status.pendingBroadcast')}{' '}
        <TooltipWithMagnetArrow
          className="rectangle w-[max-content]"
          autoAdjustOverflow={false}
          placement="top"
          title={
            <>
              Broadcast failed. Last attempt: {sinceTime(pushAt)}{' '}
              <span
                className="cursor-pointer underline"
                onClick={() => {
                  onReBroadcast?.(maxGasTx);
                }}
              >
                Re-broadcast
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
        className="rectangle w-[max-content]"
        autoAdjustOverflow={false}
        placement="top"
        title={
          <>
            Gas-saving mode: waiting for lower network fees. Max 24h wait.{' '}
            <span
              className="cursor-pointer underline"
              onClick={() => {
                onReBroadcast?.(maxGasTx);
              }}
            >
              Broadcast now
            </span>
          </>
        }
      >
        <img src={IconInfo} alt="" />
      </TooltipWithMagnetArrow>
    </div>
  );
};
