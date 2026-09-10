import { useWallet } from '@/ui/utils';
import { useMemoizedFn } from 'ahooks';
import React, { useMemo, useState } from 'react';
import _ from 'lodash';
import {
  isLedgerConnectionRecoverableError,
  isLedgerLockError,
} from '@/ui/utils/ledger';
import { useSetDirectSigning } from '@/ui/hooks/useMiniApprovalDirectSign';
import { sendPersonalMessage } from '@/ui/utils/sendPersonalMessage';

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

  const setDirectSigning = useSetDirectSigning();

  const start = useMemoizedFn(async (isRetry = false) => {
    const runId = ++runIdRef.current;
    const isCurrent = () => runId === runIdRef.current;
    setHardwareError(undefined);
    const results: string[] = [];
    try {
      setDirectSigning(true);
      setStatus('active');

      for (let index = 0; index < list.length; index++) {
        if (!isCurrent()) throw new Error('User cancelled');
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
            // ga,
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
          results.push(result.txHash || '');
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

          _updateList({
            index,
            payload: {
              status: 'failed',
              message: msg,
            },
          });

          if (
            !(
              isLedgerLockError(msg) ||
              isLedgerConnectionRecoverableError(msg) ||
              msg === 'No OneKey Device found'
            )
          ) {
            if (!isCurrent()) throw e;
            setError(msg);
          }
          throw e;
        }
      }
      if (!isCurrent()) throw new Error('User cancelled');
      setStatus('completed');
      // eventBus.emit(EVENTS.DIRECT_SIGN, {});
      return results;
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

export type BatchSignPersonalMessageTaskType = ReturnType<
  typeof useBatchSignPersonalMessageTask
>;
