import React, { ReactNode, useEffect, useState } from 'react';
import { createContext, useContext } from 'react';
import { useRabbyDispatch } from '../store';
import {
  BROADCAST_TO_UI_EVENTS,
  BROADCAST_TO_UI_EVENTS_PAYLOAD,
  runBroadcastDispose,
} from '@/utils/broadcastToUI';
import { onBroadcastToUI } from './broadcastToUI';
import { isSameAddress } from '.';
import { useCurrentAccount } from '../hooks/backgroundState/useAccount';

function useSyncCurrentAccount() {
  const dispatch = useRabbyDispatch();

  useEffect(() => {
    const onAccountsChanged = (
      account: BROADCAST_TO_UI_EVENTS_PAYLOAD['accountsChanged']
    ) => {
      dispatch.account.setCurrentAccount({
        currentAccount: {
          ...account,
          type: account.type || '',
        },
      });
      dispatch.account.onAccountChanged(account.address);
    };

    const disposes = [
      onBroadcastToUI(
        BROADCAST_TO_UI_EVENTS.accountsChanged,
        onAccountsChanged
      ),
    ];

    return () => {
      runBroadcastDispose(disposes);
    };
  }, [dispatch.account]);
}

export function withAccountChange<P>(WrappedComponent: React.ComponentType<P>) {
  const ComponentWithAccountChange = (props: P) => {
    const account = useCurrentAccount();
    useSyncCurrentAccount();
    return (
      <WrappedComponent
        {...props}
        key={`${account?.address}-${account?.type}`}
      />
    );
  };
  return ComponentWithAccountChange;
}
