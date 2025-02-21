import { Account } from '@/background/service/preference';
import { findChainByID } from '@/utils/chain';
import { useRequest } from 'ahooks';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Empty } from 'ui/component';
import { useWallet } from 'ui/utils';
import { TransactionItem } from './components/TransactionItem';
import './style.less';

export const TestnetTransactionHistory = () => {
  const wallet = useWallet();
  const { t } = useTranslation();

  const { data: completeList, loading } = useRequest(async () => {
    const account = await wallet.syncGetCurrentAccount<Account>()!;
    const { completeds } = await wallet.getTransactionHistory(account.address);
    return completeds.filter((item) => findChainByID(item?.chainId)?.isTestnet);
  });

  if (loading) {
    return null;
  }

  return (
    <div className="tx-history h-full overflow-auto">
      {completeList?.length ? (
        <div className="tx-history__completed">
          {completeList.map((item) => (
            <TransactionItem
              txRequests={{}}
              item={item}
              key={`${item.chainId}-${item.nonce}`}
              canCancel={false}
            />
          ))}
        </div>
      ) : (
        <Empty
          title={t('page.transactions.empty.title')}
          className="pt-[108px]"
        ></Empty>
      )}
    </div>
  );
};
