import { useMemo } from 'react';

import { DBK_CHAIN_ID } from '@/constant';
import { useWallet } from '@/ui/utils';
import { createL1Client, createL2Client } from '../../../utils';

export const useCreateViemClient = () => {
  const wallet = useWallet();

  const clientL1 = useMemo(() => createL1Client({ chainId: 1, wallet }), []);

  const clientL2 = useMemo(
    () => createL2Client({ chainId: DBK_CHAIN_ID, wallet }),
    []
  );

  return {
    clientL1,
    clientL2,
  };
};
