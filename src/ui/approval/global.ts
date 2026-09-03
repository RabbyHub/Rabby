import type { WalletControllerType } from '@/ui/utils/WalletContext';

export const getCurrentApproval = (
  wallet: Pick<WalletControllerType, 'getCurrentApproval'>
) => wallet.getCurrentApproval();
