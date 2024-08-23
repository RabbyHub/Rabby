import { message } from 'antd';
import { useWallet } from '@/ui/utils';
import { sendTransaction } from '@/ui/utils/sendTransaction';
import { Tx } from '@rabby-wallet/rabby-api/dist/types';
import { useMemoizedFn } from 'ahooks';
import PQueue from 'p-queue';
import React, { useMemo, useState } from 'react';
import _ from 'lodash';
import { isLedgerLockError } from '@/ui/utils/ledger';

type TxStatus = 'sended' | 'signed' | 'idle' | 'failed';

type ListItemType = {
  tx: Tx;
  options: Omit<
    Parameters<typeof sendTransaction>[0],
    'tx' | 'onProgress' | 'wallet'
  >;
  status: TxStatus;
  message?: string;
};

export const useBatchSignTxTask = () => {
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
    console.log('batch init', list);
    setList(list);
    setStatus('idle');
  });

  const start = useMemoizedFn(async (current = 0) => {
    try {
      setStatus('active');
      for (let index = current; index < list.length; index++) {
        const item = list[index];
        const tx = item.tx;
        const options = item.options;
        if (item.status === 'signed') {
          continue;
        }

        try {
          const result = await sendTransaction({
            ...options,
            tx,
            wallet,
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
        } catch (e) {
          console.error(e);
          _updateList({
            index,
            payload: {
              status: 'failed',
              message: e.message,
            },
          });

          if (!isLedgerLockError(e.message) || e.message === 'DISCONNECTED') {
            setError(e.message);
          }
          throw e;
        }
      }
      setStatus('completed');
    } catch (e) {
      console.error(e);
      throw e;
    }
  });

  const handleRetry = useMemoizedFn(() => {
    setError('');
    setStatus('idle');
    start(currentActiveIndex);
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

export type BatchSignTxTaskType = ReturnType<typeof useBatchSignTxTask>;
