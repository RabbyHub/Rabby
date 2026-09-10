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
import type { DirectSigningId } from '@/utils/signingTypes';

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
    stop();
    setList(list);
    setStatus('idle');
  });

  const retryTxs = useRef<ListItemType[]>([]);
  const retryScopeRef = useRef<string>();
  const directSigningIdRef = useRef<DirectSigningId>();
  const runIdRef = useRef(0);

  const setDirectSigning = useSetDirectSigning();

  const onErrorRef = React.useRef<(message: string) => void>();
  const finishSigning = useMemoizedFn(async (id?: DirectSigningId) => {
    if (!id) return false;
    if (directSigningIdRef.current === id)
      directSigningIdRef.current = undefined;
    return wallet.endDirectSigning(id).catch((error) => {
      console.error('end direct signing failed', error);
      return false;
    });
  });

  const start = useMemoizedFn(async (isRetry = false) => {
    let txHash = '';
    const runId = ++runIdRef.current;
    const previousId = directSigningIdRef.current;
    directSigningIdRef.current = undefined;
    if (previousId) {
      void wallet.endDirectSigning(previousId).catch((error) => {
        console.error(
          'cancel previous direct transaction signing failed',
          error
        );
      });
    }
    let directSigningId: DirectSigningId | undefined;
    let retryScope: string | undefined;
    let finished = false;
    let completed = false;
    try {
      const account =
        list[0]?.options?.account ||
        (await wallet.getCurrentAccount()) ||
        undefined;
      if (runId !== runIdRef.current) throw new Error('User cancelled');
      directSigningId = await wallet.startDirectSigning({ account });
      if (runId !== runIdRef.current) {
        await wallet.endDirectSigning(directSigningId);
        throw new Error('User cancelled');
      }
      directSigningIdRef.current = directSigningId;
      if (!isRetry) {
        retryScopeRef.current = directSigningId;
      }
      retryScope = retryScopeRef.current || directSigningId;
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
        await retryTxReset(retryScope);
      } else {
        if (!retryTxs.current.length) {
          retryTxs.current = list;
        }
      }

      for (let index = 0; index < list.length; index++) {
        if (runId !== runIdRef.current) throw new Error('User cancelled');
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
          const retryType = await getRetryTxType(retryScope);
          switch (retryType) {
            case 'nonce': {
              const recommendNonce = await getRetryTxRecommendNonce(retryScope);
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
          const result = await sendTransaction({
            ...options,
            tx,
            wallet,
            ga,
            directSigning: directSigningId,
            onProgress: (status) => {
              if (runId !== runIdRef.current) return;
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
          if (runId !== runIdRef.current) throw new Error('User cancelled');
          // 保存交易 hash
          if (result) {
            txHash = result.txHash || '';
          }
        } catch (e) {
          console.error(e);
          if (runId !== runIdRef.current) throw e;
          const accepted = await finishSigning(directSigningId);
          finished = true;
          if (runId !== runIdRef.current) throw e;
          if (!accepted) throw new Error('User cancelled');
          const msg = e.message || e.name;
          onErrorRef.current?.(msg);
          if (runId !== runIdRef.current) throw e;

          _updateList({
            index,
            payload: {
              status: 'failed',
              message: msg,
            },
          });

          await retryTxReset(retryScope);
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
                scope: retryScope,
              });
            } catch (error) {
              console.error(
                'useBatchSignTxTask setRetryTxRecommendNonce error',
                error
              );
            }

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
      await retryTxReset(retryScope);
      if (runId !== runIdRef.current) throw new Error('User cancelled');
      const accepted = await finishSigning(directSigningId);
      finished = true;
      if (!accepted) throw new Error('User cancelled');
      if (runId !== runIdRef.current) throw new Error('User cancelled');
      setStatus('completed');
      completed = true;
      return txHash;
    } finally {
      if (directSigningId && !finished) {
        await wallet.endDirectSigning(directSigningId).catch((error) => {
          console.error('cancel direct transaction signing failed', error);
        });
      }
      if (directSigningIdRef.current === directSigningId) {
        directSigningIdRef.current = undefined;
      }
      if (completed && retryScopeRef.current === retryScope) {
        retryScopeRef.current = undefined;
      }
      if (runId === runIdRef.current) {
        setDirectSigning(false);
      }
    }
  });

  const handleRetry = useMemoizedFn(async () => {
    setError('');
    const hash = await start(true);
    return hash;
  });

  const stop = useMemoizedFn(() => {
    runIdRef.current += 1;
    const context = directSigningIdRef.current;
    directSigningIdRef.current = undefined;
    if (context) {
      void wallet.endDirectSigning(context).catch((error) => {
        console.error('cancel direct transaction signing failed', error);
      });
    }
    const retryScope = retryScopeRef.current;
    retryScopeRef.current = undefined;
    if (retryScope) {
      void wallet.retryTxReset(retryScope).catch((error) => {
        console.error('reset direct signing retry state failed', error);
      });
    }
    setStatus('idle');
    setDirectSigning(false);
  });

  React.useEffect(() => () => stop(), [stop]);

  const currentActiveIndex = React.useMemo(() => {
    const index = _.findLastIndex(list, (item) => item.status !== 'idle');
    return index <= -1 ? 0 : index;
  }, [list]);

  const txStatus = useMemo(() => {
    return list[currentActiveIndex]?.status;
  }, [list, currentActiveIndex]);

  return {
    onErrorRef,
    list,
    init,
    start,
    retry: handleRetry,
    error,
    status,
    currentActiveIndex,
    total: list.length,
    txStatus,
    stop,
  };
};

export type BatchSignTxTaskType = ReturnType<typeof useBatchSignTxTask>;
