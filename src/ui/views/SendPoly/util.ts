import { KEYRING_TYPE } from '@/constant';
import { IDisplayedAccountWithBalance } from '@/ui/models/accountToDisplay';

export const padWatchAccount = (
  address: string
): IDisplayedAccountWithBalance => {
  return {
    address,
    brandName: 'Watch',
    type: KEYRING_TYPE.WatchAddressKeyring,
    alianName: 'Watch',
    balance: 0,
    keyring: null as any,
  };
};
