import { keyringService } from '@/background/service';
import type { Account } from '@/background/service/preference';
import type GnosisKeyring from '@/background/service/keyring/eth-gnosis-keyring';
import { createSigningSessionGuard } from '@/background/service/signingSession';
import { KEYRING_TYPE } from '@/constant';
import type { SigningResult } from '@/utils/signingTypes';
import { adjustVInSignature } from '@safe-global/protocol-kit/dist/src/utils';
import {
  EthSafeSignature,
  hashSafeMessage,
  SigningMethod,
} from '@safe-global/protocol-kit';
import { TypedDataUtils, SignTypedDataVersion } from '@metamask/eth-sig-util';
import { bytesToHex } from '@ethereumjs/util';
import { utils as ethersUtils } from 'ethers';
import * as Sentry from '@sentry/browser';
import { isSigningCarrierReported, takeSigningCarrier } from '@/utils/sentry';
import { createSafeService } from '@/background/utils/safe';
import { poll } from '@/utils/poll';

export const gnosisController = {
  // Signing and submitting a Safe signature is one background operation.
  // Waiting pages only display its result; they never submit it a second time.
  sign: async ({
    account,
    data,
    isMessage,
    signal,
  }: {
    account: Account;
    data: Parameters<typeof TypedDataUtils.eip712Hash>[0];
    isMessage: boolean;
    signal: AbortSignal;
  }): Promise<SigningResult> => {
    const assertSession = createSigningSessionGuard(
      () => keyringService.isUnlocked(),
      signal
    );
    let signed = false;
    try {
      const gnosis:
        | GnosisKeyring
        | undefined = keyringService.getKeyringsByType(
        KEYRING_TYPE.GnosisKeyring
      )[0];
      const safe = gnosis?.safeInstance;
      const transaction = isMessage ? null : gnosis?.currentTransaction;
      const message = isMessage ? gnosis?.currentSafeMessage : null;
      const target = message || transaction;
      if (!gnosis || !safe || !target) throw new Error('No Safe signing data');
      const assertCurrent = () => {
        assertSession();
        if (
          gnosis.safeInstance !== safe ||
          (isMessage
            ? gnosis.currentSafeMessage
            : gnosis.currentTransaction) !== target
        )
          throw new Error('Safe signing data changed');
      };
      assertCurrent();
      const hash = message
        ? await safe.getSafeMessageHash(hashSafeMessage(message.data))
        : await safe.getTransactionHash(transaction!);
      assertCurrent();
      // The singleton may have changed even before this waiting page opened.
      // Compare the signed content, not just the current object's identity.
      if (
        bytesToHex(TypedDataUtils.eip712Hash(data, SignTypedDataVersion.V4)) !==
        hash.toLowerCase()
      )
        throw new Error('Safe signing data changed');
      const sender = transaction
        ? await safe.provider.getSigner(0).getAddress()
        : undefined;
      assertCurrent();
      const keyring = await keyringService.getKeyringForAccount(
        account.address,
        account.type
      );
      assertCurrent();
      const rawSignature = await keyringService.signTypedMessage(
        keyring,
        { from: account.address, data },
        { brandName: account.brandName, version: 'V4' }
      );
      assertCurrent();
      signed = true;
      const signature = await adjustVInSignature(
        SigningMethod.ETH_SIGN_TYPED_DATA,
        rawSignature
      );
      assertCurrent();
      const confirming = target.signatures.size > 0;
      const safeSignature = new EthSafeSignature(account.address, signature);
      target.addSignature(safeSignature);
      if (message) {
        if (confirming) {
          await safe.addMessageSignature(hash, safeSignature.data);
        } else {
          await safe.addMessage({ safeMessage: message });
        }
      } else if (confirming) {
        await safe.request.confirmTransaction(hash, { signature });
      } else {
        // All asynchronous preparation is complete. Calling the request here
        // keeps cancellation checks after the SDK's hash and signer lookups.
        try {
          await safe.request.postTransactions(safe.safeAddress, {
            ...transaction!.data,
            safe: ethersUtils.getAddress(safe.safeAddress),
            to: ethersUtils.getAddress(transaction!.data.to),
            contractTransactionHash: hash,
            sender: ethersUtils.getAddress(sender!),
            signature: transaction!.encodedSignatures(),
          });
        } catch (e) {
          const errors = e?.response?.data;
          const first = errors && errors[Object.keys(errors)[0]];
          throw new Error(Array.isArray(first) ? first[0] : e.message);
        }
      }
      assertCurrent();
      return { success: true, data: signature };
    } catch (e) {
      if (!signed && !signal.aborted) {
        const carrier = takeSigningCarrier(e);
        if (carrier) {
          if (!isSigningCarrierReported(carrier))
            Sentry.captureException(carrier);
        } else if (e && typeof e === 'object') {
          Sentry.captureException(e);
        }
      }
      return {
        success: false,
        errorMsg: e.message,
        errorStage: signed ? 'gnosis' : undefined,
      };
    }
  },
  watchMessage: async ({
    address,
    chainId,
    safeMessageHash,
    pollingInterval = 10000,
  }: {
    address: string;
    chainId: number;
    safeMessageHash: string;
    pollingInterval?: number;
  }) => {
    const safe = await createSafeService({
      address,
      networkId: String(chainId),
    });
    const threshold = await safe.getThreshold();

    // todo: manual destroy
    return new Promise((resolve, reject) => {
      poll(
        async ({ unpoll }) => {
          const res = await safe.getMessage(safeMessageHash);
          if (res.confirmations.length >= threshold) {
            resolve(res.preparedSignature);
            unpoll();
          }
        },
        {
          interval: pollingInterval,
          emitOnBegin: true,
        }
      );
    });
  },
};
