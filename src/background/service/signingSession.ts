import { ethErrors } from 'eth-rpc-errors';
import { KEYRING_TYPE } from '@/constant';

// These keyrings call eth_sendTransaction in the remote wallet and return its
// transaction hash. Hardware keyrings return signatures for Rabby to broadcast.
export const isBroadcastTransactionHash = (
  keyringType: string,
  result: unknown
): result is string =>
  (keyringType === KEYRING_TYPE.WalletConnectKeyring ||
    keyringType === KEYRING_TYPE.CoinbaseKeyring) &&
  typeof result === 'string' &&
  /^0x[0-9a-f]{64}$/i.test(result);

let revision = 0;

// A restored account or unlocked wallet must not revive earlier consent.
export const invalidateSigningSession = () => {
  revision += 1;
};

export const createSigningSessionGuard = (
  isUnlocked: () => boolean,
  signal?: AbortSignal
) => {
  const startedIn = revision;
  const assertCurrent = () => {
    if (startedIn !== revision || !isUnlocked() || signal?.aborted) {
      throw ethErrors.provider.userRejectedRequest(
        'Signing request is no longer active'
      );
    }
  };
  assertCurrent();
  return assertCurrent;
};
