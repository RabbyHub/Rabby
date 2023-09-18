import React, { useEffect, useState } from 'react';
import { Button, message, Skeleton, Tabs, Tooltip } from 'antd';
import clsx from 'clsx';
import Safe, { BasicSafeInfo } from '@rabby-wallet/gnosis-sdk';
import {
  SafeTransactionItem,
  SafeInfo,
} from '@rabby-wallet/gnosis-sdk/dist/api';
import { useTranslation, Trans } from 'react-i18next';
import { toChecksumAddress, numberToHex } from 'web3-utils';
import dayjs from 'dayjs';
import { groupBy, sortBy } from 'lodash';
import { ExplainTxResponse } from 'background/service/openapi';
import { Account } from 'background/service/preference';

import { intToHex } from 'ethereumjs-util';
import { timeago, isSameAddress, useWallet } from 'ui/utils';
import {
  validateEOASign,
  validateETHSign,
  crossCompareOwners,
} from 'ui/utils/gnosis';
import { SafeTransactionDataPartial } from '@gnosis.pm/safe-core-sdk-types';
import { splitNumberByStep } from 'ui/utils/number';
import { PageHeader, NameAndAddress } from 'ui/component';
import AccountSelectDrawer from 'ui/component/AccountSelectDrawer';
import {
  CHAINS,
  CHAINS_ENUM,
  INTERNAL_REQUEST_ORIGIN,
  KEYRING_CLASS,
} from 'consts';
import IconUnknown from 'ui/assets/icon-unknown.svg';
import IconUser from 'ui/assets/address-management.svg';
import IconChecked from 'ui/assets/checked.svg';
import IconUnCheck from 'ui/assets/uncheck.svg';
import { SvgIconLoading } from 'ui/assets';
import IconTagYou from 'ui/assets/tag-you.svg';
import IconInformation from 'ui/assets/information.svg';
import './style.less';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { LoadingOutlined } from '@ant-design/icons';
import { useGnosisSafeInfo } from '@/ui/hooks/useGnosisSafeInfo';
import { useAccount } from '@/ui/store-hooks';
import { ReplacePopup } from './components/ReplacePopup';
import { useHistory } from 'react-router-dom';

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

const validateConfirmation = (
  txHash: string,
  signature: string,
  ownerAddress: string,
  type: string,
  version: string,
  safeAddress: string,
  tx: SafeTransactionDataPartial,
  networkId: number,
  owners: string[]
) => {
  if (!owners.find((owner) => isSameAddress(owner, ownerAddress))) return false;
  switch (type) {
    case 'EOA':
      try {
        return validateEOASign(
          signature,
          ownerAddress,
          tx,
          version,
          safeAddress,
          networkId
        );
      } catch (e) {
        return false;
      }
    case 'ETH_SIGN':
      try {
        return validateETHSign(signature, txHash, ownerAddress);
      } catch (e) {
        return false;
      }
    default:
      return false;
  }
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
            <NameAndAddress
              address={owner}
              className="text-13"
              nameClass="max-129 text-13"
              addressClass="text-13"
              noNameClass="no-name"
            />
            {visibleAccounts.find((account) =>
              isSameAddress(account.address, owner)
            ) ? (
              <img src={IconTagYou} className="icon-tag" />
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
  let content: string | React.ReactNode = t('page.safeQueue.unknownTx');

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
          i18nKey="page.safeQueue.cancelExplain"
          values={{
            token: explain.type_cancel_token_approval.token_symbol,
            protocol:
              explain.type_cancel_token_approval.spender_protocol_name ||
              t('page.safeQueue.unknownProtocol'),
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
          i18nKey="page.safeQueue.approvalExplain"
          values={{
            token: explain.type_token_approval.token_symbol,
            count: explain.type_token_approval.is_infinity
              ? t('page.safeQueue.unlimited')
              : splitNumberByStep(explain.type_token_approval.token_amount),
            protocol:
              explain.type_token_approval.spender_protocol_name ||
              t('page.safeQueue.unknownProtocol'),
          }}
        />
      );
    }
    if (explain.type_send) {
      icon = <img className="icon icon-explain" src={IconUser} />;
      content = `${t('page.safeQueue.action.send')} ${splitNumberByStep(
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
      <span>{content || t('page.safeQueue.unknownTx')}</span>
      <Button
        type="primary"
        className="tx-explain__view"
        onClick={onView}
        loading={isViewLoading}
      >
        {t('page.safeQueue.viewBtn')}
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
  safeInfo: BasicSafeInfo;
  onSubmit(data: SafeTransactionItem): void;
}) => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const [explain, setExplain] = useState<ExplainTxResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const submitAt = dayjs(data.submissionDate).valueOf();

  const [isShowReplacePopup, setIsShowReplacePopup] = useState(false);

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
    const res = await wallet.openapi.preExecTx({
      tx: {
        chainId: Number(networkId),
        from: data.safe,
        to: data.to,
        data: data.data || '0x',
        value: `0x${Number(data.value).toString(16)}`,
        nonce: intToHex(data.nonce),
        gasPrice: '0x0',
        gas: '0x0',
      },
      origin: INTERNAL_REQUEST_ORIGIN,
      address: data.safe,
      updateNonce: false,
      pending_tx_list: [],
    });
    setExplain(res);
  };

  const handleView = async () => {
    setIsLoading(true);
    const account = (await wallet.getCurrentAccount())!;
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
      params,
      safeInfo.version,
      networkId
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
      params: [
        {
          ...params,
          isViewGnosisSafe: true,
        },
      ],
    });
    window.close();
  };

  const history = useHistory();
  const handleReplace = async (type: string) => {
    if (type === 'send') {
      history.push({
        pathname: '/send-token',
        state: {
          safeInfo: {
            nonce: data.nonce,
            chainId: Number(networkId),
          },
        },
      });
    } else if (type === 'reject') {
      const params = {
        chainId: Number(networkId),
        from: toChecksumAddress(data.safe),
        to: toChecksumAddress(data.safe),
        data: '0x',
        value: `0x`,
        nonce: intToHex(data.nonce),
        safeTxGas: 0,
        gasPrice: '0',
        baseGas: 0,
      };
      wallet.sendRequest({
        method: 'eth_sendTransaction',
        params: [params],
      });
      window.close();
    }
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <>
      <div
        className={clsx('queue-item', {
          canExec:
            data.confirmations.length >= safeInfo.threshold &&
            data.nonce === safeInfo.nonce,
        })}
      >
        <div className="queue-item__time">
          <span>{agoText}</span>
          <span>
            {t('global.nonce')}: {data.nonce}
          </span>
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
                  i18nKey="page.safeQueue.LowerNonceError"
                  values={{ nonce: safeInfo.nonce }}
                />
              ) : null
            }
          >
            <div>
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
                {t('page.safeQueue.submitBtn')}
              </Button>
            </div>
          </Tooltip>
          <Button
            type="primary"
            size="large"
            ghost
            className="replace-btn"
            onClick={() => setIsShowReplacePopup(true)}
          >
            {t('page.safeQueue.replaceBtn')}
          </Button>
        </div>
      </div>
      <ReplacePopup
        visible={isShowReplacePopup}
        onClose={() => setIsShowReplacePopup(false)}
        onSelect={handleReplace}
      />
    </>
  );
};

/**
 * @description chain is expected always useful
 * @param props
 * @returns
 */
export const GnosisTransactionQueueList = (props: {
  usefulChain: CHAINS_ENUM;
  pendingTxs?: SafeTransactionItem[];
  loading?: boolean;
}) => {
  const { usefulChain: chain, pendingTxs, loading } = props;
  const networkId = CHAINS[chain].network;
  const wallet = useWallet();
  // const [safeInfo, setSafeInfo] = useState<SafeInfo | null>(null);
  const { t } = useTranslation();
  const [transactionsGroup, setTransactionsGroup] = useState<
    Record<string, SafeTransactionItem[]>
  >({});
  const [submitDrawerVisible, setSubmitDrawerVisible] = useState(false);
  const [
    submitTransaction,
    setSubmitTransaction,
  ] = useState<SafeTransactionItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadFaild, setIsLoadFaild] = useState(false);
  const [account] = useAccount();

  const { data: safeInfo, loading: isSafeInfoLoading } = useGnosisSafeInfo({
    address: account?.address,
    networkId,
  });

  const init = async (txs: SafeTransactionItem[], info: BasicSafeInfo) => {
    try {
      const account = (await wallet.syncGetCurrentAccount())!;

      const txHashValidation = await Promise.all(
        txs.map(async (safeTx) => {
          const tx: SafeTransactionDataPartial = {
            data: safeTx.data || '0x',
            gasPrice: safeTx.gasPrice ? Number(safeTx.gasPrice) : 0,
            gasToken: safeTx.gasToken,
            refundReceiver: safeTx.refundReceiver,
            to: safeTx.to,
            value: numberToHex(safeTx.value),
            safeTxGas: safeTx.safeTxGas,
            nonce: safeTx.nonce,
            operation: safeTx.operation,
            baseGas: safeTx.baseGas,
          };
          return wallet.validateGnosisTransaction(
            {
              account: account,
              tx,
              version: info.version,
              networkId,
            },
            safeTx.safeTxHash
          );
        })
      );

      setIsLoading(false);

      const transactions = txs
        .filter((safeTx, index) => {
          if (!txHashValidation[index]) return false;
          const tx: SafeTransactionDataPartial = {
            data: safeTx.data || '0x',
            gasPrice: safeTx.gasPrice ? Number(safeTx.gasPrice) : 0,
            gasToken: safeTx.gasToken,
            refundReceiver: safeTx.refundReceiver,
            to: safeTx.to,
            value: numberToHex(safeTx.value),
            safeTxGas: safeTx.safeTxGas,
            nonce: safeTx.nonce,
            operation: safeTx.operation,
            baseGas: safeTx.baseGas,
          };

          return safeTx.confirmations.every((confirm) =>
            validateConfirmation(
              safeTx.safeTxHash,
              confirm.signature,
              confirm.owner,
              confirm.signatureType,
              info.version,
              info.address,
              tx,
              Number(networkId),
              info.owners
            )
          );
        })
        .sort((a, b) => {
          return dayjs(a.submissionDate).isAfter(dayjs(b.submissionDate))
            ? -1
            : 1;
        });
      setTransactionsGroup(groupBy(transactions, 'nonce'));
    } catch (e) {
      console.error(e);
      setIsLoading(false);
      setIsLoadFaild(true);
    }
  };

  const handleSubmit = async (transaction: SafeTransactionItem) => {
    setSubmitTransaction(transaction);
    setSubmitDrawerVisible(true);
  };

  const handleConfirm = async (account: Account) => {
    if (!safeInfo) {
      return;
    }
    const currentAccount = (await wallet.getCurrentAccount())!;
    const data = submitTransaction;
    if (!data) return;
    try {
      setIsSubmitting(true);
      const params = {
        from: toChecksumAddress(data.safe),
        to: data.to,
        data: data.data || '0x',
        value: numberToHex(data.value),
        nonce: intToHex(data.nonce),
        safeTxGas: data.safeTxGas,
        gasPrice: Number(data.gasPrice),
        baseGas: data.baseGas,
      };
      await wallet.buildGnosisTransaction(
        currentAccount.address,
        account,
        params,
        safeInfo?.version,
        networkId
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
    if (pendingTxs && safeInfo) {
      init(pendingTxs || [], safeInfo);
    }
  }, [pendingTxs, safeInfo]);

  return (
    <div className="queue-list">
      {safeInfo && Object.keys(transactionsGroup).length > 0 ? (
        Object.keys(transactionsGroup).map((nonce) =>
          transactionsGroup[nonce].length > 1 ? (
            <div className="queue-group">
              <div className="queue-group__header">
                <img src={IconInformation} className="icon icon-information" />
                <span>{t('page.safeQueue.sameNonceWarning')}</span>
              </div>
              {transactionsGroup[nonce].map((transaction) => (
                <GnosisTransactionItem
                  data={transaction}
                  networkId={networkId}
                  safeInfo={safeInfo}
                  key={transaction.safeTxHash}
                  onSubmit={handleSubmit}
                />
              ))}
            </div>
          ) : (
            transactionsGroup[nonce].map((transaction) => (
              <GnosisTransactionItem
                data={transaction}
                networkId={networkId}
                safeInfo={safeInfo}
                key={transaction.safeTxHash}
                onSubmit={handleSubmit}
              />
            ))
          )
        )
      ) : (
        <div className="tx-history__empty">
          {isLoading || loading || isSafeInfoLoading ? (
            <>
              <LoadingOutlined className="text-24 text-gray-content" />
              <p className="text-14 text-gray-content mt-12">
                {t('page.safeQueue.loading')}
              </p>
            </>
          ) : isLoadFaild ? (
            <>
              <img
                className="load-faild"
                src="./images/gnosis-load-faild.png"
              />
              <p className="load-faild-desc">
                {t('page.safeQueue.loadingFaild')}
              </p>
            </>
          ) : (
            <>
              <img className="no-data" src="./images/nodata-tx.png" />
              <p className="text-14 text-gray-content mt-8">
                {t('page.safeQueue.noData')}
              </p>
            </>
          )}
        </div>
      )}

      <AccountSelectDrawer
        visible={submitDrawerVisible}
        onChange={handleConfirm}
        title={t('page.safeQueue.accountSelectTitle')}
        onCancel={handleCancel}
        isLoading={isSubmitting}
        networkId={networkId}
      />
    </div>
  );
};
