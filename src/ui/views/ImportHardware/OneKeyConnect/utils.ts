import {
  CryptoMultiAccounts,
  encodeDataItem,
} from '@keystonehq/bc-ur-registry';
import { UR } from '@ngraveio/bc-ur';

export const findEthAccountByMultiAccounts = (ur: UR): UR | undefined => {
  if (ur.type !== 'crypto-multi-accounts') {
    throw new Error('type not match');
  }

  const accounts = CryptoMultiAccounts.fromCBOR(ur.cbor);
  const ethAccount = accounts.getKeys().find((key) => {
    const origin = key.getOrigin();
    return origin?.getComponents()[1].getIndex() === 60;
  });
  if (ethAccount === undefined) {
    return undefined;
  }

  const dataItem = ethAccount.toDataItem();
  const cbor = encodeDataItem(dataItem);
  return new UR(cbor, 'crypto-hdkey');
};
