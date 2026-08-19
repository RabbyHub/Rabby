import { findChain } from '@/utils/chain';
import {
  buildParseTxRequest,
  buildPendingTxList,
  buildPreExecTxRequest,
  getTxFingerprint,
} from '@/utils/transaction';
import { getRecommendNonce } from '../controller/walletUtils/sign';
import openapiService from './openapi';
import transactionHistoryService from './transactionHistory';
import type { Tx } from './openapi';

type Preparation = {
  state: { cancelled: boolean };
  txFingerprint: string;
  startedAt: number;
  settled: Promise<{
    results: [
      PromiseSettledResult<string>,
      PromiseSettledResult<Tx[]>,
      PromiseSettledResult<Awaited<ReturnType<typeof openapiService.parseTx>>>,
      PromiseSettledResult<Awaited<ReturnType<typeof openapiService.preExecTx>>>
    ];
    resolvedAt: number;
  }>;
};

const preparations = new Map<string, Preparation>();

const getPendingHistory = async (address: string, chainId: number) => {
  const { pendings } = await transactionHistoryService.getList(address);
  return pendings.filter((item) => item.chainId === chainId);
};

export const startSignTxPreparation = ({
  id,
  tx,
  origin,
  chainId,
  support1559,
  delegateCall,
}: {
  id: string;
  tx: Tx;
  origin?: string;
  chainId: number;
  support1559: boolean;
  delegateCall?: boolean;
}) => {
  const chain = findChain({ id: chainId });
  if (!chain || preparations.has(id)) return;

  const openapi = openapiService;
  const startedAt = Date.now();
  const state = { cancelled: false };
  const recommendNonce = getRecommendNonce({
    from: tx.from,
    chainId,
    nonceKey: (tx as any).nonceKey,
  });
  const pendingTxs = getPendingHistory(tx.from, chainId);
  const pendingTxList = Promise.all([
    recommendNonce,
    pendingTxs,
  ]).then(([nonce, pendings]) => buildPendingTxList(pendings, nonce));
  const explainNonce = recommendNonce.then(
    (nonce) => nonce || tx.nonce || '0x1'
  );
  const parseTx = explainNonce.then((nonce) =>
    state.cancelled
      ? Promise.reject(new Error('Sign transaction preparation cancelled'))
      : openapi.parseTx(
          buildParseTxRequest({
            tx,
            chainId: chain.serverId,
            nonce,
            origin: origin || '',
            addr: tx.from,
            support1559,
            enable7702: false,
          })
        )
  );
  const preExecTx = Promise.all([explainNonce, pendingTxList]).then(
    ([nonce, pending_tx_list]) =>
      state.cancelled
        ? Promise.reject(new Error('Sign transaction preparation cancelled'))
        : openapi.preExecTx(
            buildPreExecTxRequest({
              tx,
              nonce,
              origin: origin || '',
              address: tx.from,
              updateNonce: !tx.nonce,
              pendingTxList: pending_tx_list,
              delegateCall: delegateCall || false,
            })
          )
  );

  void parseTx.catch(() => undefined);
  void preExecTx.catch(() => undefined);
  const settled = Promise.allSettled([
    recommendNonce,
    pendingTxList,
    parseTx,
    preExecTx,
  ]).then((results) => ({
    results,
    resolvedAt: Date.now(),
  }));

  preparations.set(id, {
    state,
    txFingerprint: getTxFingerprint(tx),
    startedAt,
    settled,
  });
  setTimeout(() => preparations.delete(id), 60_000);
};

export const getSignTxPreparation = async (id: string) => {
  const preparation = preparations.get(id);
  if (!preparation) return null;
  const { results, resolvedAt } = await preparation.settled;
  const [recommendNonce, pendingTxList, parseTx, preExecTx] = results;
  preparations.delete(id);
  return {
    txFingerprint: preparation.txFingerprint,
    startedAt: preparation.startedAt,
    resolvedAt,
    recommendNonce:
      recommendNonce.status === 'fulfilled' ? recommendNonce.value : undefined,
    pendingTxList:
      pendingTxList.status === 'fulfilled' ? pendingTxList.value : undefined,
    parseTx: parseTx.status === 'fulfilled' ? parseTx.value : undefined,
    preExecTx: preExecTx.status === 'fulfilled' ? preExecTx.value : undefined,
  };
};

export const cancelSignTxPreparation = (id: string) => {
  const preparation = preparations.get(id);
  if (preparation) preparation.state.cancelled = true;
  preparations.delete(id);
};

export const cancelAllSignTxPreparations = () => {
  preparations.forEach((preparation) => {
    preparation.state.cancelled = true;
  });
  preparations.clear();
};
