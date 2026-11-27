import { TransactionHistoryItem } from '@/background/service/transactionHistory';
import { CHAINS_LIST } from '@debank/common';
import { useRequest } from 'ahooks';
import { Spin } from 'antd';
import BigNumber from 'bignumber.js';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import IconChecked from 'ui/assets/signature-record/checked.svg';
import { useWallet } from 'ui/utils';
import IconCheck from '@/ui/assets/pending/icon-check-1.svg';
import IconClock from '@/ui/assets/pending/icon-clock.svg';
import iconSpin from '@/ui/assets/pending/icon-spin-1.svg';
import clsx from 'clsx';
import { findChain } from '@/utils/chain';
import styles from './MempoolList.module.css';

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
      <div className={clsx(styles.wrapper, 'flex justify-center items-center')}>
        <Spin spinning></Spin>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
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
    </div>
  );
};
