import { TransactionGroup } from '@/background/service/transactionHistory';
import IconArrowRight from '@/ui/assets/signature-record/icon-arrow-right.svg';
import { useAccount } from '@/ui/store-hooks';
import { openInternalPageInTab } from '@/ui/utils';
import { checkIsPendingTxGroup, findMaxGasTx } from '@/utils/tx';
import { CHAINS } from '@debank/common';
import { TxRequest } from '@rabby-wallet/rabby-api/dist/types';
import { useCountDown } from 'ahooks';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { usePredictTime } from '../../PendingDetail/components/Header/Predict';

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
  const { t } = useTranslation();

  const predictTime = usePredictTime(
    (txRequest?.predict_packed_at || 0) * 1000
  );

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
      {txRequest?.predict_err_code ? (
        t('page.activities.signedTx.PredictTime.failed')
      ) : (
        <>
          {!txRequest?.predict_packed_at
            ? t('page.activities.signedTx.PredictTime.noTime')
            : t('page.activities.signedTx.PredictTime.time', {
                time: `${
                  predictTime
                    ? `${predictTime?.hours}:${predictTime?.minutes}:${predictTime?.seconds}`
                    : ''
                }`,
              })}
        </>
      )}

      <img src={IconArrowRight} alt="" />
    </Wrapper>
  );
};
