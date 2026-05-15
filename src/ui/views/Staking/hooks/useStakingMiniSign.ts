import React, { useCallback, useMemo } from 'react';
import type { Tx } from '@rabby-wallet/rabby-api/dist/types';

import type { Account } from '@/background/service/preference';
import { usePopupContainer } from '@/ui/hooks/usePopupContainer';
import { useMiniSigner } from '@/ui/hooks/useSigner';

const StakingMiniSignHeader = ({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) =>
  React.createElement(
    'div',
    {
      className:
        'relative h-[56px] w-full flex items-center justify-center text-r-neutral-title1',
    },
    React.createElement(
      'button',
      {
        type: 'button',
        className:
          'absolute left-0 top-1/2 -translate-y-1/2 w-[20px] h-[20px] p-0 border-0 bg-transparent text-r-neutral-title1 flex items-center justify-center',
        onClick: onBack,
        'aria-label': 'Back',
      },
      React.createElement(
        'svg',
        {
          width: 20,
          height: 20,
          viewBox: '0 0 20 20',
          fill: 'none',
          'aria-hidden': true,
        },
        React.createElement('path', {
          d: 'M13.5 3L6.5 10L13.5 17',
          stroke: 'currentColor',
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        })
      )
    ),
    React.createElement(
      'div',
      {
        className:
          'text-[20px] leading-[24px] font-medium text-r-neutral-title1',
      },
      title
    )
  );

export const useStakingMiniSign = ({
  account,
  chainServerId,
}: {
  account: Account;
  chainServerId: string;
}) => {
  const { getContainer } = usePopupContainer();
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
        title: React.createElement(StakingMiniSignHeader, {
          title: trigger,
          onBack: closeSign,
        }),
        showSimulateChange: true,
        enableSecurityEngine: true,
      };

      return openUI(params);
    },
    [baseGa, closeSign, getContainer, openUI, resetGasStore]
  );

  return {
    sign,
  };
};
