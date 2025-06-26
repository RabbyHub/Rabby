import { KEYRING_TYPE } from '@/constant';
import { IDisplayedAccountWithBalance } from '@/ui/models/accountToDisplay';
import { ellipsisAddress } from '@/ui/utils/address';

export const padWatchAccount = (
  address: string
): IDisplayedAccountWithBalance => {
  return {
    address,
    brandName: KEYRING_TYPE.WatchAddressKeyring,
    type: KEYRING_TYPE.WatchAddressKeyring,
    alianName: ellipsisAddress(address),
    balance: 0,
    keyring: null as any,
  };
};
