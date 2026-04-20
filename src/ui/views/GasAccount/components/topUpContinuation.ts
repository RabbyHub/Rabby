import { isSameAddress } from '@/ui/utils';
import { Tx } from '@rabby-wallet/rabby-api/dist/types';
import BigNumber from 'bignumber.js';

export type GasAccountTopUpResult =
  | {
      type: 'token';
      ownerAddress: string;
      chainServerId: string;
      usedNonce?: string;
    }
  | {
      type: 'pay';
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

const incrementNonce = (nonce: string) => {
  const toHex = (value: BigNumber) => `0x${value.toString(16)}`;

  if (nonce.startsWith('0x')) {
    return toHex(new BigNumber(nonce.slice(2), 16).plus(1));
  }

  return toHex(new BigNumber(nonce).plus(1));
};

const normalizeNonce = (nonce: string) => {
  if (nonce.startsWith('0x')) {
    return nonce.toLowerCase();
  }

  return `0x${new BigNumber(nonce).toString(16)}`;
};

export const getBumpedNonceAfterTopUp = ({
  currentNonce,
  originalAccountAddress,
  originalChainServerId,
  topUpResult,
}: {
  currentNonce?: string;
  originalAccountAddress: string;
  originalChainServerId: string;
  topUpResult: GasAccountTopUpResult;
}) => {
  const usedNonce =
    topUpResult.type === 'token' ? topUpResult.usedNonce : undefined;

  if (!currentNonce || !usedNonce) {
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

  if (normalizeNonce(currentNonce) !== normalizeNonce(usedNonce)) {
    return currentNonce;
  }

  return incrementNonce(currentNonce);
};

export const buildTopUpResumedTxs = ({
  txs,
  originalAccountAddress,
  originalChainServerId,
  topUpResult,
}: {
  txs: Tx[];
  originalAccountAddress: string;
  originalChainServerId: string;
  topUpResult: GasAccountTopUpResult;
}) => {
  const usedNonce =
    topUpResult.type === 'token' ? topUpResult.usedNonce : undefined;

  if (
    !shouldUpdateOriginalTxNonceAfterTopUp({
      originalAccountAddress,
      originalChainServerId,
      topUpResult,
    })
  ) {
    return txs;
  }

  if (!usedNonce) {
    return txs;
  }

  const firstExplicitNonce = txs.find((tx) => tx.nonce)?.nonce;

  if (!firstExplicitNonce) {
    return txs;
  }

  if (normalizeNonce(firstExplicitNonce) !== normalizeNonce(usedNonce)) {
    return txs;
  }

  return txs.map((tx) => {
    if (!tx.nonce) {
      return tx;
    }

    return {
      ...tx,
      nonce: incrementNonce(tx.nonce),
    };
  });
};
