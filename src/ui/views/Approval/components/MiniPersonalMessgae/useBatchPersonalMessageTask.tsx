import { useWallet } from '@/ui/utils';
import { useMemoizedFn } from 'ahooks';
import React, { useMemo, useState } from 'react';
import _ from 'lodash';
import { isLedgerLockError } from '@/ui/utils/ledger';
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

  const start = useMemoizedFn(async (isRetry = false) => {
    const results: string[] = [];
    try {
      setDirectSigning(true);
      setStatus('active');

      for (let index = 0; index < list.length; index++) {
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

          if (
            !(
              isLedgerLockError(msg) ||
              msg === 'DISCONNECTED' ||
              msg === 'No OneKey Device found'
            )
          ) {
            setError(msg);
          }
          throw e;
        }
      }
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
      setDirectSigning(false);
    }
  });

  const handleRetry = useMemoizedFn(async () => {
    setError('');
    const hash = await start(true);
    return hash;
  });

  const stop = useMemoizedFn(() => {
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
  };
};

export type BatchSignPersonalMessageTaskType = ReturnType<
  typeof useBatchSignPersonalMessageTask
>;
