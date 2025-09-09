import { keyringService } from '@/background/service';
import OneKeyKeyring from '@/background/service/keyring/eth-onekey-keyring/eth-onekey-keyring';
import { KEYRING_CLASS } from '@/constant';
import { toChecksumAddress } from '@ethereumjs/util';

export const fixKeyringAccountOnSigned = async ({
  keyring,
  address,
}: {
  keyring: any;
  address: string;
}) => {
  if (keyring.type === KEYRING_CLASS.HARDWARE.ONEKEY) {
    const currentKeyring = keyring as OneKeyKeyring;
    const accountDetails =
      currentKeyring.accountDetails[toChecksumAddress(address)];

    if (!accountDetails.version) {
      currentKeyring.accountDetails[toChecksumAddress(address)] = {
        ...accountDetails,
        version: 2,
        passphraseState: currentKeyring.passphraseState,
      };

      await keyringService.addNewAccount(currentKeyring);
    }
  }
};
