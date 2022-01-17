import React, { useEffect, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useInterval } from 'react-use';
import { intToHex } from 'ethereumjs-util';
import clsx from 'clsx';
import minBy from 'lodash/minBy';
import maxBy from 'lodash/maxBy';
import padStart from 'lodash/padStart';
import { Tooltip } from 'antd';
import { useWallet, isSameAddress } from 'ui/utils';
import { splitNumberByStep } from 'ui/utils/number';
import { timeago } from 'ui/utils/time';
import { openInTab } from 'ui/utils/webapi';
import { PageHeader } from 'ui/component';
import { useConfirmExternalModal } from '../Dashboard/components';
import {
  TransactionGroup,
  TransactionHistoryItem,
} from 'background/service/transactionHistory';
import {
  ExplainTxResponse,
  TokenItem,
  GasLevel,
} from 'background/service/openapi';
import { CHAINS, MINIMUM_GAS_LIMIT } from 'consts';
import { SvgPendingSpin } from 'ui/assets';
import IconUser from 'ui/assets/address-management.svg';
import IconUnknown from 'ui/assets/icon-unknown.svg';
import IconCancel from 'ui/assets/cancel.svg';
import IconSpeedup from 'ui/assets/speedup.svg';
import IconQuestionMark from 'ui/assets/question-mark-black.svg';
import { SvgIconOpenExternal } from 'ui/assets';
import './style.less';

const TransactionExplain = ({
  explain,
  onOpenScan,
}: {
  explain: ExplainTxResponse;
  onOpenScan(): void;
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
    <p className="tx-explain" onClick={onOpenScan}>
      {icon || <img className="icon icon-explain" src={IconUnknown} />}
      <span>{content || t('Unknown Transaction')}</span>
      <SvgIconOpenExternal className="icon icon-external" />
    </p>
  );
};

const ChildrenTxText = ({
  tx,
  originTx,
}: {
  tx: TransactionHistoryItem;
  originTx: TransactionHistoryItem;
}) => {
  const isOrigin = tx.hash === originTx.hash;
  const isCancel = isSameAddress(tx.rawTx.from, tx.rawTx.to);
  const { t } = useTranslation();
  let text = '';

  if (isOrigin) {
    text = t('Initial tx');
  } else if (isCancel) {
    text = t('Cancel tx');
  } else {
    text = t('Speed up tx');
  }
  return <span className="tx-type">{text}</span>;
};

const TransactionItem = ({
  item,
  canCancel,
  onComplete,
}: {
  item: TransactionGroup;
  canCancel: boolean;
  onComplete?(): void;
}) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const chain = Object.values(CHAINS).find((c) => c.id === item.chainId)!;
  const originTx = minBy(item.txs, (tx) => tx.createdAt)!;
  const completedTx = item.txs.find((tx) => tx.isCompleted);
  const isCompleted = !item.isPending;
  const intervalDelay = item.isPending ? 1000 : null;
  const isCanceled =
    !item.isPending &&
    item.txs.length > 1 &&
    isSameAddress(completedTx!.rawTx.from, completedTx!.rawTx.to);
  const ago = timeago(item.createdAt, Date.now());
  const [txQueues, setTxQueues] = useState<
    Record<
      string,
      {
        frontTx?: number;
        gasUsed?: number;
        token?: TokenItem;
        tokenCount?: number;
      }
    >
  >({});
  const hasTokenPrice = !!item.explain?.native_token;
  const gasTokenCount =
    hasTokenPrice && completedTx
      ? (Number(completedTx.rawTx.gasPrice) * (completedTx.gasUsed || 0)) / 1e18
      : 0;
  const gasUSDValue = gasTokenCount
    ? (item.explain.native_token.price * gasTokenCount).toFixed(2)
    : 0;
  const gasTokenSymbol = hasTokenPrice ? item.explain.native_token.symbol : '';
  let agoText = '';

  const loadTxData = async () => {
    if (gasTokenCount) return;

    const results = await Promise.all(
      item.txs.map((tx) =>
        wallet.openapi.getTx(chain.serverId, tx.hash, Number(tx.rawTx.gasPrice))
      )
    );
    let map = {};
    results.forEach(
      ({ code, status, front_tx_count, gas_used, token }, index) => {
        if (isCompleted) {
          if (!completedTx!.gasUsed) {
            map = {
              ...map,
              [item.txs[index].hash]: {
                token,
                tokenCount:
                  (gas_used * Number(completedTx!.rawTx.gasPrice)) / 1e18,
                gasUsed: gas_used,
              },
            };
          } else if (code === 0) {
            map = {
              ...map,
              [item.txs[index].hash]: {
                token,
                gasUsed: completedTx!.gasUsed,
                tokenCount:
                  (completedTx!.gasUsed * Number(completedTx!.rawTx.gasPrice)) /
                  1e18,
              },
            };
          }
        } else if (status !== 0 && code === 0) {
          wallet.comepleteTransaction({
            address: item.txs[index].rawTx.from,
            chainId: Number(item.txs[index].rawTx.chainId),
            nonce: Number(item.txs[index].rawTx.nonce),
            hash: item.txs[index].hash,
            success: status === 1,
            gasUsed: gas_used,
          });
        } else {
          map = {
            ...map,
            [item.txs[index].hash]: {
              frontTx: front_tx_count,
            },
          };
        }
      }
    );
    if (!isCompleted && results.some((i) => i.status !== 0 && i.code === 0)) {
      onComplete && onComplete();
    } else {
      setTxQueues(map);
    }
  };

  if (item.isPending) {
    useInterval(() => {
      loadTxData();
    }, intervalDelay);
  }

  useEffect(() => {
    loadTxData();
  }, []);

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
    const date = new Date(item.createdAt);
    agoText = `${date.getMonth() + 1}/${padStart(
      date.getDate().toString(),
      2,
      '0'
    )} ${padStart(date.getHours().toString(), 2, '0')}:${padStart(
      date.getMinutes().toString(),
      2,
      '0'
    )}`;
  }

  const handleClickCancel = async () => {
    if (!canCancel) return;
    const maxGasTx = maxBy(item.txs, (tx) => Number(tx.rawTx.gasPrice))!;
    const maxGasPrice = Number(maxGasTx.rawTx.gasPrice);
    const chainServerId = Object.values(CHAINS).find(
      (chain) => chain.id === item.chainId
    )!.serverId;
    const gasLevels: GasLevel[] = await wallet.openapi.gasMarket(chainServerId);
    const maxGasMarketPrice = maxBy(gasLevels, (level) => level.price)!.price;
    await wallet.sendRequest({
      method: 'eth_sendTransaction',
      params: [
        {
          from: maxGasTx.rawTx.from,
          to: maxGasTx.rawTx.from,
          gasPrice: intToHex(Math.max(maxGasPrice * 2, maxGasMarketPrice)),
          value: '0x0',
          chainId: item.chainId,
          nonce: intToHex(item.nonce),
          gas: intToHex(MINIMUM_GAS_LIMIT),
          isCancel: true,
        },
      ],
    });
    window.close();
  };

  const handleClickSpeedUp = async () => {
    if (!canCancel) return;
    const maxGasTx = maxBy(item.txs, (tx) => Number(tx.rawTx.gasPrice))!;
    const maxGasPrice = Number(maxGasTx.rawTx.gasPrice);
    const chainServerId = Object.values(CHAINS).find(
      (chain) => chain.id === item.chainId
    )!.serverId;
    const gasLevels: GasLevel[] = await wallet.openapi.gasMarket(chainServerId);
    const maxGasMarketPrice = maxBy(gasLevels, (level) => level.price)!.price;
    await wallet.sendRequest({
      method: 'eth_sendTransaction',
      params: [
        {
          ...originTx.rawTx,
          gasPrice: intToHex(
            Math.round(Math.max(maxGasPrice * 2, maxGasMarketPrice))
          ),
          isSpeedUp: true,
        },
      ],
    });
    window.close();
  };

  const handleOpenScan = () => {
    let hash = '';
    if (isCompleted) {
      hash = completedTx!.hash;
    } else {
      const maxGasTx = maxBy(item.txs, (tx) => Number(tx.rawTx.gasPrice))!;
      hash = maxGasTx.hash;
    }
    openInTab(chain.scanLink.replace(/_s_/, hash));
  };

  return (
    <div
      className={clsx('tx-history__item', {
        'opacity-50': isCanceled || item.isFailed,
      })}
    >
      <div className="tx-history__item--main">
        {item.isPending && (
          <div className="pending">
            <SvgPendingSpin className="icon icon-pending-spin" />
            {t('Pending')}
          </div>
        )}
        <div className="tx-id">
          <span>{item.isPending ? null : agoText}</span>
          <span>
            {chain.name} #{item.nonce}
          </span>
        </div>
        <TransactionExplain
          explain={item.explain}
          onOpenScan={handleOpenScan}
        />
        {item.isPending ? (
          <div className="tx-footer">
            {item.txs.length > 1 ? (
              <div className="pending-detail">
                {t('Pending detail')}
                <Tooltip
                  title={t('PendingDetailTip')}
                  overlayClassName="rectangle pending-detail__tooltip"
                  autoAdjustOverflow={false}
                >
                  <img
                    className="icon icon-question-mark"
                    src={IconQuestionMark}
                  />
                </Tooltip>
              </div>
            ) : (
              <div className="ahead">
                {txQueues[originTx.hash] ? (
                  <>{Number(originTx.rawTx.gasPrice) / 1e9} Gwei </>
                ) : (
                  t('Unknown')
                )}
              </div>
            )}
            <div
              className={clsx('tx-footer__actions', {
                'opacity-40': !canCancel,
              })}
            >
              <Tooltip
                title={canCancel ? null : t('CanNotCancelTip')}
                overlayClassName="rectangle cant-cancel__tooltip"
                placement="topRight"
                autoAdjustOverflow={false}
              >
                <div className="flex items-center">
                  <img
                    className={clsx('icon icon-action', {
                      'cursor-not-allowed': !canCancel,
                    })}
                    src={IconSpeedup}
                    onClick={handleClickSpeedUp}
                  />
                  <div className="hr" />
                  <img
                    className={clsx('icon icon-action', {
                      'cursor-not-allowed': !canCancel,
                    })}
                    src={IconCancel}
                    onClick={handleClickCancel}
                  />
                </div>
              </Tooltip>
            </div>
          </div>
        ) : (
          <div className="tx-footer justify-between text-12">
            <span className="flex-1 whitespace-nowrap overflow-ellipsis overflow-hidden text-gray-light">
              Gas:{' '}
              {gasTokenCount
                ? `${gasTokenCount.toFixed(
                    8
                  )} ${gasTokenSymbol} ($${gasUSDValue})`
                : txQueues[completedTx!.hash]
                ? txQueues[completedTx!.hash].tokenCount?.toFixed(8) +
                  ` ${txQueues[completedTx!.hash].token?.symbol} ($${(
                    txQueues[completedTx!.hash].tokenCount! *
                    (txQueues[completedTx!.hash].token?.price || 1)
                  ).toFixed(2)})`
                : t('Unknown')}
            </span>
            <span className="text-red-light">
              {isCanceled && t('Canceled')}
              {item.isFailed && t('Failed')}
            </span>
          </div>
        )}
      </div>
      {item.isPending && item.txs.length > 1 && (
        <div className="tx-history__item--children">
          {item.txs
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((tx, index) => (
              <div
                className={clsx('tx-history__item--children__item', {
                  'opacity-50': index === 1,
                  'opacity-30': index > 1,
                })}
              >
                <ChildrenTxText tx={tx} originTx={originTx} />
                <div className="ahead">
                  {txQueues[tx.hash] ? (
                    <>{Number(tx.rawTx.gasPrice) / 1e9} Gwei </>
                  ) : (
                    t('Unknown')
                  )}
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
  const [address, setAddress] = useState<string | null>(null);
  const [pendingList, setPendingList] = useState<TransactionGroup[]>([]);
  const [completeList, setCompleteList] = useState<TransactionGroup[]>([]);
  const _openInTab = useConfirmExternalModal();

  const init = async () => {
    const account = await wallet.syncGetCurrentAccount()!;
    setAddress(account.address);
    const { pendings, completeds } = await wallet.getTransactionHistory(
      account.address
    );
    setPendingList(pendings);
    setCompleteList(completeds);
  };

  const handleTxComplete = () => {
    init();
  };

  useEffect(() => {
    init();
  }, []);
  return (
    <div className="tx-history">
      <PageHeader fixed>{t('Signed Tx')}</PageHeader>
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
          <p className="subtitle">{t('Completed transactions')}</p>
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
        <div className="tx-history__empty">
          <img className="no-data" src="./images/nodata-tx.png" />
          <p className="text-14 text-gray-content mt-12">{t('No signed Tx')}</p>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
