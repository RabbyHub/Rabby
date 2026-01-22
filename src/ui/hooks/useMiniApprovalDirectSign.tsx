import { GasLevel } from '@rabby-wallet/rabby-api/dist/types';
import { useCallback } from 'react';
import { createContextState } from './contextState';
import React from 'react';
import {
  KEYRING_CLASS,
  KEYRING_TYPE,
  WALLETCONNECT_STATUS_MAP,
} from '@/constant';
import useAsync from 'react-use/lib/useAsync';
import type { RetryUpdateType } from '@/background/utils/errorTxRetry';
import { useApproval, useWallet } from '../utils';
import { createGlobalState } from 'react-use';

export const useDirectSigningGlobal = createGlobalState(false);

export const useDirectSigning = () => useDirectSigningGlobal()[0];
export const useSetDirectSigning = () => useDirectSigningGlobal()[1];

export const DirectSubmitProvider = ({
  children,
}: React.PropsWithChildren<unknown>) => <>{children}</>;

export const useResetDirectSignState = () => {
  const setDirectSigning = useSetDirectSigning();

  const resetState = useCallback(() => {
    setDirectSigning(false);
  }, [setDirectSigning]);

  return resetState;
};

export const AbortedDirectSubmitErrorCode = 'AbortedDirectSubmitError';
export class AbortedDirectSubmitError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;

  constructor(
    message: string,
    code: string = AbortedDirectSubmitErrorCode,
    statusCode?: number
  ) {
    super(message);

    Object.setPrototypeOf(this, new.target.prototype);

    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export const isAbortedDirectSubmitError = (e: any) => {
  if (
    e instanceof AbortedDirectSubmitError &&
    e.code === AbortedDirectSubmitErrorCode
  ) {
    return true;
  }
  return false;
};

export const useStartDirectSigning = () => {
  const setDirectSigning = useSetDirectSigning();

  return useCallback(async () => {
    // const waitingDirectSignReSult = () =>
    //   new Promise<void>((resolve, reject) => {
    //     eventBus.once(EVENTS.DIRECT_SIGN, ({ error }) => {
    //       setDirectSigning(false);
    //       if (!error) {
    //         resolve();
    //       } else {
    //         reject(error);
    //       }
    //     });
    //   });
    setDirectSigning(true);
    // await waitingDirectSignReSult();
  }, [setDirectSigning]);
};

export const supportedDirectSign = (type: string) => {
  return [
    KEYRING_TYPE.SimpleKeyring,
    KEYRING_TYPE.HdKeyring,
    KEYRING_CLASS.HARDWARE.LEDGER,
    KEYRING_CLASS.HARDWARE.ONEKEY,
  ].includes(type);
};

export const supportedHardwareDirectSign = (type: string) => {
  return [
    KEYRING_CLASS.HARDWARE.LEDGER,
    KEYRING_CLASS.HARDWARE.ONEKEY,
  ].includes(type);
};

export const useGetTxFailedResultInWaiting = ({
  nonce,
  chainId,
  status,
  from,
  description,
  showOriginDesc,
}: {
  nonce?: string;
  chainId?: number;
  status: number;
  from?: string;
  description?: string;
  showOriginDesc?: () => string | undefined;
}) => {
  const wallet = useWallet();
  const [getApproval] = useApproval();

  return useAsync<() => Promise<[string, RetryUpdateType]>>(async () => {
    const originDesc = showOriginDesc?.();
    if (originDesc) {
      return [originDesc, 'origin'];
    }

    if (
      ![
        WALLETCONNECT_STATUS_MAP.FAILED,
        WALLETCONNECT_STATUS_MAP.REJECTED,
      ].includes(status)
    ) {
      return [description || '', 'origin'];
    }

    const approval = await getApproval();

    if (approval?.data?.approvalType === 'SignTx' && nonce && chainId && from) {
      const txFailedResult = await wallet.getTxFailedResult(description || '');

      if (txFailedResult?.[1] === 'nonce') {
        const recommendNonce = await wallet.setRetryTxRecommendNonce({
          from: from,
          chainId: chainId,
          nonce: nonce,
        });

        return wallet.getTxFailedResult(description || '', {
          nonce: recommendNonce,
        });
      }

      return txFailedResult;
    }

    return [description, 'origin'] as [string, RetryUpdateType];
  }, [nonce, chainId, status, from, description]);
};
