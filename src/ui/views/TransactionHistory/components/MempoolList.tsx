import { TransactionHistoryItem } from '@/background/service/transactionHistory';
import { getChain } from '@/utils';
import { CHAINS_LIST } from '@debank/common';
import { useRequest } from 'ahooks';
import BigNumber from 'bignumber.js';
import React from 'react';
import styled from 'styled-components';
import IconChecked from 'ui/assets/signature-record/checked.svg';
import { useWallet } from 'ui/utils';

const Wrapper = styled.div`
  min-width: 168px;
  .title {
    color: var(--r-neutral-title-1, #192945);
    font-size: 13px;
    font-weight: 500;
  }
  .btn {
    display: inline-flex;
    padding: 4px 16px;
    justify-content: center;
    align-items: center;
    gap: 10px;

    border-radius: 2px;
    background: var(--r-blue-light-1, #eef1ff);

    color: var(--r-blue-default, #7084ff);
    font-size: 13px;
    font-weight: 500;

    cursor: pointer;

    margin-top: 16px;
  }

  .mempool-list {
    margin-top: 14px;
  }

  .mempool-item {
    display: flex;
    align-items: center;
    gap: 6px;

    color: var(--r-green-default, #2abb7f);
    font-size: 13px;
    font-weight: 500;

    &:not(:last-child) {
      margin-bottom: 12px;
    }
  }
`;

export const MempoolList = ({
  tx,
  onReBroadcast,
}: {
  tx: TransactionHistoryItem;
  onReBroadcast?(): void;
}) => {
  const wallet = useWallet();
  const { data } = useRequest(
    async () => {
      if (!tx.hash) {
        return undefined;
      }
      const chain = CHAINS_LIST.find((item) =>
        new BigNumber(item.hex).isEqualTo(tx.rawTx.chainId)
      );
      if (!chain) {
        return undefined;
      }
      return wallet.openapi.mempoolChecks(tx.hash, chain?.serverId);
    },
    {
      refreshDeps: [tx.hash, tx.rawTx.chainId],
    }
  );

  const isEmpty = !data || !data.length;

  return (
    <Wrapper>
      {isEmpty ? (
        <>
          <div className="title">Not found in any node</div>
          {tx.reqId ? (
            <div
              className="btn"
              onClick={() => {
                onReBroadcast?.();
              }}
            >
              Re-broadcast
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="title">Found in the below memopools</div>
          <div className="mempool-list">
            {data?.map((item) => {
              return (
                <div className="mempool-item">
                  <img src={IconChecked} alt="" />
                  {item.rpc}
                </div>
              );
            })}
          </div>
          {tx.reqId ? (
            <div
              className="btn"
              onClick={() => {
                onReBroadcast?.();
              }}
            >
              Re-broadcast
            </div>
          ) : null}
        </>
      )}
    </Wrapper>
  );
};
