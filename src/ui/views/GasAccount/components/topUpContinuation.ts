import { isSameAddress, useWallet } from '@/ui/utils';
import { findChainByServerID } from '@/utils/chain';
import { Tx } from '@rabby-wallet/rabby-api/dist/types';
import BigNumber from 'bignumber.js';

export type GasAccountTopUpResult = {
  type: 'token';
  ownerAddress: string;
  chainServerId: string;
};

export type GasAccountTopUpWaitCallback = (
  result: GasAccountTopUpResult
) => Promise<void> | void;

export const shouldUpdateOriginalTxNonceAfterTopUp = ({
  originalAccountAddress,
  originalChainServerId,
  topUpResult,
}: {
  originalAccountAddress: string;
  originalChainServerId: string;
  topUpResult: GasAccountTopUpResult;
}) => {
  if (topUpResult.type !== 'token') {
    return false;
  }

  return (
    topUpResult.chainServerId === originalChainServerId &&
    isSameAddress(topUpResult.ownerAddress, originalAccountAddress)
  );
};

const parseNonce = (nonce: string) => {
  if (nonce.startsWith('0x')) {
    return new BigNumber(nonce.slice(2), 16);
  }

  return new BigNumber(nonce);
};

const incrementNonce = (nonce: string, step = 1) =>
  `0x${parseNonce(nonce).plus(step).toString(16)}`;

const getLocalNonceShift = async ({
  targetNonce,
  address,
  chainServerId,
  wallet,
}: {
  targetNonce: string;
  address: string;
  chainServerId: string;
  wallet: ReturnType<typeof useWallet>;
}) => {
  const chain = findChainByServerID(chainServerId);
  if (!chain) {
    return 0;
  }

  const localNextNonce = await wallet.getNonceByChain(address, chain.id);

  if (localNextNonce === null) {
    return 0;
  }

  const target = parseNonce(targetNonce);
  const localNext = new BigNumber(localNextNonce);

  if (target.gte(localNext)) {
    return 0;
  }

  return localNext.minus(target).toNumber();
};

export const getBumpedNonceAfterTopUp = async ({
  currentNonce,
  originalAccountAddress,
  originalChainServerId,
  topUpResult,
  wallet,
}: {
  currentNonce?: string;
  originalAccountAddress: string;
  originalChainServerId: string;
  topUpResult: GasAccountTopUpResult;
  wallet: ReturnType<typeof useWallet>;
}) => {
  if (!currentNonce) {
    return currentNonce;
  }

  if (
    !shouldUpdateOriginalTxNonceAfterTopUp({
      originalAccountAddress,
      originalChainServerId,
      topUpResult,
    })
  ) {
    return currentNonce;
  }

  const shift = await getLocalNonceShift({
    targetNonce: currentNonce,
    address: originalAccountAddress,
    chainServerId: originalChainServerId,
    wallet,
  });

  if (!shift) {
    return currentNonce;
  }

  return incrementNonce(currentNonce, shift);
};

export const buildTopUpResumedTxs = async ({
  txs,
  originalAccountAddress,
  originalChainServerId,
  topUpResult,
  wallet,
}: {
  txs: Tx[];
  originalAccountAddress: string;
  originalChainServerId: string;
  topUpResult: GasAccountTopUpResult;
  wallet: ReturnType<typeof useWallet>;
}) => {
  if (
    !shouldUpdateOriginalTxNonceAfterTopUp({
      originalAccountAddress,
      originalChainServerId,
      topUpResult,
    })
  ) {
    return txs;
  }

  const firstExplicitNonce = txs.find((tx) => tx.nonce)?.nonce;

  if (!firstExplicitNonce) {
    return txs;
  }

  const shift = await getLocalNonceShift({
    targetNonce: firstExplicitNonce,
    address: originalAccountAddress,
    chainServerId: originalChainServerId,
    wallet,
  });

  if (!shift) {
    return txs;
  }

  return txs.map((tx) => {
    if (!tx.nonce) {
      return tx;
    }

    return {
      ...tx,
      nonce: incrementNonce(tx.nonce, shift),
    };
  });
};
