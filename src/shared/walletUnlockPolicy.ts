export const WALLET_LOCKED_NEED_UNLOCK = 'WALLET_LOCKED_NEED_UNLOCK';

export class WalletLockedNeedUnlockError extends Error {
  code = WALLET_LOCKED_NEED_UNLOCK;
  data: { method: string };

  constructor(method: string) {
    super('Wallet is locked');
    this.name = 'WalletLockedNeedUnlockError';
    this.data = { method };
  }
}

export const isWalletLockedNeedUnlockError = (error: any) => {
  return error?.code === WALLET_LOCKED_NEED_UNLOCK;
};

export class WalletUnlockCancelledError extends Error {
  constructor() {
    super('User cancelled unlock');
    this.name = 'WalletUnlockCancelledError';
  }
}

export const isWalletUnlockCancelled = (
  error: unknown
): error is WalletUnlockCancelledError =>
  error instanceof WalletUnlockCancelledError ||
  (error instanceof Error && error.name === 'WalletUnlockCancelledError');
