import React, { useEffect, useState } from 'react';
import { Button } from 'antd';
import clsx from 'clsx';
import Safe from '@rabby-wallet/gnosis-sdk';
import {
  SafeTransactionItem,
  SafeInfo,
} from '@rabby-wallet/gnosis-sdk/dist/api';
import { useTranslation, Trans } from 'react-i18next';
import dayjs from 'dayjs';
import { ExplainTxResponse } from 'background/service/openapi';
import { Account } from 'background/service/preference';
import { intToHex } from 'ethereumjs-util';
import { useWallet, timeago, isSameAddress } from 'ui/utils';
import { splitNumberByStep } from 'ui/utils/number';
import { PageHeader } from 'ui/component';
import { INTERNAL_REQUEST_ORIGIN } from 'consts';
import IconUnknown from 'ui/assets/icon-unknown.svg';
import IconUser from 'ui/assets/address-management.svg';
import './style.less';

interface TransactionConfirmationsProps {
  confirmations: SafeTransactionItem['confirmations'];
  threshold: number;
  owners: string[];
}

const TransactionConfirmations = ({
  confirmations,
  threshold,
  owners,
}: TransactionConfirmationsProps) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const [visibleAccounts, setVisibleAccounts] = useState<Account[]>([]);

  const init = async () => {
    const accounts = await wallet.getAllVisibleAccountsArray();
    setVisibleAccounts(accounts);
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <div className="tx-confirm">
      <div className="tx-confirm__head">
        {confirmations.length >= threshold ? (
          t('Enough signature collected')
        ) : (
          <>
            <span className="number">{threshold - confirmations.length}</span>{' '}
            more confirmation needed
          </>
        )}
      </div>
      <ul className="tx-confirm__list">
        {owners.map((owner) => (
          <li
            className={clsx({
              checked: confirmations.find((confirm) =>
                isSameAddress(confirm.owner, owner)
              ),
            })}
            key={owner}
          >
            {`${owner.toLowerCase().slice(0, 6)}...${owner
              .toLowerCase()
              .slice(-4)}`}
            {visibleAccounts.find((account) =>
              isSameAddress(account.address, owner)
            ) ? (
              <div className="tx-confirm__tag">You</div>
            ) : (
              <></>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

const TransactionExplain = ({
  explain,
  onView,
}: {
  explain: ExplainTxResponse;
  onView(): void;
}) => {
  const { t } = useTranslation();
  let icon: React.ReactNode = (
    <img className="icon icon-explain" src={IconUnknown} />
  );
  let content: string | React.ReactNode = t('Unknown Transaction');

  if (explain) {
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
  }

  return (
    <p className="tx-explain">
      {icon || <img className="icon icon-explain" src={IconUnknown} />}
      <span>{content || t('Unknown Transaction')}</span>
      <Button type="primary" className="tx-explain__view" onClick={onView}>
        {t('View')}
      </Button>
    </p>
  );
};

const GnosisTransactionItem = ({
  data,
  networkId,
  safeInfo,
}: {
  data: SafeTransactionItem;
  networkId: string;
  safeInfo: SafeInfo;
}) => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const [explain, setExplain] = useState<ExplainTxResponse | null>(null);
  const submitAt = dayjs(data.submissionDate).valueOf();
  const now = dayjs().valueOf();
  const ago = timeago(now, submitAt);
  let agoText = '';

  if (ago.hour <= 0 && ago.minute <= 0) {
    ago.minute = 1;
  }
  if (ago.hour < 24) {
    if (ago.hour > 0) {
      agoText += `${ago.hour} ${t('hour')}`;
    }
    if (ago.minute > 0) {
      if (agoText) agoText += ' ';
      agoText += `${ago.minute} ${t('min')}`;
    }
    agoText += ` ${t('ago')}`;
  } else {
    const date = dayjs(data.submissionDate);
    agoText = date.format('YYYY/MM/DD');
  }

  const init = async () => {
    const res = await wallet.openapi.explainTx(
      {
        chainId: Number(networkId),
        from: data.safe,
        to: data.to,
        data: data.data || '0x',
        value: `0x${Number(data.value).toString(16)}`,
        nonce: intToHex(data.nonce),
        gasPrice: '0x0',
        gas: '0x0',
      },
      INTERNAL_REQUEST_ORIGIN,
      data.safe
    );
    setExplain(res);
  };

  const handleView = () => {
    // TODO
  };

  const handleSubmit = () => {
    // TODO
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <div className="queue-item">
      <div className="queue-item__time">{agoText}</div>
      <div className="queue-item__info">
        {explain && (
          <TransactionExplain explain={explain} onView={handleView} />
        )}
      </div>
      <TransactionConfirmations
        confirmations={data.confirmations}
        threshold={safeInfo.threshold}
        owners={safeInfo.owners}
      />
      <div className="queue-item__footer">
        <Button
          type="primary"
          size="large"
          className="submit-btn"
          onClick={handleSubmit}
          disabled={data.confirmations.length < safeInfo.threshold}
        >
          {t('Submit transaction')}
        </Button>
      </div>
    </div>
  );
};

const GnosisTransactionQueue = () => {
  const wallet = useWallet();
  const [networkId, setNetworkId] = useState('1');
  const [safeInfo, setSafeInfo] = useState<SafeInfo | null>(null);
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<SafeTransactionItem[]>([]);

  const init = async () => {
    const account = await wallet.syncGetCurrentAccount();
    const network = await wallet.getGnosisNetworkId(account.address);
    const [info, txs] = await Promise.all([
      Safe.getSafeInfo(account.address, network),
      Safe.getPendingTransactions(account.address, network),
    ]);
    setSafeInfo(info);
    setNetworkId(network);
    setTransactions(txs.results);
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <div className="queue">
      <PageHeader>{t('Queue')}</PageHeader>
      {transactions.map(
        (transaction) =>
          safeInfo && (
            <GnosisTransactionItem
              data={transaction}
              networkId={networkId}
              safeInfo={safeInfo}
              key={transaction.safeTxHash}
            />
          )
      )}
    </div>
  );
};

export default GnosisTransactionQueue;
