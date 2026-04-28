import type { DrawerProps, ModalProps } from 'antd';
import { t } from 'i18next';
import AuthenticationModalPromise from '@/ui/component/AuthenticationModal';
import type { WalletControllerType } from './WalletContext';

export type UnlockModalContainer =
  | DrawerProps['getContainer']
  | ModalProps['getContainer'];

export class WalletUnlockCancelledError extends Error {
  constructor() {
    super('User cancelled unlock');
    this.name = 'WalletUnlockCancelledError';
  }
}

export const isWalletUnlockCancelled = (
  error: unknown
): error is WalletUnlockCancelledError =>
  error instanceof WalletUnlockCancelledError;

let pendingUnlockPromise: Promise<void> | null = null;

export const ensureWalletUnlocked = async (params: {
  wallet: WalletControllerType;
  getContainer?: UnlockModalContainer;
}) => {
  const { wallet, getContainer } = params;

  if (await wallet.isUnlocked()) {
    return;
  }

  if (!pendingUnlockPromise) {
    pendingUnlockPromise = AuthenticationModalPromise({
      wallet,
      confirmText: t('global.confirm'),
      cancelText: t('global.Cancel'),
      placeholder: t('page.unlock.password.placeholder'),
      title: t('page.unlock.title'),
      getContainer: getContainer || undefined,
      forceRender: true,
      validationHandler: async (password: string) => {
        await wallet.unlock(password);
      },
    })
      .catch((error) => {
        throw error instanceof Error ? error : new WalletUnlockCancelledError();
      })
      .finally(() => {
        pendingUnlockPromise = null;
      });
  }

  return pendingUnlockPromise;
};

export const verifyPasswordOrUnlock = async (params: {
  wallet: WalletControllerType;
  password: string;
}) => {
  const { wallet, password } = params;

  if (await wallet.isUnlocked()) {
    await wallet.verifyPassword(password);
    return;
  }

  await wallet.unlock(password);
};
