import React from 'react';
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
      {txRequest?.predict_packed_at
        ? `Predicted to be packed in ${txRequest?.predict_packed_at}s`
        : 'Packing time is being predicted'}
      <img src={IconArrowRight} alt="" />
    </Wrapper>
  );
};
