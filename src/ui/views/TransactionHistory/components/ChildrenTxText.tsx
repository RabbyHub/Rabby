import { TransactionHistoryItem } from 'background/service/transactionHistory';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { isSameAddress } from 'ui/utils';

export const ChildrenTxText = ({
  tx,
  originTx,
}: {
  tx: TransactionHistoryItem;
  originTx: TransactionHistoryItem;
}) => {
  const isOrigin =
    (tx.hash && tx.hash === originTx.hash) ||
    (tx.reqId && tx.reqId === originTx.reqId);
  const isCancel = isSameAddress(tx.rawTx.from, tx.rawTx.to);
  const { t } = useTranslation();
  let text = '';

  if (isOrigin) {
    text = t('page.activities.signedTx.txType.initial');
  } else if (isCancel) {
    text = t('page.activities.signedTx.txType.cancel');
  } else {
    text = t('page.activities.signedTx.txType.speedUp');
  }
  return <span className="tx-type">{text}</span>;
};
