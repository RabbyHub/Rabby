import { TransactionGroup } from '@/background/service/transactionHistory';
import IconArrowDown from '@/ui/assets/pending/icon-arrow-down-white.svg';
import IconSpin from '@/ui/assets/pending/icon-spin.svg';
import { sinceTime, sinceTimeWithSecs } from '@/ui/utils';
import { checkIsPendingTxGroup, findMaxGasTx } from '@/utils/tx';
import { TxRequest } from '@rabby-wallet/rabby-api/dist/types';
import { Button, Popover } from 'antd';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createGlobalStyle } from 'styled-components';
import { TxTimeline } from './TxTimeline';
import { useInterval } from 'ahooks';
import { useSinceTimeWithSecs } from '@/ui/hooks/useSinceTimeWithSecs';

const GlobalStyle = createGlobalStyle`
  .pending-detail-popover {
    padding-top: 3px;
    .ant-popover-arrow {
      display: none;
    }
    .ant-popover-inner {
      border-radius: 8px;
      border: 0.5px solid var(--r-neutral-line, rgba(255, 255, 255, 0.10));
      background: var(--r-neutral-bg-1, #3d4251);
      box-shadow: 0px 16px 40px 0px rgba(0, 0, 0, 0.20);      
    }
    .ant-popover-inner-content {
      padding: 0;
    }
  }
`;

export const TxStatus = ({
  txRequest,
  tx,
  onReBroadcast,
}: {
  txRequest?: TxRequest;
  tx: TransactionGroup;
  onReBroadcast?(): void;
}) => {
  const maxGasTx = findMaxGasTx(tx?.txs || []);
  const isPending = checkIsPendingTxGroup(tx);
  const isSubmitFailed = tx.isSubmitFailed;
  const isWithdrawed = !!maxGasTx?.isWithdrawed;
  const isBroadcasted = !!maxGasTx?.hash;

  const isSuccess = !isPending && !isSubmitFailed && !isWithdrawed;
  const { t } = useTranslation();

  const pushAt = useSinceTimeWithSecs(txRequest?.push_at);

  if (isSubmitFailed || isWithdrawed) {
    return null;
  }

  if (isSuccess) {
    return (
      <div className="p-[8px] h-[36px] border-rabby-neutral-bg-1 text-r-neutral-title-2 hover:border-[#fff] rounded-[4px] before:content-none z-10 flex items-center justify-center gap-2 border-[0.5px]">
        {t('page.pendingDetail.TxStatus.completed')}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-[8px]">
      <GlobalStyle />
      <Popover
        overlayClassName="pending-detail-popover"
        placement="bottomLeft"
        destroyTooltipOnHide
        content={txRequest ? <TxTimeline txRequest={txRequest} /> : null}
      >
        <div className="flex items-center gap-[4px] rounded-[4px] text-r-neutral-title-2 text-[13px] leading-[16px] font-medium bg-r-orange-default p-[8px]">
          <img src={IconSpin} className="animate-spin" />
          {isBroadcasted ? (
            <>
              {t('page.pendingDetail.TxStatus.pendingBroadcasted')} {pushAt}
            </>
          ) : (
            <>{t('page.pendingDetail.TxStatus.pendingBroadcast')}</>
          )}
          <img src={IconArrowDown} alt="" />
        </div>
      </Popover>
      <Button
        className="h-[36px] border-rabby-neutral-bg-1 text-r-neutral-title-2 hover:border-[#fff] rounded-[4px] before:content-none z-10 flex items-center justify-center gap-2 border-[0.5px]"
        ghost
        onClick={onReBroadcast}
      >
        {t('page.pendingDetail.TxStatus.reBroadcastBtn')}
      </Button>
    </div>
  );
};
