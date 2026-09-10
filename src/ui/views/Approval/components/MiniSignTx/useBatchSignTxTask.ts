import { openInternalPageInTab, useWallet } from '@/ui/utils';
import { sendTransaction } from '@/ui/utils/sendTransaction';
import { Tx } from '@rabby-wallet/rabby-api/dist/types';
import { HardwareErrorCode } from '@onekeyfe/hd-shared';
import { useMemoizedFn } from 'ahooks';
import React, { useMemo, useRef, useState } from 'react';
import _ from 'lodash';
import {
  isLedgerConnectionRecoverableError,
  isLedgerLockError,
} from '@/ui/utils/ledger';
import { useSetDirectSigning } from '@/ui/hooks/useMiniApprovalDirectSign';
import BigNumber from 'bignumber.js';

type TxStatus = 'sended' | 'signed' | 'idle' | 'failed';

type ListItemType = {
  tx: Tx;
  options: Omit<
    Parameters<typeof sendTransaction>[0],
    'tx' | 'onProgress' | 'wallet'
  >;
  status: TxStatus;
  message?: string;
  hash?: string;
};

export const useBatchSignTxTask = ({ ga }: { ga?: Record<string, any> }) => {
  const wallet = useWallet();

  const [list, setList] = useState<ListItemType[]>([]);
  const [status, setStatus] = React.useState<
    'idle' | 'active' | 'paused' | 'completed'
  >('idle');
  const [error, setError] = useState('');
  const [hardwareError, setHardwareError] = useState<string>();
  const runIdRef = React.useRef(0);

  const _updateList = useMemoizedFn(
    ({ index, payload }: { index: number; payload: Partial<ListItemType> }) => {
      setList((prev) => {
        const cloned = [...prev];

        cloned[index] = {
          ...cloned[index],
          ...payload,
        };

        return cloned;
      });
    }
  );

  const init = useMemoizedFn((list: ListItemType[]) => {
    runIdRef.current += 1;
    setHardwareError(undefined);
    setList(list);
    setStatus('idle');
  });

  const retryTxs = useRef<ListItemType[]>([]);

  const setDirectSigning = useSetDirectSigning();

  const start = useMemoizedFn(async (isRetry = false) => {
    const runId = ++runIdRef.current;
    const isCurrent = () => runId === runIdRef.current;
    setHardwareError(undefined);
    let txHash = '';
    try {
      setDirectSigning(true);
      setStatus('active');

      const {
        getRetryTxType,
        retryTxReset,
        getRetryTxRecommendNonce,
        setRetryTxRecommendNonce,
      } = wallet;

      if (!isRetry) {
        retryTxs.current = [];
        await retryTxReset();
      } else {
        if (!retryTxs.current.length) {
          retryTxs.current = list;
        }
      }

      for (let index = 0; index < list.length; index++) {
        if (!isCurrent()) throw new Error('User cancelled');
        let item = list[index];
        const options = item.options;

        if (item.status === 'signed') {
          continue;
        }

        if (isRetry) {
          item = retryTxs.current[index];
        }
        const tx = item.tx;

        if (isRetry) {
          const retryType = await getRetryTxType();
          switch (retryType) {
            case 'nonce': {
              const recommendNonce = await getRetryTxRecommendNonce();
              tx.nonce = recommendNonce;
              break;
            }

            case 'gasPrice': {
              if (tx.gasPrice) {
                tx.gasPrice = `0x${new BigNumber(
                  new BigNumber(tx.gasPrice, 16).times(1.3).toFixed(0)
                ).toString(16)}`;
              }
              if (tx.maxFeePerGas) {
                tx.maxFeePerGas = `0x${new BigNumber(
                  new BigNumber(tx.maxFeePerGas, 16).times(1.3).toFixed(0)
                ).toString(16)}`;
              }
              break;
            }

            default:
              break;
          }
          const tmp = [...list];
          tmp[index] = { ...item, tx: { ...tx } };
          retryTxs.current = tmp;
        }

        try {
          if (!isCurrent()) throw new Error('User cancelled');
          const result = await sendTransaction({
            ...options,
            tx,
            wallet,
            ga,
            onProgress: (status) => {
              if (!isCurrent()) return;
              if (status === 'builded') {
                _updateList({
                  index,
                  payload: {
                    status: 'sended',
                  },
                });
              } else if (status === 'signed') {
                _updateList({
                  index,
                  payload: {
                    status: 'signed',
                  },
                });
              }
            },
          });
          if (!isCurrent()) throw new Error('User cancelled');
          // 保存交易 hash
          if (result) {
            txHash = result.txHash || '';
          }
        } catch (e) {
          if (!isCurrent()) throw e;
          console.error(e);
          const msg = e.message || e.name;
          if (
            isLedgerLockError(msg) ||
            isLedgerConnectionRecoverableError(msg) ||
            msg === 'No OneKey Device found'
          ) {
            setHardwareError(msg);
            setStatus('paused');
          }

          // eventBus.emit(EVENTS.DIRECT_SIGN, {
          //   error: msg,
          // });

          _updateList({
            index,
            payload: {
              status: 'failed',
              message: msg,
            },
          });

          retryTxReset();
          if (
            !(
              isLedgerLockError(msg) ||
              isLedgerConnectionRecoverableError(msg) ||
              msg === 'No OneKey Device found'
            )
          ) {
            try {
              await setRetryTxRecommendNonce({
                from: tx.from,
                chainId: tx.chainId,
                nonce: tx.nonce,
              });
            } catch (error) {
              console.error(
                'useBatchSignTxTask setRetryTxRecommendNonce error',
                error
              );
            }

            if (!isCurrent()) throw e;
            setError(msg);
          }

          // retry webusb permission
          if (
            msg.startsWith(
              HardwareErrorCode.WebDeviceNotFoundOrNeedsPermission.toString()
            )
          ) {
            openInternalPageInTab(
              'request-permission?type=onekey&from=approval'
            );
          }
          throw e;
        }
      }
      retryTxReset();
      if (!isCurrent()) throw new Error('User cancelled');
      setStatus('completed');
      // eventBus.emit(EVENTS.DIRECT_SIGN, {});
      return txHash;
    } catch (e) {
      console.error(e);
      const msg = e.message || e.name;

      // eventBus.emit(EVENTS.DIRECT_SIGN, {
      //   error: msg || 'failed to completed',
      // });
      throw e;
    } finally {
      if (isCurrent()) setDirectSigning(false);
    }
  });

  const handleRetry = useMemoizedFn(async () => {
    setError('');
    const hash = await start(true);
    return hash;
  });

  const stop = useMemoizedFn(() => {
    runIdRef.current += 1;
    setDirectSigning(false);
    setStatus('idle');
  });

  React.useEffect(
    () => () => {
      runIdRef.current += 1;
    },
    []
  );

  const currentActiveIndex = React.useMemo(() => {
    const index = _.findLastIndex(list, (item) => item.status !== 'idle');
    return index <= -1 ? 0 : index;
  }, [list]);

  const txStatus = useMemo(() => {
    return list[currentActiveIndex]?.status;
  }, [list, currentActiveIndex]);

  return {
    list,
    init,
    start,
    retry: handleRetry,
    error,
    hardwareError,
    status,
    currentActiveIndex,
    total: list.length,
    txStatus,
    stop,
  };
};

export type BatchSignTxTaskType = ReturnType<typeof useBatchSignTxTask>;
