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
      useWalletStatusStore.setState({ isSyncing: false });
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
  onWalletReconnect(syncAfterWalletEvent);
};

/** Initializes the singleton store and its process-lifetime subscriptions. */
export const initializeWalletStatusStore = () => {
  subscribeWalletStatus();
  return syncWalletStatus();
};
