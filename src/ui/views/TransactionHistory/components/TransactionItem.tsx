import { getTokenSymbol } from '@/ui/utils/token';
import { Tooltip, message } from 'antd';
import { GasLevel, TokenItem, TxRequest } from 'background/service/openapi';
import {
  TransactionGroup,
  TransactionHistoryItem,
} from 'background/service/transactionHistory';
import clsx from 'clsx';
import { CANCEL_TX_TYPE, CHAINS } from 'consts';
import { intToHex } from 'ethereumjs-util';
import maxBy from 'lodash/maxBy';
import minBy from 'lodash/minBy';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { SvgPendingSpin } from 'ui/assets';
import { ReactComponent as RcIconCancel } from 'ui/assets/cancel.svg';
import IconQuestionMark from 'ui/assets/question-mark-black.svg';
import { ReactComponent as RcIconSpeedup } from 'ui/assets/speedup.svg';
import { isSameAddress, sinceTime, useWallet } from 'ui/utils';
import { openInTab } from 'ui/utils/webapi';
import { ChildrenTxText } from './ChildrenTxText';
import { TransactionExplain } from './TransactionExplain';
import { TransactionWebsite } from './TransactionWebsite';
import { CancelTxPopup } from './CancelTxPopup';
import { TransactionPendingTag } from './TransactionPendingTag';
import { checkIsPendingTxGroup, findMaxGasTx } from '@/utils/tx';
import { useGetTx, useLoadTxData } from '../hooks';
import { PredictTime } from './PredictTime';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { findChain } from '@/utils/chain';
import { getTxScanLink } from '@/utils';

const ChildrenWrapper = styled.div`
  padding: 2px;
  padding-top: 0;
`;

export const TransactionItem = ({
  item,
  canCancel,
  onComplete,
  onQuickCancel,
  onRetry,
  txRequests,
}: {
  item: TransactionGroup;
  canCancel: boolean;
  onComplete?(): void;
  txRequests: Record<string, TxRequest>;
  onQuickCancel?(): void;
  onRetry?(): void;
}) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const [isShowCancelPopup, setIsShowCancelPopup] = useState(false);
  const chain = findChain({
    id: item.chainId,
  });
  const originTx = minBy(item.txs, (tx) => tx.createdAt)!;
  const maxGasTx = findMaxGasTx(item.txs);
  const completedTx = item.txs.find(
    (tx) => tx.isCompleted && !tx.isSubmitFailed && !tx.isWithdrawed
  );

  const isCanceled =
    !item.isPending &&
    item.txs.length > 1 &&
    isSameAddress(completedTx!.rawTx.from, completedTx!.rawTx.to);

  const {
    txQueues,
    gasTokenCount,
    gasTokenSymbol,
    gasUSDValue,
  } = useLoadTxData(item);

  const handleClickCancel = () => {
    setIsShowCancelPopup(true);
  };

  const handleCancelTx = (mode: CANCEL_TX_TYPE) => {
    if (mode === CANCEL_TX_TYPE.QUICK_CANCEL) {
      handleQuickCancel();
    }
    if (mode === CANCEL_TX_TYPE.ON_CHAIN_CANCEL) {
      handleOnChainCancel();
    }
    setIsShowCancelPopup(false);
  };
  const handleQuickCancel = async () => {
    const maxGasTx = findMaxGasTx(item.txs);
    if (maxGasTx?.reqId) {
      try {
        await wallet.quickCancelTx({
          reqId: maxGasTx.reqId,
          chainId: maxGasTx.rawTx.chainId,
          nonce: +maxGasTx.rawTx.nonce,
          address: maxGasTx.rawTx.from,
        });
        onQuickCancel?.();
        message.success(t('page.activities.signedTx.message.cancelSuccess'));
      } catch (e) {
        message.error(e.message);
      }
    }
  };

  const handleReBroadcast = async (tx: TransactionHistoryItem) => {
    if (!tx.reqId) {
      message.error('Can not re-broadcast');
      return;
    }

    const isReBroadcast = !!tx.hash;
    if (isReBroadcast) {
      // fake toast for re-broadcast, not wait for tx push
      message.success(t('page.activities.signedTx.message.reBroadcastSuccess'));
      wallet.retryPushTx({
        reqId: tx.reqId,
        chainId: tx.rawTx.chainId,
        nonce: +tx.rawTx.nonce,
        address: tx.rawTx.from,
      });
      return;
    }
    try {
      await wallet.retryPushTx({
        reqId: tx.reqId,
        chainId: tx.rawTx.chainId,
        nonce: +tx.rawTx.nonce,
        address: tx.rawTx.from,
      });
      message.success(t('page.activities.signedTx.message.broadcastSuccess'));
    } catch (e) {
      console.error(e);
      message.error(e.message);
    }
  };
  const handleOnChainCancel = async () => {
    if (!canCancel) return;
    const maxGasTx = findMaxGasTx(item.txs)!;
    const maxGasPrice = Number(
      maxGasTx.rawTx.gasPrice || maxGasTx.rawTx.maxFeePerGas || 0
    );

    const chain = findChain({
      id: item.chainId,
    });
    if (!chain) {
      throw new Error('chainServerId not found');
    }
    const gasLevels: GasLevel[] = chain.isTestnet
      ? await wallet.getCustomTestnetGasMarket({
          chainId: chain.id,
        })
      : await wallet.openapi.gasMarket(chain.serverId);
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
          reqId: maxGasTx.reqId,
        },
      ],
    });
    window.close();
  };

  const handleClickSpeedUp = async () => {
    if (!canCancel) return;
    const maxGasTx = findMaxGasTx(item.txs);
    const maxGasPrice = Number(
      maxGasTx.rawTx.gasPrice || maxGasTx.rawTx.maxFeePerGas || 0
    );

    const chain = findChain({
      id: item.chainId,
    });
    if (!chain) {
      throw new Error('chainServerId not found');
    }
    const gasLevels: GasLevel[] = chain.isTestnet
      ? await wallet.getCustomTestnetGasMarket({
          chainId: chain.id,
        })
      : await wallet.openapi.gasMarket(chain.serverId);
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
          reqId: maxGasTx.reqId,
        },
      ],
    });
    window.close();
  };

  const handleOpenScan = () => {
    let hash: string | undefined = '';
    if (completedTx) {
      hash = completedTx!.hash;
    } else {
      const maxGasTx = findMaxGasTx(item.txs)!;
      console.log(maxGasTx);
      hash = maxGasTx.hash;
    }
    if (!hash) {
      return;
    }
    if (chain) {
      openInTab(getTxScanLink(chain.scanLink, hash));
    }
  };

  const isPending = checkIsPendingTxGroup(item);

  return (
    <div
      className={clsx('tx-history__item', {
        'opacity-50':
          isCanceled ||
          item.isFailed ||
          item.isSubmitFailed ||
          maxGasTx.isWithdrawed,
      })}
    >
      <div className="tx-history__item--main">
        <TransactionPendingTag
          item={item}
          onReBroadcast={handleReBroadcast}
          txRequests={txRequests}
        />
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
            isWithdrawed={!!maxGasTx?.isWithdrawed}
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
                    <ThemeIcon
                      className={clsx('icon icon-action', {
                        'cursor-not-allowed': !canCancel,
                      })}
                      src={RcIconSpeedup}
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
                    <ThemeIcon
                      className={clsx('icon icon-action', {
                        'cursor-not-allowed': !canCancel,
                      })}
                      src={RcIconCancel}
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
              {/* {txQueues[originTx.hash!] ? (
                <>
                  {Number(
                    maxGasTx.rawTx.gasPrice || maxGasTx.rawTx.maxFeePerGas || 0
                  ) / 1e9}{' '}
                  Gwei{' '}
                </>
              ) : (
                t('page.activities.signedTx.common.unknown')
              )} */}
              <>
                {Number(
                  maxGasTx.rawTx.gasPrice || maxGasTx.rawTx.maxFeePerGas || 0
                ) / 1e9}{' '}
                Gwei{' '}
              </>
            </div>
          </div>
        ) : (
          <div className="tx-footer justify-between text-12">
            {item.isSubmitFailed || maxGasTx.isWithdrawed ? (
              <>
                {originTx.site && <TransactionWebsite site={originTx.site} />}
                <span className="whitespace-nowrap overflow-ellipsis overflow-hidden text-r-neutral-foot text-right">
                  No Gas cost
                </span>
              </>
            ) : (
              <>
                {completedTx?.site ? (
                  <TransactionWebsite site={completedTx.site} />
                ) : (
                  <span className="flex-1 whitespace-nowrap overflow-ellipsis overflow-hidden text-r-neutral-foot"></span>
                )}
                <span className="whitespace-nowrap overflow-ellipsis overflow-hidden text-r-neutral-foot text-right">
                  Gas:{' '}
                  {gasTokenCount
                    ? `${gasTokenCount.toFixed(
                        6
                      )} ${gasTokenSymbol} ($${gasUSDValue})`
                    : txQueues[completedTx!.hash!]
                    ? txQueues[completedTx!.hash!].tokenCount?.toFixed(8) +
                      ` ${getTokenSymbol(
                        txQueues[completedTx!.hash!].token
                      )} ($${(
                        txQueues[completedTx!.hash!].tokenCount! *
                        (txQueues[completedTx!.hash!].token?.price || 1)
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
                  key={tx.hash || tx.reqId || index}
                >
                  <ChildrenTxText tx={tx} originTx={originTx} />
                  <div className="ahead">
                    <>
                      {Number(tx.rawTx.gasPrice || tx.rawTx.maxFeePerGas || 0) /
                        1e9}{' '}
                      Gwei{' '}
                    </>
                  </div>
                  <SvgPendingSpin className="icon icon-spin" />
                </div>
              ))}
          </div>
        </ChildrenWrapper>
      )}
      <PredictTime item={item} txRequests={txRequests} />
      <CancelTxPopup
        visible={isShowCancelPopup}
        onClose={() => {
          setIsShowCancelPopup(false);
        }}
        onCancelTx={handleCancelTx}
        tx={maxGasTx}
      ></CancelTxPopup>
    </div>
  );
};
