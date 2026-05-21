import React, { useCallback, useMemo } from 'react';
import type { Tx } from '@rabby-wallet/rabby-api/dist/types';

import type { Account } from '@/background/service/preference';
import { IconWithChain } from '@/ui/component/TokenWithChain';
import { useMiniSigner } from '@/ui/hooks/useSigner';

const StakingSignHeader = ({
  logo,
  chain,
  title,
}: {
  logo?: string;
  chain?: string;
  title: string;
}) => {
  return React.createElement(
    'div',
    {
      className: 'flex flex-col items-center w-full justify-center mb-[-6px]',
    },
    React.createElement(
      'div',
      { className: 'flex items-center justify-center w-full' },
      React.createElement(IconWithChain, {
        iconUrl: logo,
        chainServerId: chain || 'eth',
        width: '24px',
        height: '24px',
        isShowChainTooltip: true,
      }),
      React.createElement(
        'div',
        {
          className: 'ml-[8px] font-medium text-[20px] text-r-neutral-title-1',
        },
        title
      )
    )
  );
};

export const useStakingMiniSign = ({
  account,
  chainServerId,
}: {
  account: Account;
  chainServerId: string;
}) => {
  const { openUI, resetGasStore, close: closeSign } = useMiniSigner({
    account,
    chainServerId,
    autoResetGasStoreOnChainChange: true,
  });

  const baseGa = useMemo(
    () => ({
      category: 'Staking',
      source: 'Staking',
    }),
    []
  );

  const sign = useCallback(
    async ({
      txs,
      trigger,
      logo,
    }: {
      txs: Tx[];
      trigger: string;
      logo?: string;
    }) => {
      resetGasStore();
      closeSign();
      return openUI({
        txs,
        ga: {
          ...baseGa,
          trigger,
        },
        title: React.createElement(StakingSignHeader, {
          title: trigger,
          logo,
          chain: chainServerId,
        }),
        showSimulateChange: true,
        disableSignBtn: false,
      });
    },
    [baseGa, chainServerId, closeSign, openUI, resetGasStore]
  );

  return {
    sign,
  };
};
