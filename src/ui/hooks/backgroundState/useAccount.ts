/* eslint "react-hooks/exhaustive-deps": ["error"] */
/* eslint-enable react-hooks/exhaustive-deps */
import { useEffect } from 'react';

import {
  BROADCAST_TO_UI_EVENTS,
  BROADCAST_TO_UI_EVENTS_PAYLOAD,
  runBroadcastDispose,
} from '@/utils/broadcastToUI';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { onBroadcastToUI } from '@/ui/utils/broadcastToUI';
import { isSameAddress } from '@/ui/utils';

export function useCurrentAccount(options?: {
  onChanged?: (ctx: {
    reason: 'aliasName' | 'currentAccount';
    address: string;
  }) => void;
}) {
  const dispatch = useRabbyDispatch();

  const currentAccount = useRabbySelector((s) => s.account.currentAccount);

  const { onChanged } = options || {};

  useEffect(() => {
    const onAccountsChanged = (
      payload: BROADCAST_TO_UI_EVENTS_PAYLOAD['accountsChanged']
    ) => {
      onChanged?.({ reason: 'currentAccount', address: payload?.address });
    };

    const onAliasNameChanged = (
      payload: BROADCAST_TO_UI_EVENTS_PAYLOAD['accountAliasNameChanged']
    ) => {
      if (!currentAccount) return;
      onChanged?.({ reason: 'aliasName', address: payload?.address });
      if (payload.address === currentAccount.address) {
        dispatch.account.fetchCurrentAccountAliasNameAsync();
      }
    };

    const disposes = [
      onBroadcastToUI(
        BROADCAST_TO_UI_EVENTS.accountsChanged,
        onAccountsChanged
      ),
      onBroadcastToUI(
        BROADCAST_TO_UI_EVENTS.accountAliasNameChanged,
        onAliasNameChanged
      ),
    ];

    return () => {
      runBroadcastDispose(disposes);
    };
  }, [currentAccount, onChanged, dispatch.account]);

  return currentAccount;
}

export function useSubscribeCurrentAccountChanged() {
  const dispatch = useRabbyDispatch();

  useEffect(() => {
    const onAccountsChanged = (
      account: BROADCAST_TO_UI_EVENTS_PAYLOAD['accountsChanged']
    ) => {
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

/**
 * @description reload whole page on current account changed
 */
export function useReloadPageOnCurrentAccountChanged() {
  const currentAccount = useRabbySelector((s) => s.account.currentAccount);

  useEffect(() => {
    const onAccountsChanged = (
      account: BROADCAST_TO_UI_EVENTS_PAYLOAD['accountsChanged']
    ) => {
      if (
        currentAccount &&
        currentAccount.address &&
        !isSameAddress(currentAccount.address, account.address)
      ) {
        window.location.reload();
      }
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
  }, [currentAccount]);
}
