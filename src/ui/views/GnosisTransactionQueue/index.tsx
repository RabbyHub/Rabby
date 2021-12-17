import React, { useEffect, useState } from 'react';
import { Button, message, Skeleton, Tooltip } from 'antd';
import clsx from 'clsx';
import Safe from '@rabby-wallet/gnosis-sdk';
import {
  SafeTransactionItem,
  SafeInfo,
} from '@rabby-wallet/gnosis-sdk/dist/api';
import { useTranslation, Trans } from 'react-i18next';
import { toChecksumAddress } from 'web3-utils';
import dayjs from 'dayjs';
import { ExplainTxResponse } from 'background/service/openapi';
import { Account } from 'background/service/preference';
import { intToHex } from 'ethereumjs-util';
import { useWallet, timeago, isSameAddress } from 'ui/utils';
import { splitNumberByStep } from 'ui/utils/number';
import { PageHeader } from 'ui/component';
import AccountSelectDrawer from 'ui/component/AccountSelectDrawer';
import { INTERNAL_REQUEST_ORIGIN, KEYRING_CLASS } from 'consts';
import IconUnknown from 'ui/assets/icon-unknown.svg';
import IconUser from 'ui/assets/address-management.svg';
import IconChecked from 'ui/assets/checked.svg';
import IconUnCheck from 'ui/assets/uncheck.svg';
import IconLoading from 'ui/assets/loading-round.svg';
import './style.less';

interface TransactionConfirmationsProps {
  confirmations: SafeTransactionItem['confirmations'];
  threshold: number;
  owners: string[];
}

export type ConfirmationProps = {
  owner: string;
  type: string;
  hash: string;
  signature: string | null;
};

export const EMPTY_DATA = '0x';

export const getPreValidatedSignatures = (
  from: string,
  initialString: string = EMPTY_DATA
): string => {
  return `${initialString}000000000000000000000000${from.replace(
    EMPTY_DATA,
    ''
  )}000000000000000000000000000000000000000000000000000000000000000001`;
};

export const generateSignaturesFromTxConfirmations = (
  confirmations?: ConfirmationProps[]
): string => {
  let confirmationsMap = confirmations?.map((value) => {
    return {
      signature: value.signature,
      owner: value.owner.toLowerCase(),
    };
  });

  // The constant parts need to be sorted so that the recovered signers are sorted ascending
  // (natural order) by address (not checksummed).
  confirmationsMap = confirmationsMap!.sort((ownerA, ownerB) =>
    ownerA.owner.localeCompare(ownerB.owner)
  );

  let sigs = '0x';
  confirmationsMap.forEach(({ signature, owner }) => {
    if (signature) {
      sigs += signature.slice(2);
    } else {
      // https://docs.gnosis.io/safe/docs/contracts_signatures/#pre-validated-signatures
      sigs += getPreValidatedSignatures(owner, '');
    }
  });

  return sigs;
};

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
            <img
              src={
                confirmations.find((confirm) =>
                  isSameAddress(confirm.owner, owner)
                )
                  ? IconChecked
                  : IconUnCheck
              }
              className="icon icon-check"
            />
            <span title={owner}>
              {`${owner
                .toLowerCase()
                .slice(0, 6)}...${owner.toLowerCase().slice(-4)}`}
            </span>
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
  isViewLoading,
}: {
  explain: ExplainTxResponse;
  isViewLoading: boolean;
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
      <Button
        type="primary"
        className="tx-explain__view"
        onClick={onView}
        loading={isViewLoading}
      >
        {t('View')}
      </Button>
    </p>
  );
};

const GnosisTransactionItem = ({
  data,
  networkId,
  safeInfo,
  onSubmit,
}: {
  data: SafeTransactionItem;
  networkId: string;
  safeInfo: SafeInfo;
  onSubmit(data: SafeTransactionItem): void;
}) => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const [explain, setExplain] = useState<ExplainTxResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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

  const handleView = async () => {
    setIsLoading(true);
    const account = await wallet.getCurrentAccount();
    const params = {
      chainId: Number(networkId),
      from: toChecksumAddress(data.safe),
      to: data.to,
      data: data.data || '0x',
      value: `0x${Number(data.value).toString(16)}`,
      nonce: intToHex(data.nonce),
      safeTxGas: data.safeTxGas,
      gasPrice: Number(data.gasPrice),
      baseGas: data.baseGas,
    };
    const tmpBuildAccount: Account = {
      address: safeInfo.owners[0],
      type: KEYRING_CLASS.WATCH,
      brandName: KEYRING_CLASS.WATCH,
    };
    await wallet.buildGnosisTransaction(
      account.address,
      tmpBuildAccount,
      params
    );
    await wallet.setGnosisTransactionHash(data.safeTxHash);
    await Promise.all(
      data.confirmations.map((confirm) => {
        return wallet.gnosisAddPureSignature(confirm.owner, confirm.signature);
      })
    );
    setIsLoading(false);
    wallet.sendRequest({
      method: 'eth_sendTransaction',
      params: [params],
    });
    window.close();
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <div
      className={clsx('queue-item', {
        canExec:
          data.confirmations.length >= safeInfo.threshold &&
          data.nonce === safeInfo.nonce,
      })}
    >
      <div className="queue-item__time">
        <span>{agoText}</span>
        <span>nonce: {data.nonce}</span>
      </div>
      <div className="queue-item__info">
        {explain ? (
          <TransactionExplain
            explain={explain}
            onView={handleView}
            isViewLoading={isLoading}
          />
        ) : (
          <Skeleton.Button active style={{ width: 336, height: 25 }} />
        )}
      </div>
      <TransactionConfirmations
        confirmations={data.confirmations}
        threshold={safeInfo.threshold}
        owners={safeInfo.owners}
      />
      <div className="queue-item__footer">
        <Tooltip
          overlayClassName="rectangle"
          title={
            data.nonce !== safeInfo.nonce ? (
              <Trans
                i18nKey="GnosisLowerNonceNeedExcute"
                values={{ nonce: safeInfo.nonce }}
              />
            ) : null
          }
        >
          <Button
            type="primary"
            size="large"
            className="submit-btn"
            onClick={() => onSubmit(data)}
            disabled={
              data.confirmations.length < safeInfo.threshold ||
              data.nonce !== safeInfo.nonce
            }
          >
            {t('Submit transaction')}
          </Button>
        </Tooltip>
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
  const [submitDrawerVisible, setSubmitDrawerVisible] = useState(false);
  const [
    submitTransaction,
    setSubmitTransaction,
  ] = useState<SafeTransactionItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadFaild, setIsLoadFaild] = useState(false);

  const init = async () => {
    try {
      const account = await wallet.syncGetCurrentAccount();
      const network = await wallet.getGnosisNetworkId(account.address);
      const [info, txs] = await Promise.all([
        Safe.getSafeInfo(account.address, network),
        Safe.getPendingTransactions(account.address, network),
      ]);
      setIsLoading(false);
      setSafeInfo(info);
      setNetworkId(network);
      setTransactions(
        txs.results.sort((a, b) => {
          return dayjs(a.submissionDate).isAfter(dayjs(b.submissionDate))
            ? -1
            : 1;
        })
      );
    } catch (e) {
      setIsLoading(false);
      setIsLoadFaild(true);
    }
  };

  const handleSubmit = async (transaction: SafeTransactionItem) => {
    setSubmitTransaction(transaction);
    setSubmitDrawerVisible(true);
  };

  const handleConfirm = async (account: Account) => {
    const currentAccount = await wallet.getCurrentAccount();
    const data = submitTransaction;
    if (!data) return;
    try {
      setIsSubmitting(true);
      const params = {
        chainId: Number(networkId),
        from: toChecksumAddress(data.safe),
        to: data.to,
        data: data.data || '0x',
        value: `0x${Number(data.value).toString(16)}`,
        nonce: intToHex(data.nonce),
        safeTxGas: data.safeTxGas,
        gasPrice: Number(data.gasPrice),
        baseGas: data.baseGas,
      };
      await wallet.buildGnosisTransaction(
        currentAccount.address,
        account,
        params
      );
      await Promise.all(
        data.confirmations.map((confirm) => {
          return wallet.gnosisAddPureSignature(
            confirm.owner,
            confirm.signature
          );
        })
      );
      await wallet.execGnosisTransaction(account);
      setIsSubmitting(false);
    } catch (e) {
      message.error(e.message || JSON.stringify(e));
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSubmitDrawerVisible(false);
    setSubmitTransaction(null);
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <div className="queue">
      <PageHeader>{t('Queue')}</PageHeader>
      {transactions.length > 0 ? (
        transactions.map(
          (transaction) =>
            safeInfo && (
              <GnosisTransactionItem
                data={transaction}
                networkId={networkId}
                safeInfo={safeInfo}
                key={transaction.safeTxHash}
                onSubmit={handleSubmit}
              />
            )
        )
      ) : (
        <div className="tx-history__empty">
          {isLoading ? (
            <>
              <img className="icon icon-loading" src={IconLoading} />
              <p className="text-14 text-gray-content mt-24">
                {t('Loading data')}
              </p>
            </>
          ) : isLoadFaild ? (
            <>
              <img
                className="load-faild"
                src="./images/gnosis-load-faild.png"
              />
              <p className="load-faild-desc">
                {t('GnosisLoadFaildDescription')}
              </p>
            </>
          ) : (
            <>
              <img className="no-data" src="./images/nodata-tx.png" />
              <p className="text-14 text-gray-content mt-12">
                {t('No pending transactions')}
              </p>
            </>
          )}
        </div>
      )}
      <AccountSelectDrawer
        visible={submitDrawerVisible}
        onChange={handleConfirm}
        title={t('You can submit this transaction using any address')}
        onCancel={handleCancel}
        isLoading={isSubmitting}
      />
    </div>
  );
};

export default GnosisTransactionQueue;
