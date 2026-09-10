import { useEffect, useRef, useState } from 'react';
import { useMemoizedFn } from 'ahooks';
import { findLastIndex } from 'lodash';
import { useSetDirectSigning } from '@/ui/hooks/useMiniApprovalDirectSign';
import {
  isLedgerConnectionRecoverableError,
  isLedgerLockError,
} from '@/ui/utils/ledger';

export type MessageTaskItem = {
  status: 'sended' | 'signed' | 'idle' | 'failed';
  message?: string;
  hash?: string;
};
type Progress = 'building' | 'builded' | 'signed' | 'submitted';

// Personal and typed messages share the same local queue. Transaction fee
// and nonce retries stay in useBatchSignTxTask.
export const useBatchSignMessageTask = <Item extends MessageTaskItem>(
  send: (
    item: Item,
    onProgress: (status: Progress) => void
  ) => Promise<{ txHash: string }>
) => {
  const [list, setList] = useState<Item[]>([]);
  const [status, setStatus] = useState<
    'idle' | 'active' | 'paused' | 'completed'
  >('idle');
  const [error, setError] = useState('');
  const [hardwareError, setHardwareError] = useState<string>();
  const runId = useRef(0);
  const setDirectSigning = useSetDirectSigning();
  const updateItem = (index: number, payload: Partial<MessageTaskItem>) => {
    setList((items) =>
      items.map((item, i) => (i === index ? { ...item, ...payload } : item))
    );
  };
  const init = useMemoizedFn((items: Item[]) => {
    runId.current += 1;
    setHardwareError(undefined);
    setList(items);
    setStatus('idle');
  });
  const start = useMemoizedFn(async () => {
    const id = ++runId.current;
    const isCurrent = () => id === runId.current;
    const results: string[] = [];
    setHardwareError(undefined);
    setDirectSigning(true);
    setStatus('active');
    try {
      for (let index = 0; index < list.length; index++) {
        if (!isCurrent()) throw new Error('User cancelled');
        const item = list[index];
        if (item.status === 'signed') {
          results.push(item.hash || '');
          continue;
        }
        try {
          const result = await send(item, (progress) => {
            if (!isCurrent()) return;
            if (progress === 'builded') updateItem(index, { status: 'sended' });
            if (progress === 'signed') updateItem(index, { status: 'signed' });
          });
          if (!isCurrent()) throw new Error('User cancelled');
          results.push(result.txHash || '');
        } catch (e) {
          if (!isCurrent()) throw e;
          console.error(e);
          const message = e.message || e.name;
          updateItem(index, { status: 'failed', message });
          if (
            isLedgerLockError(message) ||
            isLedgerConnectionRecoverableError(message) ||
            message === 'No OneKey Device found'
          ) {
            setHardwareError(message);
            setStatus('paused');
          } else {
            setError(message);
          }
          throw e;
        }
      }
      if (!isCurrent()) throw new Error('User cancelled');
      setStatus('completed');
      return results;
    } finally {
      if (isCurrent()) setDirectSigning(false);
    }
  });
  const retry = useMemoizedFn(() => {
    setError('');
    return start();
  });
  const stop = useMemoizedFn(() => {
    runId.current += 1;
    setDirectSigning(false);
    setStatus('idle');
  });
  useEffect(
    () => () => {
      runId.current += 1;
    },
    []
  );
  const currentActiveIndex = Math.max(
    0,
    findLastIndex(list, (item) => item.status !== 'idle')
  );
  return {
    list,
    init,
    start,
    retry,
    error,
    hardwareError,
    status,
    currentActiveIndex,
    total: list.length,
    txStatus: list[currentActiveIndex]?.status,
    stop,
  };
};
