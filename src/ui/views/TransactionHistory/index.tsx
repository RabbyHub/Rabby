import React, { useEffect, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { intToHex } from 'ethereumjs-util';
import clsx from 'clsx';
import minBy from 'lodash/minBy';
import maxBy from 'lodash/maxBy';
import { Tooltip } from 'antd';
import styled from 'styled-components';
import { useWallet, isSameAddress } from 'ui/utils';
import { splitNumberByStep } from 'ui/utils/number';
import { sinceTime } from 'ui/utils';
import { openInTab } from 'ui/utils/webapi';
import { Empty } from 'ui/component';
import {
  TransactionGroup,
  TransactionHistoryItem,
} from 'background/service/transactionHistory';
import {
  ExplainTxResponse,
  TokenItem,
  GasLevel,
} from 'background/service/openapi';
import { ConnectedSite } from 'background/service/permission';
import { CHAINS, INTERNAL_REQUEST_ORIGIN } from 'consts';
import { SvgPendingSpin } from 'ui/assets';
import IconUser from 'ui/assets/address-management.svg';
import IconUnknown from 'ui/assets/icon-unknown.svg';
import IconCancel from 'ui/assets/cancel.svg';
import IconSpeedup from 'ui/assets/speedup.svg';
import IconQuestionMark from 'ui/assets/question-mark-black.svg';
import { SvgIconOpenExternal } from 'ui/assets';
import './style.less';
import { Account } from '@/background/service/preference';
import interval from 'interval-promise';
import { findChainByID } from '@/utils/chain';
import { getTokenSymbol } from '@/ui/utils/token';

const TransactionExplain = ({
  isFailed,
  isSubmitFailed,
  isCancel,
  explain,
  onOpenScan,
}: {
  isFailed: boolean;
  isSubmitFailed: boolean;
  isCancel: boolean;
  explain: ExplainTxResponse;
  onOpenScan(): void;
}) => {
  const { t } = useTranslation();
  let icon: React.ReactNode = (
    <img className="icon icon-explain" src={IconUnknown} />
  );
  let content: string | React.ReactNode = t(
    'page.activities.signedTx.explain.unknown'
  );
  if (explain) {
    if (explain.type_cancel_nft_collection_approval) {
      icon = (
        <img
          src={
            explain.type_cancel_nft_collection_approval
              .spender_protocol_logo_url || IconUnknown
          }
          className="icon icon-explain"
        />
      );
      content = (
        <Trans
          i18nKey="page.activities.signedTx.explain.cancelNFTCollectionApproval"
          values={{
            protocol:
              explain.type_cancel_nft_collection_approval
                .spender_protocol_name ||
              t('page.activities.signedTx.common.unknownProtocol'),
          }}
          t={t}
        />
      );
    } else if (explain.type_nft_collection_approval) {
      icon = (
        <img
          src={
            explain.type_nft_collection_approval.spender_protocol_logo_url ||
            IconUnknown
          }
          className="icon icon-explain"
        />
      );
      content = (
        <Trans
          i18nKey="page.activities.signedTx.explain.nftCollectionApproval"
          values={{
            protocol:
              explain.type_nft_collection_approval.spender_protocol_name ||
              t('page.activities.signedTx.common.unknownProtocol'),
          }}
          t={t}
        />
      );
    } else if (explain.type_cancel_single_nft_approval) {
      icon = (
        <img
          src={
            explain.type_cancel_single_nft_approval.spender_protocol_logo_url ||
            IconUnknown
          }
          className="icon icon-explain"
        />
      );
      content = (
        <Trans
          i18nKey="page.activities.signedTx.explain.cancelSingleNFTApproval"
          values={{
            protocol:
              explain.type_cancel_single_nft_approval.spender_protocol_name ||
              t('page.activities.signedTx.common.unknownProtocol'),
          }}
          t={t}
        />
      );
    } else if (explain.type_single_nft_approval) {
      icon = (
        <img
          src={
            explain.type_single_nft_approval.spender_protocol_logo_url ||
            IconUnknown
          }
          className="icon icon-explain"
        />
      );
      content = (
        <Trans
          i18nKey="page.activities.signedTx.explain.singleNFTApproval"
          values={{
            protocol:
              explain.type_single_nft_approval.spender_protocol_name ||
              t('page.activities.signedTx.common.unknownProtocol'),
          }}
          t={t}
        />
      );
    } else if (explain.type_nft_send) {
      icon = <img className="icon icon-explain" src={IconUser} />;
      content = `${t('page.activities.signedTx.explain.send', {
        amount: splitNumberByStep(explain.type_nft_send.token_amount),
        symbol: 'NFT',
      })}`;
    } else if (explain.type_cancel_token_approval) {
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
          i18nKey="page.activities.signedTx.explain.cancel"
          values={{
            token: explain.type_cancel_token_approval.token_symbol,
            protocol:
              explain.type_cancel_token_approval.spender_protocol_name ||
              t('page.activities.signedTx.common.unknownProtocol'),
          }}
          t={t}
        />
      );
    } else if (explain.type_token_approval) {
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
          i18nKey="page.activities.signedTx.explain.approve"
          values={{
            token: explain.type_token_approval.token_symbol,
            count: explain.type_token_approval.is_infinity
              ? t('page.activities.signedTx.common.unlimited')
              : splitNumberByStep(explain.type_token_approval.token_amount),
            protocol:
              explain.type_token_approval.spender_protocol_name ||
              t('page.activities.signedTx.common.unknownProtocol'),
          }}
          t={t}
        />
      );
    } else if (explain.type_send) {
      icon = <img className="icon icon-explain" src={IconUser} />;
      content = `${t('page.activities.signedTx.explain.send', {
        amount: splitNumberByStep(explain.type_send.token_amount),
        symbol: explain.type_send.token_symbol,
      })}`;
    } else if (explain.type_call) {
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
      <div className="flex flex-1 justify-between">
        <div className="flex flex-1 items-center tx-explain__text">
          <span>
            {content || t('page.activities.signedTx.explain.unknown')}
          </span>
          <SvgIconOpenExternal className="icon icon-external" />
        </div>
        <span className="text-red-light text-14 font-normal text-right">
          {isCancel && t('page.activities.signedTx.status.canceled')}
          {isFailed && t('page.activities.signedTx.status.failed')}
          {isSubmitFailed && t('page.activities.signedTx.status.submitFailed')}
        </span>
      </div>
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
    text = t('page.activities.signedTx.txType.initial');
  } else if (isCancel) {
    text = t('page.activities.signedTx.txType.cancel');
  } else {
    text = t('page.activities.signedTx.txType.speedUp');
  }
  return <span className="tx-type">{text}</span>;
};

const TransactionWebsiteWrapper = styled.a`
  font-weight: 400;
  font-size: 12px;
  line-height: 14px;
  color: #707280;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  &:hover {
    color: #707280;
    text-decoration: underline;
  }
`;

const TransactionWebsite = ({ site }: { site: ConnectedSite }) => {
  return site.origin === INTERNAL_REQUEST_ORIGIN ? (
    <span className="flex-1 whitespace-nowrap overflow-ellipsis overflow-hidden text-gray-light text-12">
      Rabby Wallet
    </span>
  ) : (
    <TransactionWebsiteWrapper
      href={site.origin}
      target="_blank"
      title={site.origin}
    >
      {site.origin}
    </TransactionWebsiteWrapper>
  );
};

const ChildrenWrapper = styled.div`
  padding: 2px;
  padding-top: 0;
`;

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
  const maxGasTx = maxBy(item.txs, (tx) =>
    Number(tx.rawTx.gasPrice || tx.rawTx.maxFeePerGas || 0)
  )!;
  const completedTx = item.txs.find((tx) => tx.isCompleted);
  const isCompleted = !item.isPending || item.isSubmitFailed;
  const isCanceled =
    !item.isPending &&
    item.txs.length > 1 &&
    isSameAddress(completedTx!.rawTx.from, completedTx!.rawTx.to);
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
      ? (Number(
          completedTx.rawTx.gasPrice || completedTx.rawTx.maxFeePerGas || 0
        ) *
          (completedTx.gasUsed || 0)) /
        1e18
      : 0;
  const gasUSDValue = gasTokenCount
    ? (item.explain.native_token.price * gasTokenCount).toFixed(2)
    : 0;
  const gasTokenSymbol = hasTokenPrice
    ? getTokenSymbol(item.explain.native_token)
    : '';

  const loadTxData = async () => {
    if (gasTokenCount) return;

    const results = await Promise.all(
      item.txs
        .filter((tx) => !tx.isSubmitFailed)
        .map((tx) =>
          wallet.openapi.getTx(
            chain.serverId,
            tx.hash,
            Number(tx.rawTx.gasPrice || tx.rawTx.maxFeePerGas || 0)
          )
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
                  (gas_used *
                    Number(
                      completedTx!.rawTx.gasPrice ||
                        completedTx!.rawTx.maxFeePerGas ||
                        0
                    )) /
                  1e18,
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
                  (completedTx!.gasUsed *
                    Number(
                      completedTx!.rawTx.gasPrice ||
                        completedTx!.rawTx.maxFeePerGas ||
                        0
                    )) /
                  1e18,
              },
            };
          }
        } else if (status !== 0 && code === 0) {
          // wallet.completedTransaction({
          //   address: item.txs[index].rawTx.from,
          //   chainId: Number(item.txs[index].rawTx.chainId),
          //   nonce: Number(item.txs[index].rawTx.nonce),
          //   hash: item.txs[index].hash,
          //   success: status === 1,
          //   gasUsed: gas_used,
          // });
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

  useEffect(() => {
    loadTxData();
  }, []);

  const handleClickCancel = async () => {
    if (!canCancel) return;
    const maxGasTx = maxBy(item.txs, (tx) =>
      Number(tx.rawTx.gasPrice || tx.rawTx.maxFeePerGas || 0)
    )!;
    const maxGasPrice = Number(
      maxGasTx.rawTx.gasPrice || maxGasTx.rawTx.maxFeePerGas || 0
    );
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
          isCancel: true,
        },
      ],
    });
    window.close();
  };

  const handleClickSpeedUp = async () => {
    if (!canCancel) return;
    const maxGasTx = maxBy(item.txs, (tx) =>
      Number(tx.rawTx.gasPrice || tx.rawTx.maxFeePerGas || 0)
    )!;
    const maxGasPrice = Number(
      maxGasTx.rawTx.gasPrice || maxGasTx.rawTx.maxFeePerGas || 0
    );
    const chainServerId = Object.values(CHAINS).find(
      (chain) => chain.id === item.chainId
    )!.serverId;
    const gasLevels: GasLevel[] = await wallet.openapi.gasMarket(chainServerId);
    const maxGasMarketPrice = maxBy(gasLevels, (level) => level.price)!.price;
    await wallet.sendRequest({
      method: 'eth_sendTransaction',
      params: [
        {
          from: originTx.rawTx.from,
          value: originTx.rawTx.value,
          data: originTx.rawTx.data,
          nonce: originTx.rawTx.nonce,
          chainId: originTx.rawTx.chainId,
          to: originTx.rawTx.to,
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
    if (completedTx?.isSubmitFailed) return;
    let hash = '';
    if (isCompleted) {
      hash = completedTx!.hash;
    } else {
      const maxGasTx = maxBy(item.txs, (tx) =>
        Number(tx.rawTx.gasPrice || tx.rawTx.maxFeePerGas || 0)
      )!;
      hash = maxGasTx.hash;
    }
    openInTab(chain.scanLink.replace(/_s_/, hash));
  };

  const isPending = item.isPending && !item.isSubmitFailed;

  return (
    <div
      className={clsx('tx-history__item', {
        'opacity-50': isCanceled || item.isFailed || item.isSubmitFailed,
      })}
    >
      <div className="tx-history__item--main">
        {isPending && (
          <div className="pending">
            <SvgPendingSpin className="icon icon-pending-spin" />
            {t('page.activities.signedTx.status.pending')}
          </div>
        )}
        <div className="tx-id">
          <span>{isPending ? null : sinceTime(item.createdAt / 1000)}</span>
          {!item.isSubmitFailed && (
            <span>
              {chain?.name} #{item.nonce}
            </span>
          )}
        </div>
        <div className="flex">
          <TransactionExplain
            isFailed={item.isFailed}
            isCancel={isCanceled}
            isSubmitFailed={!!item.isSubmitFailed}
            explain={item.explain}
            onOpenScan={handleOpenScan}
          />
          {isPending && (
            <div
              className={clsx('tx-footer__actions', {
                'opacity-40': !canCancel,
              })}
            >
              <Tooltip
                title={
                  canCancel
                    ? null
                    : t('page.activities.signedTx.tips.canNotCancel')
                }
                overlayClassName="rectangle cant-cancel__tooltip"
                placement="topRight"
                autoAdjustOverflow={false}
              >
                <div className="flex items-center">
                  <Tooltip
                    title={
                      canCancel
                        ? t('page.activities.signedTx.common.speedUp')
                        : null
                    }
                    overlayClassName="rectangle"
                  >
                    <img
                      className={clsx('icon icon-action', {
                        'cursor-not-allowed': !canCancel,
                      })}
                      src={IconSpeedup}
                      onClick={handleClickSpeedUp}
                    />
                  </Tooltip>
                  <div className="hr" />
                  <Tooltip
                    title={
                      canCancel
                        ? t('page.activities.signedTx.common.cancel')
                        : null
                    }
                    overlayClassName="rectangle"
                  >
                    <img
                      className={clsx('icon icon-action', {
                        'cursor-not-allowed': !canCancel,
                      })}
                      src={IconCancel}
                      onClick={handleClickCancel}
                    />
                  </Tooltip>
                </div>
              </Tooltip>
            </div>
          )}
        </div>
        {isPending ? (
          <div className="tx-footer">
            {originTx.site && <TransactionWebsite site={originTx.site} />}
            <div className="ahead">
              {txQueues[originTx.hash] ? (
                <>
                  {Number(
                    maxGasTx.rawTx.gasPrice || maxGasTx.rawTx.maxFeePerGas || 0
                  ) / 1e9}{' '}
                  Gwei{' '}
                </>
              ) : (
                t('page.activities.signedTx.common.unknown')
              )}
            </div>
          </div>
        ) : (
          <div className="tx-footer justify-between text-12">
            {item.isSubmitFailed ? (
              originTx.site && <TransactionWebsite site={originTx.site} />
            ) : (
              <>
                {completedTx?.site ? (
                  <TransactionWebsite site={completedTx.site} />
                ) : (
                  <span className="flex-1 whitespace-nowrap overflow-ellipsis overflow-hidden text-gray-light"></span>
                )}
                <span className="whitespace-nowrap overflow-ellipsis overflow-hidden text-gray-light text-right">
                  Gas:{' '}
                  {gasTokenCount
                    ? `${gasTokenCount.toFixed(
                        6
                      )} ${gasTokenSymbol} ($${gasUSDValue})`
                    : txQueues[completedTx!.hash]
                    ? txQueues[completedTx!.hash].tokenCount?.toFixed(8) +
                      ` ${getTokenSymbol(
                        txQueues[completedTx!.hash].token
                      )} ($${(
                        txQueues[completedTx!.hash].tokenCount! *
                        (txQueues[completedTx!.hash].token?.price || 1)
                      ).toFixed(2)})`
                    : t('page.activities.signedTx.common.unknown')}
                </span>
              </>
            )}
          </div>
        )}
      </div>
      {isPending && item.txs.length > 1 && (
        <ChildrenWrapper>
          <div className="tx-history__item--children">
            <div className="pending-detail">
              {t('page.activities.signedTx.common.pendingDetail')}
              <Tooltip
                title={t('page.activities.signedTx.tips.pendingDetail')}
                overlayClassName="rectangle pending-detail__tooltip"
                autoAdjustOverflow={false}
              >
                <img
                  className="icon icon-question-mark"
                  src={IconQuestionMark}
                />
              </Tooltip>
            </div>
            {item.txs
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((tx, index) => (
                <div
                  className={clsx('tx-history__item--children__item', {
                    'opacity-50': index >= 1,
                  })}
                >
                  <ChildrenTxText tx={tx} originTx={originTx} />
                  <div className="ahead">
                    {txQueues[tx.hash] ? (
                      <>
                        {Number(
                          tx.rawTx.gasPrice || tx.rawTx.maxFeePerGas || 0
                        ) / 1e9}{' '}
                        Gwei{' '}
                      </>
                    ) : (
                      t('page.activities.signedTx.common.unknown')
                    )}
                  </div>
                  <SvgPendingSpin className="icon icon-spin" />
                </div>
              ))}
          </div>
        </ChildrenWrapper>
      )}
    </div>
  );
};

const TransactionHistory = () => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const [pendingList, setPendingList] = useState<TransactionGroup[]>([]);
  const [completeList, setCompleteList] = useState<TransactionGroup[]>([]);

  const init = async () => {
    const account = await wallet.syncGetCurrentAccount<Account>()!;
    const { pendings, completeds } = await wallet.getTransactionHistory(
      account.address
    );
    setPendingList(pendings);
    setCompleteList(completeds);
  };

  const loadList = async () => {
    const account = await wallet.syncGetCurrentAccount<Account>()!;
    const pendings = await wallet.loadPendingListQueue(account.address);
    setPendingList(pendings);

    const { completeds } = await wallet.getTransactionHistory(account.address);
    setCompleteList(completeds);
  };

  useEffect(() => {
    let stoppedInterval = false;
    const stopInterval = () => {
      stoppedInterval = true;
    };

    interval(async (iteration, stop) => {
      if (stoppedInterval) {
        stop();
      }
      return loadList();
    }, 1000);

    return stopInterval;
  }, []);

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
          {pendingList.map((item) =>
            !findChainByID(item?.chainId) ? null : (
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
            )
          )}
        </div>
      )}
      {completeList.length > 0 && (
        <div className="tx-history__completed">
          {completeList.map((item) =>
            !findChainByID(item?.chainId) ? null : (
              <TransactionItem
                item={item}
                key={`${item.chainId}-${item.nonce}`}
                canCancel={false}
              />
            )
          )}
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
