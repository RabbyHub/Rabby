import { useWallet } from '@/ui/utils';
import { useMemoizedFn } from 'ahooks';
import React, { useMemo, useState } from 'react';
import _ from 'lodash';
import { useSetDirectSigning } from '@/ui/hooks/useMiniApprovalDirectSign';
import { sendSignTypedData } from '@/ui/utils/sendTypedData';
import type { DirectSigningId } from '@/utils/signingTypes';

type TxStatus = 'sended' | 'signed' | 'idle' | 'failed';

export type MiniTypedData = {
  data: Record<string, any>;
  from: string;
  version: 'V1' | 'V3' | 'V4';
};

type ListItemType = {
  tx: MiniTypedData;
  options?: Omit<
    Parameters<typeof sendSignTypedData>[0],
    'tx' | 'onProgress' | 'wallet' | 'data' | 'from' | 'version'
  >;
  status: TxStatus;
  message?: string;
  hash?: string;
};

export const useBatchSignTypedDataTask = (_options?: {
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
    stop();
    setList(list);
    setStatus('idle');
  });

  const setDirectSigning = useSetDirectSigning();
  const directSigningIdRef = React.useRef<DirectSigningId>();
  const runIdRef = React.useRef(0);

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

  const start = useMemoizedFn(async () => {
    const results: string[] = [];
    const runId = ++runIdRef.current;
    const previousId = directSigningIdRef.current;
    directSigningIdRef.current = undefined;
    if (previousId) {
      void wallet.endDirectSigning(previousId).catch((error) => {
        console.error(
          'cancel previous direct typed-data signing failed',
          error
        );
      });
    }
    let directSigningId: DirectSigningId | undefined;
    let finished = false;
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
          const result = await sendSignTypedData({
            ...tx,
            ...options,
            // tx,
            wallet,
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
          results.push(result.txHash || '');
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

          setError(msg);
          throw e;
        }
      }
      if (runId !== runIdRef.current) throw new Error('User cancelled');
      const accepted = await finishSigning(directSigningId);
      finished = true;
      if (!accepted) throw new Error('User cancelled');
      if (runId !== runIdRef.current) throw new Error('User cancelled');
      setStatus('completed');
      return results;
    } finally {
      if (directSigningId && !finished) {
        await wallet.endDirectSigning(directSigningId).catch((error) => {
          console.error('cancel direct typed-data signing failed', error);
        });
      }
      if (directSigningIdRef.current === directSigningId) {
        directSigningIdRef.current = undefined;
      }
      if (runId === runIdRef.current) {
        setDirectSigning(false);
      }
    }
  });

  const handleRetry = useMemoizedFn(async () => {
    setError('');
    const hash = await start();
    return hash;
  });

  const stop = useMemoizedFn(() => {
    runIdRef.current += 1;
    const context = directSigningIdRef.current;
    directSigningIdRef.current = undefined;
    if (context) {
      void wallet.endDirectSigning(context).catch((error) => {
        console.error('cancel direct typed-data signing failed', error);
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

export type BatchSignTypedDataTaskType = ReturnType<
  typeof useBatchSignTypedDataTask
>;
