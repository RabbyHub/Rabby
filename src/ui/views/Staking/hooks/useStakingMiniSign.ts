import React, { useCallback, useMemo } from 'react';
import type { Tx } from '@rabby-wallet/rabby-api/dist/types';

import type { Account } from '@/background/service/preference';
import { usePopupContainer } from '@/ui/hooks/usePopupContainer';
import { useMiniSigner } from '@/ui/hooks/useSigner';

const STAKING_MINI_SIGN_BODY_CLASS = 'staking-mini-sign-active';

const STAKING_MINI_SIGN_STYLE = `
  body.${STAKING_MINI_SIGN_BODY_CLASS} .custom-popup.is-support-darkmode .ant-drawer-content-wrapper {
    max-height: 100vh !important;
  }

  body.${STAKING_MINI_SIGN_BODY_CLASS} .custom-popup.is-support-darkmode .ant-drawer-content {
    max-height: 100vh;
    overflow: hidden;
  }

  body.${STAKING_MINI_SIGN_BODY_CLASS} .custom-popup.is-support-darkmode .ant-drawer-body {
    max-height: 100vh;
    overflow-y: auto;
  }
`;

const StakingMiniSignHeader = ({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) =>
  React.createElement(
    React.Fragment,
    null,
    React.createElement('style', null, STAKING_MINI_SIGN_STYLE),
    React.createElement(
      'div',
      {
        className:
          'staking-mini-sign-header relative min-h-[24px] w-full flex items-center justify-center text-r-neutral-title1 mb-[-6px]',
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
      document.body.classList.add(STAKING_MINI_SIGN_BODY_CLASS);

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

      try {
        return await openUI(params);
      } finally {
        document.body.classList.remove(STAKING_MINI_SIGN_BODY_CLASS);
      }
    },
    [baseGa, closeSign, getContainer, openUI, resetGasStore]
  );

  return {
    sign,
  };
};
