import { useCallback } from 'react';
import { useWallet } from '@/ui/utils';
import { addAddressFromSeedPhrase } from '@/ui/utils/addAddressFromSeedPhrase';

/**
 * Hook that provides a function to add a new address from a seed phrase
 * @returns A function that takes a public key and adds a new address from the seed phrase
 */
export const useAddAddressFromSeedPhrase = () => {
  const wallet = useWallet();

  const addAddress = useCallback(
    async (publicKey: string) => {
      if (!publicKey) {
        throw new Error('Public key is required');
      }

      return addAddressFromSeedPhrase(wallet, publicKey);
    },
    [wallet]
  );

  return addAddress;
};
