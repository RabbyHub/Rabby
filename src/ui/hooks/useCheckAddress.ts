import { useState } from 'react';
import { useAsync } from 'react-use';
import { useWallet } from '../utils';
import { Chain } from '@debank/common';
import { isValidAddress } from 'ethereumjs-util';
import { hexToString } from 'web3-utils';

const enum AddressType {
  EOA = 'EOA',
  CONTRACT = 'CONTRACT',
  UNKNOWN = 'UNKNOWN',
}

export function useCheckAddressType(
  addr: string,
  chain?: Pick<Chain, 'serverId' | 'enum'> | null
) {
  const [addressType, setAddressType] = useState<AddressType>(
    AddressType.UNKNOWN
  );
  const wallet = useWallet();

  useAsync(async () => {
    if (!chain || !isValidAddress(addr)) {
      setAddressType(AddressType.UNKNOWN);
      return;
    }

    try {
      const code = await wallet.requestETHRpc(
        {
          method: 'eth_getCode',
          params: [addr, 'latest'],
        },
        chain.serverId
      );

      if (code === '0x' || code === '0x0') {
        setAddressType(AddressType.EOA);
      } else {
        setAddressType(AddressType.CONTRACT);
      }
    } catch (e) {
      setAddressType(AddressType.UNKNOWN);
    }
  }, [addr]);

  return {
    addressType,
  };
}
