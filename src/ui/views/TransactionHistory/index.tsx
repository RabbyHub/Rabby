import { Account } from '@/background/service/preference';
import { findChainByID } from '@/utils/chain';
import { TransactionGroup } from 'background/service/transactionHistory';
import interval from 'interval-promise';
import minBy from 'lodash/minBy';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Empty } from 'ui/component';
import { useWallet } from 'ui/utils';
import { TransactionItem } from './components/TransactionItem';
import './style.less';
import { useInterval } from 'ahooks';

const TransactionHistory = () => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const [_pendingList, setPendingList] = useState<TransactionGroup[]>([]);
  const [_completeList, setCompleteList] = useState<TransactionGroup[]>([]);

  const pendingList = useMemo(() => {
    return _pendingList.filter((item) => findChainByID(item?.chainId));
  }, [_pendingList]);

  const completeList = useMemo(() => {
    return _completeList.filter((item) => findChainByID(item?.chainId));
  }, [_completeList]);

  const init = async () => {
    const account = await wallet.syncGetCurrentAccount<Account>()!;
    const { pendings, completeds } = await wallet.getTransactionHistory(
      account.address
    );
    setPendingList(pendings);
    setCompleteList(completeds);
    console.log('loadList', pendings, completeds);
  };

  const loadList = async () => {
    const account = await wallet.syncGetCurrentAccount<Account>()!;
    const pendings = await wallet.loadPendingListQueue(account.address);
    setPendingList(pendings);

    const { completeds } = await wallet.getTransactionHistory(account.address);
    setCompleteList(completeds);
  };

  useInterval(() => {
    if (pendingList.length > 0) {
      loadList();
    }
  }, 5000);

  const handleTxComplete = () => {
    init();
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <div className="tx-history">
      {pendingList.length > 0 && (
        <div className="tx-history__pending">
          {pendingList.map((item) => (
            <TransactionItem
              item={item}
              key={`${item.chainId}-${item.nonce}`}
              canCancel={
                minBy(
                  pendingList.filter((i) => i.chainId === item.chainId),
                  (i) => i.nonce
                )?.nonce === item.nonce
              }
              onComplete={() => handleTxComplete()}
            />
          ))}
        </div>
      )}
      {completeList.length > 0 && (
        <div className="tx-history__completed">
          {completeList.map((item) => (
            <TransactionItem
              item={item}
              key={`${item.chainId}-${item.nonce}`}
              canCancel={false}
            />
          ))}
        </div>
      )}
      {completeList.length <= 0 && pendingList.length <= 0 && (
        <Empty
          title={t('page.activities.signedTx.empty.title')}
          desc={t('page.activities.signedTx.empty.desc')}
          className="pt-[108px]"
        ></Empty>
      )}
    </div>
  );
};

export default TransactionHistory;
