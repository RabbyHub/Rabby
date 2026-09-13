import { useAccountStore } from '@/ui/state/account';
import { initializeBridgeStore } from '@/ui/state/bridge';
import { initializeContactBookStore } from '@/ui/state/contactBook';
import { initializeGiftStore } from '@/ui/state/gift';
import { initializeGasAccountStore } from '@/ui/state/gasAccount';
import { initializePerpsStore } from '@/ui/state/perps';
import { initializePreferenceStore } from '@/ui/state/preference';

/** Initializes UI business stores after the wallet status is available. */
export const initializeBizStores = () => {
  const accountInitialization = (async () => {
    const accountStore = useAccountStore.getState();
    const account = await accountStore.getCurrentAccountAsync();
    await accountStore.onAccountChanged(account?.address);
    await initializeGiftStore();
    await accountStore.getSceneAccountMap();
  })();

  void initializePreferenceStore();
  void initializeBridgeStore();
  void initializeContactBookStore().catch(() => undefined);
  void initializeGasAccountStore();
  initializePerpsStore();

  return accountInitialization;
};
