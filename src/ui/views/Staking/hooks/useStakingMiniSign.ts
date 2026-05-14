import { useCallback, useMemo } from 'react';
import type { Tx } from '@rabby-wallet/rabby-api/dist/types';

import type { Account } from '@/background/service/preference';
import { MINI_SIGN_ERROR } from '@/ui/component/MiniSignV2/state/SignatureManager';
import { usePopupContainer } from '@/ui/hooks/usePopupContainer';
import { supportedDirectSign } from '@/ui/hooks/useMiniApprovalDirectSign';
import { useMiniSigner } from '@/ui/hooks/useSigner';
import { findChainByServerID } from '@/utils/chain';

export const useStakingMiniSign = ({
  account,
  chainServerId,
}: {
  account: Account;
  chainServerId: string;
}) => {
  const { getContainer } = usePopupContainer();
  const { openDirect, openUI, resetGasStore, close: closeSign } = useMiniSigner(
    {
      account,
      chainServerId,
      autoResetGasStoreOnChainChange: true,
    }
  );
  const chainInfo = findChainByServerID(chainServerId);
  const canDirectSign =
    !!chainInfo &&
    !chainInfo.isTestnet &&
    supportedDirectSign(account.type || '');

  const baseGa = useMemo(
    () => ({
      category: 'Staking',
      source: 'Staking',
    }),
    []
  );

  const sign = useCallback(
    async ({ txs, trigger }: { txs: Tx[]; trigger: string }) => {
      resetGasStore();
      closeSign();

      const params = {
        txs,
        getContainer,
        checkGasFeeTooHigh: true,
        ga: {
          ...baseGa,
          trigger,
        },
      };

      if (!canDirectSign) {
        return openUI(params);
      }

      try {
        return await openDirect(params);
      } catch (error) {
        if (
          error === MINI_SIGN_ERROR.GAS_NOT_ENOUGH ||
          error === MINI_SIGN_ERROR.GAS_FEE_TOO_HIGH
        ) {
          closeSign();
          return openUI(params);
        }

        throw error;
      }
    },
    [
      baseGa,
      canDirectSign,
      closeSign,
      getContainer,
      openDirect,
      openUI,
      resetGasStore,
    ]
  );

  return {
    sign,
  };
};
