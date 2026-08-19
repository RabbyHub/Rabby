import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';
import { onWalletReconnect, wallet } from '@/ui/wallet';
import { create } from 'zustand';

export type WalletStatusState = {
  isBooted: boolean;
  isUnlocked: boolean;
  isInitialized: boolean;
  isSyncing: boolean;
};

type WalletStatusActions = {
  sync: () => Promise<void>;
};

export type WalletStatusStore = WalletStatusState & WalletStatusActions;

const initialState: WalletStatusState = {
  isBooted: false,
  isUnlocked: false,
  isInitialized: false,
  isSyncing: false,
};

export type PrivateRouteDecision = 'pending' | 'render' | 'redirect';

/**
 * Decides what a guarded route shows for a given wallet-status snapshot.
 * Kept pure and free of React so the lock gating can be tested directly.
 */
export const resolvePrivateRouteDecision = ({
  isInitialized,
  isSyncing,
  isUnlocked,
  pathname,
}: Pick<WalletStatusState, 'isInitialized' | 'isSyncing' | 'isUnlocked'> & {
  pathname: string;
}): PrivateRouteDecision => {
  // Waiting on a locked snapshot keeps an unlock navigation from bouncing
  // straight back to /unlock. An already-unlocked snapshot stays on screen
  // while it refreshes: background reconnects (MV3 service-worker restarts)
  // resync every time, and blanking would unmount the whole protected tree,
  // discarding in-flight approval, import and send state.
  if (!isInitialized || (isSyncing && !isUnlocked)) {
    return 'pending';
  }
  // Keep children mounted across route switches (keep-alive).
  if (isUnlocked) {
    return 'render';
  }
  // Guards keep running on /unlock; redirecting again would nest `from` and loop.
  if (pathname === '/unlock') {
    return 'pending';
  }
  return 'redirect';
};

let latestSyncRequest = 0;
let subscribed = false;

export const useWalletStatusStore = create<WalletStatusStore>()(() => ({
  ...initialState,
  sync: syncWalletStatus,
}));

/**
 * Refreshes the UI snapshot from the background's authoritative keyring state.
 * A request id prevents an older response from overwriting a newer lifecycle
 * update when lock/unlock events arrive close together.
 */
export async function syncWalletStatus() {
  const request = ++latestSyncRequest;
  useWalletStatusStore.setState({ isSyncing: true });

  try {
    const status = await wallet.getWalletStatus();
    if (request !== latestSyncRequest) return;

    useWalletStatusStore.setState({
      isBooted: status.isBooted,
      isUnlocked: status.isUnlocked,
      isInitialized: true,
      isSyncing: false,
    });
  } catch (error) {
    if (request === latestSyncRequest) {
      // Fail closed. Keeping the previous snapshot would leave a page gated on
      // a stale `isUnlocked: true` with no revalidation path, so an unreadable
      // status is treated as locked until a later sync proves otherwise.
      useWalletStatusStore.setState({ isUnlocked: false, isSyncing: false });
    }
    throw error;
  }
}

const syncAfterWalletEvent = () => {
  void syncWalletStatus().catch((error) => {
    console.error('[walletStatusStore] failed to sync wallet status', error);
  });
};

const syncAfterLock = () => {
  // Hide protected content immediately. The authoritative refresh below also
  // updates booted state and protects against stale or reordered broadcasts.
  useWalletStatusStore.setState({ isUnlocked: false });
  syncAfterWalletEvent();
};

const subscribeWalletStatus = () => {
  if (subscribed) return;
  subscribed = true;

  eventBus.addEventListener(EVENTS.UNLOCK_WALLET, syncAfterWalletEvent);
  eventBus.addEventListener(EVENTS.LOCK_WALLET, syncAfterLock);
  // No optimistic write here: a reset can clear `booted` without locking, so
  // the authoritative read decides rather than an assumption about direction.
  eventBus.addEventListener(EVENTS.WALLET_STATUS_CHANGED, syncAfterWalletEvent);
  onWalletReconnect(syncAfterWalletEvent);
};

/** Initializes the singleton store and its process-lifetime subscriptions. */
export const initializeWalletStatusStore = () => {
  subscribeWalletStatus();
  return syncWalletStatus();
};
