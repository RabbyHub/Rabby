import React from 'react';
import { useMemoizedFn } from 'ahooks';

import { useWallet } from '@/ui/utils';
import { ApprovalSpenderItemToBeRevoked } from '@/utils/approve';
import { sendTransaction } from '@/ui/utils/sendTransaction';
import { useGasAccountSign } from '@/ui/views/GasAccount/hooks';
import { buildTx } from './useBatchRevokeTask';
import { Account } from '@/background/service/preference';
import { useMiniSigner } from '@/ui/hooks/useSigner';
import { waitForTxCompleted } from '@/ui/utils/transaction';

export const useRevokeOne = ({
  account,
  chainServerId,
}: {
  account: Account;
  chainServerId?: string;
}) => {
  const wallet = useWallet();
  const gasAccount = useGasAccountSign();
  const { openDirect, prefetch, close: closeSign } = useMiniSigner({
    account: account!,
    chainServerId: chainServerId,
    autoResetGasStoreOnChainChange: true,
  });

  return useMemoizedFn(
    async (
      revokeItem: ApprovalSpenderItemToBeRevoked,
      options?: {
        account?: Account;
      }
    ) => {
      closeSign();
      const tx = await buildTx(wallet, revokeItem);
      const result = await openDirect({
        txs: [tx],
        onPreExecChange(p) {
          console.log('pre exec change', p);
        },
      });
      if (!result?.length) {
        throw new Error('No signature result');
      }
      await waitForTxCompleted({
        wallet,
        chainServerId: revokeItem.chainServerId,
        hash: result[0],
      });
      // return sendTransaction({
      //   tx,
      //   wallet,
      //   chainServerId: revokeItem.chainServerId,
      //   sig: gasAccount?.sig,
      //   autoUseGasAccount: true,
      //   account: options?.account,
      // });
    }
  );
};
