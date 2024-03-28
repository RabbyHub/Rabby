import { TransactionHistoryItem } from '@/background/service/transactionHistory';
import { CHAINS_LIST } from '@debank/common';
import { useRequest } from 'ahooks';
import { Spin } from 'antd';
import BigNumber from 'bignumber.js';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import IconChecked from 'ui/assets/signature-record/checked.svg';
import { useWallet } from 'ui/utils';
import IconCheck from '@/ui/assets/pending/icon-check-1.svg';
import IconClock from '@/ui/assets/pending/icon-clock.svg';
import iconSpin from '@/ui/assets/pending/icon-spin-1.svg';
import { findChain } from '@/utils/chain';

const Wrapper = styled.div`
  min-width: 168px;
  max-width: 240px;
  max-height: 200px;
  overflow: auto;
  padding: 16px;

  .title {
    color: var(--r-neutral-title-1, #192945);
    font-size: 13px;
    font-weight: 500;
  }
  .btn {
    display: inline-flex;
    padding: 3px 15px;
    justify-content: center;
    align-items: center;
    gap: 10px;

    border-radius: 2px;
    background: var(--r-blue-light-1, #eef1ff);

    color: var(--r-blue-default, #7084ff);
    font-size: 13px;
    font-weight: 500;
    border: 1px solid transparent;
    border: 0.5px solid transparent;

    &:hover,
    &:active {
      border: 1px solid var(--r-blue-default, #7084ff);
      border: 0.5px solid var(--r-blue-default, #7084ff);
      background: var(--r-blue-light-2, #dee3fc);
    }

    cursor: pointer;

    margin-top: 16px;
  }

  .mempool-footer {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: var(--r-neutral-bg-1);
    padding: 16px;
    border-radius: 0 0 8px 8px;

    .btn {
      margin-top: 0;
    }
  }

  .mempool-list {
    margin-top: 14px;
    margin-bottom: 40px;
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
  const { t } = useTranslation();
  const { data, loading } = useRequest(
    async () => {
      if (!tx.hash) {
        return undefined;
      }

      const chain = findChain({
        id: +tx.rawTx.chainId,
      });
      if (!chain) {
        return undefined;
      }
      return wallet.openapi.mempoolChecks(tx.hash, chain?.serverId, true);
    },
    {
      refreshDeps: [tx.hash, tx.rawTx.chainId],
    }
  );

  const list = useMemo(
    () => data?.filter((item) => item.check_success !== null) || [],
    [data]
  );
  const isEmpty = !list || !list.length;
  const appearedCount = useMemo(
    () => data?.filter((item) => item.check_success)?.length || 0,
    [data]
  );

  if (loading) {
    return (
      <Wrapper className="flex justify-center items-center">
        <Spin spinning></Spin>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      {isEmpty ? (
        <>
          <div className="title">
            {t('page.activities.signedTx.MempoolList.empty')}
          </div>
          {tx.reqId ? (
            <div
              className="btn"
              onClick={() => {
                onReBroadcast?.();
              }}
            >
              {t('page.activities.signedTx.MempoolList.reBroadcastBtn')}
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="title">
            {t('page.activities.signedTx.MempoolList.title', {
              count: appearedCount,
            })}
          </div>
          <div className="mempool-list">
            {list?.map((item, index) => {
              return (
                <div className="mempool-item" key={item.id + '-' + index}>
                  <div>
                    {item.check_success ? (
                      <div
                        className="flex items-center gap-[6px] font-medium text-r-blue-default break-all"
                        title={item.name || item.rpc}
                      >
                        <img src={IconCheck} alt="" />
                        {item.name || item.rpc}
                      </div>
                    ) : null}
                    {item.check_success === false ? (
                      <div
                        className="flex items-center gap-[6px] text-r-neutral-body break-all"
                        title={item.name || item.rpc}
                      >
                        <img src={IconClock} alt="" />
                        {item.name || item.rpc}
                      </div>
                    ) : null}
                    {item.check_success == null ? (
                      <div
                        className="flex items-center gap-[6px] text-r-neutral-foot break-all"
                        title={item.name || item.rpc}
                      >
                        <img src={iconSpin} alt="" className="animate-spin" />
                        {item.name || item.rpc}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          {tx.reqId ? (
            <div className="mempool-footer">
              <div
                className="btn"
                onClick={() => {
                  onReBroadcast?.();
                }}
              >
                {t('page.activities.signedTx.MempoolList.reBroadcastBtn')}
              </div>
            </div>
          ) : null}
        </>
      )}
    </Wrapper>
  );
};
