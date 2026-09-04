import { useWallet } from '@/ui/utils';
import { useMemoizedFn } from 'ahooks';
import React, { useMemo, useState } from 'react';
import _ from 'lodash';
import {
  supportedHardwareDirectSign,
  useSetDirectSigning,
} from '@/ui/hooks/useMiniApprovalDirectSign';
import { sendPersonalMessage } from '@/ui/utils/sendPersonalMessage';
import type {
  SigningAttemptRef,
  SigningRequestContext,
} from '@/utils/signingTypes';

type TxStatus = 'sended' | 'signed' | 'idle' | 'failed';

export type MiniPersonalMessage = {
  data: [string, string];
};

type ListItemType = {
  tx: MiniPersonalMessage;
  options?: Omit<
    Parameters<typeof sendPersonalMessage>[0],
    'tx' | 'onProgress' | 'wallet' | 'data'
  >;
  status: TxStatus;
  message?: string;
  hash?: string;
};

export const useBatchSignPersonalMessageTask = ({
  ga,
}: {
  ga?: Record<string, any>;
}) => {
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

  const setDirectSigning = useSetDirectSigning();
  const signingContextRef = React.useRef<SigningRequestContext>();
  const [signingAttempt, setSigningAttempt] = useState<SigningAttemptRef>();
  const runIdRef = React.useRef(0);

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
        console.error('finish direct personal signing failed', error);
        await wallet.cancelDirectSigning(context).catch((cancelError) => {
          console.error(
            'cancel direct personal signing after finish failed',
            cancelError
          );
        });
      }
    }
  );

  const start = useMemoizedFn(async (isRetry = false) => {
    const results: string[] = [];
    const runId = ++runIdRef.current;
    const previousContext = signingContextRef.current;
    signingContextRef.current = undefined;
    setSigningAttempt(undefined);
    if (previousContext) {
      void wallet.cancelDirectSigning(previousContext).catch((error) => {
        console.error('cancel previous direct personal signing failed', error);
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

      for (let index = 0; index < list.length; index++) {
        if (runId !== runIdRef.current) throw new Error('User cancelled');
        const item = list[index];

        if (item.status === 'signed') {
          results.push(item.hash || '');
          continue;
        }

        const tx = item.tx;
        const options = item.options;

        try {
          const result = await sendPersonalMessage({
            ...tx,
            ...options,
            // tx,
            wallet,
            hardwareOperation: supportedHardwareDirectSign(
              signingContext.account.type
            )
              ? {
                  kind: 'signing-attempt',
                  attempt: signingContext.attempt,
                }
              : undefined,
            signing: signingContext,
            // ga,
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
          results.push(result.txHash || '');
        } catch (e) {
          console.error(e);
          const msg = e.message || e.name;

          _updateList({
            index,
            payload: {
              status: 'failed',
              message: msg,
            },
          });

          setError(msg);
          throw e;
        }
      }
      if (runId !== runIdRef.current) throw new Error('User cancelled');
      await finishSigning(signingContext, { success: true, data: results });
      finished = true;
      if (runId !== runIdRef.current) throw new Error('User cancelled');
      setStatus('completed');
      // eventBus.emit(EVENTS.DIRECT_SIGN, {});
      return results;
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
          console.error('cancel direct personal signing failed', error);
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
        console.error('cancel direct personal signing failed', error);
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

export type BatchSignPersonalMessageTaskType = ReturnType<
  typeof useBatchSignPersonalMessageTask
>;
