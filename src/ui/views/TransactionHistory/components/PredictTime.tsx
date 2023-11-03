import React, { useMemo } from 'react';
import styled from 'styled-components';
import IconArrowRight from '@/ui/assets/signature-record/icon-arrow-right.svg';
import { openInTab, openInternalPageInTab } from '@/ui/utils';
import { TransactionGroup } from '@/background/service/transactionHistory';
import { TxRequest } from '@rabby-wallet/rabby-api/dist/types';
import { checkIsPendingTxGroup, findMaxGasTx } from '@/utils/tx';
import { CHAINS } from '@debank/common';
import { check } from 'ts-toolbelt/out/Test';
import { useAccount } from '@/ui/store-hooks';

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 28px;
  padding: 7px 12px;
  border-radius: 0px 0px 6px 6px;
  background: var(--r-blue-light-1, #eef1ff);
  cursor: pointer;

  color: var(--r-blue-default, #7084ff);
  font-size: 12px;
  font-weight: 400;
  line-height: 14px;
`;

export const PredictTime = ({
  item,
  txRequests,
}: {
  item: TransactionGroup;
  txRequests: Record<string, TxRequest>;
}) => {
  const isPending = checkIsPendingTxGroup(item);
  const maxGasTx = findMaxGasTx(item.txs);
  const txRequest = txRequests[maxGasTx.reqId || ''];
  const [account] = useAccount();

  const leftTime = useMemo(() => {
    const leftTime = txRequest?.predict_packed_at
      ? Date.now() - txRequest?.predict_packed_at * 1000
      : 0;
    return leftTime > 0 ? leftTime : undefined;
  }, [txRequest?.predict_packed_at]);

  if (
    !isPending ||
    !maxGasTx.reqId ||
    !maxGasTx.hash ||
    item.chainId !== CHAINS.ETH.id
  ) {
    return null;
  }
  return (
    <Wrapper
      onClick={() => {
        openInternalPageInTab(
          `pending-detail?address=${account?.address}&chainId=${item.chainId}&nonce=${item.nonce}`
        );
      }}
    >
      {leftTime
        ? `Predicted to be packed in ${leftTime}s`
        : 'Packing time is being predicted'}
      <img src={IconArrowRight} alt="" />
    </Wrapper>
  );
};
