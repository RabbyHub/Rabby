import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';
import { CHAINS_ENUM } from '@debank/common';
import { Tx } from '@rabby-wallet/rabby-api/dist/types';
import { useCallback, useEffect, useMemo, useState } from 'react';

const twoStepChains = [
  'HYPER' as CHAINS_ENUM,
  'MONAD' as CHAINS_ENUM,
  'RSK' as CHAINS_ENUM,
];

export const useTwoStepSwap = ({
  chain,
  txs: _txs,
  enable,
  type,
  onApprovePending,
}: {
  chain: CHAINS_ENUM;
  txs?: Tx[];
  enable: boolean;
  type: 'approveSwap' | 'approveBridge';
  onApprovePending?: () => void;
}) => {
  const shouldTwoStep = enable
    ? twoStepChains.includes(chain) && !!_txs?.length && _txs?.length > 1
    : false;

  const [index, setIndex] = useState(0);
  const [approveHash, setApproveHash] = useState('');

  const currentTxs = useMemo(() => {
    if (shouldTwoStep) {
      return _txs?.[index] ? [_txs?.[index]] : [];
    }
    return _txs;
  }, [shouldTwoStep, _txs, index]);

  const isApprove = shouldTwoStep && !!_txs?.length && index < _txs?.length - 1;

  useEffect(() => {
    setApproveHash('');
    setIndex(0);
    setApprovePending(false);
  }, [_txs]);

  const next = useCallback(
    (hash: string) => {
      if (hash && shouldTwoStep && currentTxs?.[0]) {
        setApproveHash(hash);
        onApprovePending?.();
        setApprovePending(true);
      }
    },
    [shouldTwoStep, currentTxs]
  );

  const [approvePending, setApprovePending] = useState(false);

  useEffect(() => {
    if (shouldTwoStep) {
      const complete = (params: { hashArr: string[]; chainId: number }) => {
        if (
          _txs?.[0]?.chainId === params.chainId &&
          params.hashArr.includes(approveHash)
        ) {
          setApprovePending(false);
          setIndex((e) => e + 1);
        }
      };

      eventBus.addEventListener(EVENTS.INNER_HISTORY_ITEM_COMPLETE, complete);

      return () => {
        eventBus.removeEventListener(
          EVENTS.INNER_HISTORY_ITEM_COMPLETE,
          complete
        );
      };
    }
  }, [_txs, type, shouldTwoStep, chain, onApprovePending, approveHash]);

  return {
    shouldTwoStep,
    currentTxs,
    next,
    isApprove,
    approvePending,
    setApprovePending,
    approveHash,
  };
};
