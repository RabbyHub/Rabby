/* eslint "react-hooks/exhaustive-deps": ["error"] */
/* eslint-enable react-hooks/exhaustive-deps */
import { useEffect, useMemo } from 'react';

import {
  BROADCAST_TO_UI_EVENTS,
  BROADCAST_TO_UI_EVENTS_PAYLOAD,
  runBroadcastDispose,
} from '@/utils/broadcastToUI';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { onBroadcastToUI } from '@/ui/utils/broadcastToUI';
import { isSameAddress } from '@/ui/utils';
import { useMemoizedFn } from 'ahooks';
import { Account } from '@/background/service/preference';
import { AccountScene } from '@/constant/scene-account';
import { useContactAlias } from '@/ui/state/contactBook';

const useAccountWithAlias = (account: Account | null | undefined) => {
  const alias = useContactAlias(account?.address);

  return useMemo(() => (account ? { ...account, alianName: alias } : null), [
    account,
    alias,
  ]);
};

export function useCurrentAccount(options?: {
  onChanged?: (ctx: { reason: 'currentAccount'; address: string }) => void;
}) {
  const storedCurrentAccount = useRabbySelector(
    (s) => s.account.currentAccount
  );
  const currentAccount = useAccountWithAlias(storedCurrentAccount);

  const { onChanged } = options || {};

  useEffect(() => {
    const onAccountsChanged = (
      payload: BROADCAST_TO_UI_EVENTS_PAYLOAD['accountsChanged']
    ) => {
      onChanged?.({ reason: 'currentAccount', address: payload?.address });
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
  }, [onChanged]);

  return currentAccount;
}

export function useSceneAccount(options?: { scene: AccountScene }) {
  const dispatch = useRabbyDispatch();
  const { scene } = options || {};

  const storedCurrentAccount = useRabbySelector((s) => {
    return scene
      ? s.account.sceneAccountMap?.[scene] || s.account.currentAccount
      : s.account.currentAccount;
  });
  const currentAccount = useAccountWithAlias(storedCurrentAccount);

  const switchCurrentAccount = useMemoizedFn((account: Account) => {
    if (!scene) {
      return dispatch.account.changeAccountAsync(account);
    }
    return dispatch.account.switchSceneAccount({
      scene,
      account,
    });
  });

  return [currentAccount, switchCurrentAccount] as const;
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

export function useSceneAccountInfo() {
  const dispatch = useRabbyDispatch();
  const storedCurrentAccount = useRabbySelector(
    (s) => s.account.currentAccount
  );
  const currentAccount = useAccountWithAlias(storedCurrentAccount);

  const switchCurrentAccount = useMemoizedFn((account: Account) => {
    return dispatch.account.changeAccountAsync(account);
  });

  return {
    currentAccount,
    switchCurrentAccount,
  };
}
