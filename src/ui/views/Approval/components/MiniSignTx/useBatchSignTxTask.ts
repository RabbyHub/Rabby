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
import {
  supportedHardwareDirectSign,
  useSetDirectSigning,
} from '@/ui/hooks/useMiniApprovalDirectSign';
import BigNumber from 'bignumber.js';
import type {
  SigningAttemptRef,
  SigningRequestContext,
} from '@/utils/signingTypes';

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
    setList(list);
    setStatus('idle');
  });

  const retryTxs = useRef<ListItemType[]>([]);
  const signingContextRef = useRef<SigningRequestContext>();
  const [signingAttempt, setSigningAttempt] = useState<SigningAttemptRef>();
  const runIdRef = useRef(0);

  const setDirectSigning = useSetDirectSigning();

  const finishSigning = useMemoizedFn(
    async (
      context: SigningRequestContext | undefined,
      outcome: { success: boolean; data?: unknown; error?: unknown }
    ) => {
      if (!context) return;
      if (signingContextRef.current === context) {
        signingContextRef.current = undefined;
        setSigningAttempt(undefined);
      }
      try {
        await wallet.finishDirectSigning(context, outcome);
      } catch (error) {
        console.error('finish direct transaction signing failed', error);
        await wallet.cancelDirectSigning(context).catch((cancelError) => {
          console.error(
            'cancel direct transaction signing after finish failed',
            cancelError
          );
        });
      }
    }
  );

  const start = useMemoizedFn(async (isRetry = false) => {
    let txHash = '';
    const runId = ++runIdRef.current;
    const previousContext = signingContextRef.current;
    signingContextRef.current = undefined;
    setSigningAttempt(undefined);
    if (previousContext) {
      void wallet.cancelDirectSigning(previousContext).catch((error) => {
        console.error(
          'cancel previous direct transaction signing failed',
          error
        );
      });
    }
    let signingContext: SigningRequestContext | undefined;
    let finished = false;
    try {
      const account =
        list[0]?.options?.account ||
        (await wallet.getCurrentAccount()) ||
        undefined;
      if (runId !== runIdRef.current) throw new Error('User cancelled');
      signingContext = await wallet.startDirectSigning({ account });
      if (runId !== runIdRef.current) {
        await wallet.cancelDirectSigning(signingContext);
        throw new Error('User cancelled');
      }
      signingContextRef.current = signingContext;
      setSigningAttempt(signingContext.attempt);
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
          const result = await sendTransaction({
            ...options,
            tx,
            wallet,
            ga,
            hardwareOperation: supportedHardwareDirectSign(
              signingContext.account.type
            )
              ? {
                  kind: 'signing-attempt',
                  attempt: signingContext.attempt,
                }
              : undefined,
            signing: signingContext,
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
          const msg = e.message || e.name;

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

          await retryTxReset();
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
      await retryTxReset();
      if (runId !== runIdRef.current) throw new Error('User cancelled');
      await finishSigning(signingContext, { success: true, data: txHash });
      finished = true;
      if (runId !== runIdRef.current) throw new Error('User cancelled');
      setStatus('completed');
      // eventBus.emit(EVENTS.DIRECT_SIGN, {});
      return txHash;
    } catch (e) {
      console.error(e);
      const msg = e.message || e.name;

      if (runId === runIdRef.current) {
        await finishSigning(signingContext, { success: false, error: e });
        finished = true;
      }
      if (runId !== runIdRef.current) throw e;

      // eventBus.emit(EVENTS.DIRECT_SIGN, {
      //   error: msg || 'failed to completed',
      // });
      throw e;
    } finally {
      if (signingContext && !finished) {
        await wallet.cancelDirectSigning(signingContext).catch((error) => {
          console.error('cancel direct transaction signing failed', error);
        });
      }
      if (signingContextRef.current === signingContext) {
        signingContextRef.current = undefined;
        setSigningAttempt(undefined);
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
    const context = signingContextRef.current;
    signingContextRef.current = undefined;
    setSigningAttempt(undefined);
    if (context) {
      void wallet.cancelDirectSigning(context).catch((error) => {
        console.error('cancel direct transaction signing failed', error);
      });
    }
    setStatus('idle');
  });

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
    status,
    currentActiveIndex,
    total: list.length,
    txStatus,
    stop,
    signingAttempt,
  };
};

export type BatchSignTxTaskType = ReturnType<typeof useBatchSignTxTask>;
