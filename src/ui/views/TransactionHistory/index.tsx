import React, { useEffect, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import minBy from 'lodash/minBy';
import { useWallet } from 'ui/utils';
import { splitNumberByStep } from 'ui/utils/number';
import { PageHeader } from 'ui/component';
import {
  TransactionGroup,
  TransactionHistoryItem,
} from 'background/service/transactionHistory';
import { ExplainTxResponse } from 'background/service/openapi';
import { CHAINS } from 'consts';
import { SvgPendingSpin } from 'ui/assets';
import IconUser from 'ui/assets/address-management.svg';
import IconUnknown from 'ui/assets/icon-unknown.svg';
import IconCancel from 'ui/assets/cancel.svg';
import IconSpeedup from 'ui/assets/speedup.svg';
import './style.less';

const TransactionExplain = ({ explain }: { explain: ExplainTxResponse }) => {
  const { t } = useTranslation();
  let icon: React.ReactNode | null = null;
  let content: string | React.ReactNode = '';

  if (explain.type_cancel_token_approval) {
    icon = (
      <img
        src={
          explain.type_cancel_token_approval.spender_protocol_logo_url ||
          IconUnknown
        }
        className="icon icon-explain"
      />
    );
    content = (
      <Trans
        i18nKey="CancelExplain"
        values={{
          token: explain.type_cancel_token_approval.token_symbol,
          protocol:
            explain.type_cancel_token_approval.spender_protocol_name ||
            t('UnknownProtocol'),
        }}
      />
    );
  }
  if (explain.type_token_approval) {
    icon = (
      <img
        src={
          explain.type_token_approval.spender_protocol_logo_url || IconUnknown
        }
        className="icon icon-explain"
      />
    );
    content = (
      <Trans
        i18nKey="ApproveExplain"
        values={{
          token: explain.type_token_approval.token_symbol,
          count: explain.type_token_approval.is_infinity
            ? t('unlimited')
            : splitNumberByStep(explain.type_token_approval.token_amount),
          protocol:
            explain.type_token_approval.spender_protocol_name ||
            t('UnknownProtocol'),
        }}
      />
    );
  }
  if (explain.type_send) {
    icon = <img className="icon icon-explain" src={IconUser} />;
    content = `${t('Send')} ${splitNumberByStep(
      explain.type_send.token_amount
    )} ${explain.type_send.token_symbol}`;
  }
  if (explain.type_call) {
    icon = (
      <img
        src={explain.type_call.contract_protocol_logo_url || IconUnknown}
        className="icon icon-explain"
      />
    );
    content = explain.type_call.action;
  }

  return (
    <p className="tx-explain">
      {icon}
      {content}
    </p>
  );
};

const TransactionItem = ({ item }: { item: TransactionGroup }) => {
  const { t } = useTranslation();
  const chain = Object.values(CHAINS).find((c) => c.id === item.chainId)!;
  const originTx = minBy(item.txs, (tx) => tx.createdAt)!;

  const ChildrenTxText = ({ tx }: { tx: TransactionHistoryItem }) => {
    const isOrigin = tx.hash === originTx.hash;
    const isCancel = tx.rawTx.from === tx.rawTx.to;

    if (isOrigin) return <span className="tx-type">{t('Initial tx')}</span>;
    if (isCancel) return <span className="tx-type">{t('Cancel tx')}</span>;
    return <span className="tx-type">{t('Speed up tx')}</span>;
  };

  return (
    <div className="tx-history__item">
      <div className="tx-history__item--main">
        {item.isPending && (
          <div className="pending">
            <SvgPendingSpin className="icon icon-pending-spin" />
            {t('Pending')}
          </div>
        )}
        <div className="tx-id">
          <span>
            {chain.name} #{item.nonce}
          </span>
        </div>
        <TransactionExplain explain={item.explain} />
        {item.isPending ? (
          <div className="tx-footer">
            {item.txs.length > 1 ? (
              <div>Pending detail</div>
            ) : (
              <div className="ahead">
                <span className="text-yellow">148</span> tx ahead - 28 Gwei{' '}
              </div>
            )}
            <div className="tx-footer__actions">
              <img className="icon icon-action" src={IconSpeedup} />
              <div className="hr" />
              <img className="icon icon-action" src={IconCancel} />
            </div>
          </div>
        ) : (
          <div className="tx-footer">Gas: 0.01 ETH</div>
        )}
      </div>
      {item.txs.length > 1 && (
        <div className="tx-history__item--children">
          {item.txs.map((tx) => (
            <div className="tx-history__item--children__item">
              <ChildrenTxText tx={tx} />
              <div className="ahead">
                <span className="text-yellow">148</span> tx ahead -{' '}
                {Number(tx.rawTx.gasPrice) / 1e9} Gwei{' '}
              </div>
              <SvgPendingSpin className="icon icon-spin" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const TransactionHistory = () => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const { address } = wallet.syncGetCurrentAccount()!;
  const [pendingList, setPendingList] = useState<TransactionGroup[]>([]);
  const [completeList, setCompleteList] = useState<TransactionGroup[]>([]);

  const init = () => {
    const { pendings, completeds } = wallet.getTransactionHistory(address);
    setPendingList(pendings);
    setCompleteList(completeds);
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <div className="tx-history">
      <PageHeader>{t('History')}</PageHeader>
      <div className="tx-history__pending">
        {pendingList.map((item) => (
          <TransactionItem item={item} key={`${item.chainId}-${item.nonce}`} />
        ))}
      </div>
    </div>
  );
};

export default TransactionHistory;
