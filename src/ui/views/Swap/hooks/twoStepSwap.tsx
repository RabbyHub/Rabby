import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';
import { CHAINS_ENUM } from '@debank/common';
import { Tx } from '@rabby-wallet/rabby-api/dist/types';
import { useCallback, useEffect, useMemo, useState } from 'react';

const twoStepChains = ['HYPER' as CHAINS_ENUM];

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

  const currentTxs = useMemo(() => {
    if (shouldTwoStep) {
      return _txs?.[index] ? [_txs?.[index]] : [];
    }
    return _txs;
  }, [shouldTwoStep, _txs, index]);

  const isApprove = shouldTwoStep && !!_txs?.length && index < _txs?.length - 1;

  useEffect(() => {
    setIndex(0);
    setApprovePending(false);
  }, [_txs]);

  const next = useCallback(() => {
    setIndex((e) => e + 1);
  }, []);

  const [approvePending, setApprovePending] = useState(false);

  useEffect(() => {
    if (shouldTwoStep) {
      let approveHash = '';
      const pending = (params: {
        type: string;
        key: string;
        txHash: string;
      }) => {
        if (
          type === params.type &&
          _txs?.some((e) => `${chain}-${e.data}` === params.key)
        ) {
          onApprovePending?.();
          setApprovePending(true);
          approveHash = params.txHash;
        }
      };

      const complete = (params: { hashArr: string[]; chainId: number }) => {
        if (
          _txs?.[0]?.chainId === params.chainId &&
          params.hashArr.includes(approveHash)
        ) {
          setApprovePending(false);
        }
      };

      eventBus.addEventListener(EVENTS.INNER_HISTORY_ITEM_PENDING, pending);

      eventBus.addEventListener(EVENTS.INNER_HISTORY_ITEM_COMPLETE, complete);

      return () => {
        eventBus.removeEventListener(
          EVENTS.INNER_HISTORY_ITEM_PENDING,
          pending
        );
        eventBus.removeEventListener(
          EVENTS.INNER_HISTORY_ITEM_COMPLETE,
          complete
        );
      };
    }
  }, [_txs, type, shouldTwoStep, chain, onApprovePending]);

  return {
    shouldTwoStep,
    currentTxs,
    next,
    isApprove,
    approvePending,
    setApprovePending,
  };
};
