import { useMemoizedFn } from 'ahooks';

import { Account } from '@/background/service/preference';
import { MINI_SIGN_ERROR } from '@/ui/component/MiniSignV2/state/SignatureManager';
import { useMiniSigner } from '@/ui/hooks/useSigner';
import { useWallet } from '@/ui/utils';
import { ApprovalSpenderItemToBeRevoked } from '@/utils/approve';
import { buildTx } from './useBatchRevokeTask';

export const useRevokeOne = ({
  account,
  chainServerId,
}: {
  account: Account;
  chainServerId?: string;
}) => {
  const wallet = useWallet();
  const { openDirect, prefetch, close: closeSign } = useMiniSigner({
    account: account!,
    chainServerId: chainServerId,
    autoResetGasStoreOnChainChange: true,
  });

  return useMemoizedFn(async (revokeItem: ApprovalSpenderItemToBeRevoked) => {
    const tx = await buildTx(wallet, revokeItem);
    try {
      closeSign();
      const result = await openDirect({
        txs: [tx],
        onPreExecChange(p) {
          console.log('pre exec change', p);
        },
      });
      if (!result?.length) {
        throw new Error('No signature result');
      }
    } catch (error) {
      console.error('Revoke approval failed', error);
      if (
        error === MINI_SIGN_ERROR.USER_CANCELLED ||
        error === MINI_SIGN_ERROR.CANT_PROCESS
      ) {
        return;
      }
      return wallet.sendRequest({
        method: 'eth_sendTransaction',
        params: [tx],
      });
    }
  });
};
