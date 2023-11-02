import { TransactionGroup } from '@/background/service/transactionHistory';
import IconArrowDown from '@/ui/assets/pending/icon-arrow-down-white.svg';
import IconSpin from '@/ui/assets/pending/icon-spin.svg';
import { sinceTime } from '@/ui/utils';
import { checkIsPendingTxGroup, findMaxGasTx } from '@/utils/tx';
import { TxRequest } from '@rabby-wallet/rabby-api/dist/types';
import { Button, Popover } from 'antd';
import React from 'react';
import { createGlobalStyle } from 'styled-components';
import { TxTimeline } from './TxTimeline';

const GlobalStyle = createGlobalStyle`
  .pending-detail-popover {
    padding-top: 3px;
    .ant-popover-arrow {
      display: none;
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

  if (isSubmitFailed || isWithdrawed) {
    return null;
  }

  if (isSuccess) {
    return (
      <div className="p-[8px] h-[36px] border-r-neutral-bg-1 text-r-neutral-bg-1 hover:border-r-neutral-bg-1 rounded-[4px] before:content-none z-10 flex items-center justify-center gap-2 border-[0.5px]">
        Completed
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
              Pending: Broadcasted{' '}
              {txRequest?.push_at ? sinceTime(txRequest?.push_at) : null}
            </>
          ) : (
            <>Pending: To be broadcast</>
          )}
          <img src={IconArrowDown} alt="" />
        </div>
      </Popover>
      <Button
        className="h-[36px] border-r-neutral-bg-1 text-r-neutral-bg-1 hover:border-[#FFF] rounded-[4px] before:content-none z-10 flex items-center justify-center gap-2 border-[0.5px]"
        ghost
        onClick={onReBroadcast}
      >
        Re-broadcast
      </Button>
    </div>
  );
};
