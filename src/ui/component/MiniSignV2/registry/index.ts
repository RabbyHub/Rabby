import { useSyncExternalStore } from 'use-sync-external-store/shim';

import { SignatureManager } from '@/ui/component/MiniSignV2/state/SignatureManager';
import { SignatureFlowState } from '@/ui/component/MiniSignV2/state/types';

type OwnerSubscriber = () => void;

class SignatureRegistry {
  private readonly stores = new Map<string, SignatureManager>();
  private readonly ownerSubscribers = new Set<OwnerSubscriber>();
  private activeOwner = 'global';
  private suspendedOwners: string[] = [];

  private notifyOwnerChange() {
    this.ownerSubscribers.forEach((fn) => fn());
  }

  private createStore(owner: string) {
    return new SignatureManager({
      onReset: () => {
        if (this.activeOwner !== owner) {
          return;
        }
        const previousOwner = this.suspendedOwners.pop();
        this.activeOwner = previousOwner || 'global';
        this.notifyOwnerChange();
      },
    });
  }

  getStore(owner = 'global') {
    if (!this.stores.has(owner)) {
      this.stores.set(owner, this.createStore(owner));
    }
    return this.stores.get(owner)!;
  }

  getActiveOwner() {
    return this.activeOwner;
  }

  getActiveStore() {
    return this.getStore(this.activeOwner);
  }

  activate(owner: string, options?: { suspendCurrent?: boolean }) {
    if (options?.suspendCurrent && this.activeOwner !== owner) {
      this.suspendedOwners = [
        ...this.suspendedOwners.filter((item) => item !== this.activeOwner),
        this.activeOwner,
      ];
    }

    if (this.activeOwner === owner) {
      return this.getStore(owner);
    }

    this.activeOwner = owner;
    this.notifyOwnerChange();
    return this.getStore(owner);
  }

  release(owner: string) {
    this.suspendedOwners = this.suspendedOwners.filter(
      (item) => item !== owner
    );
    if (this.activeOwner !== owner) {
      return;
    }

    const previousOwner = this.suspendedOwners.pop();
    this.activeOwner = previousOwner || 'global';
    this.notifyOwnerChange();
  }

  subscribeOwnerChange(fn: OwnerSubscriber) {
    this.ownerSubscribers.add(fn);
    return () => {
      this.ownerSubscribers.delete(fn);
    };
  }
}

export const signatureRegistry = new SignatureRegistry();

export const getSignatureStore = (owner?: string) =>
  signatureRegistry.getStore(owner);

export const activateSignatureOwner = (
  owner: string,
  options?: { suspendCurrent?: boolean }
) => signatureRegistry.activate(owner, options);

export const releaseSignatureOwner = (owner: string) =>
  signatureRegistry.release(owner);

export const useSignatureStore = <T = SignatureFlowState>(
  selector?: (state: SignatureFlowState) => T,
  owner?: string
) =>
  useSyncExternalStore(
    (onStoreChange) => {
      if (owner) {
        return signatureRegistry.getStore(owner).subscribe(onStoreChange);
      }

      let unsubscribeStore = signatureRegistry
        .getActiveStore()
        .subscribe(onStoreChange);
      const unsubscribeOwner = signatureRegistry.subscribeOwnerChange(() => {
        unsubscribeStore();
        unsubscribeStore = signatureRegistry
          .getActiveStore()
          .subscribe(onStoreChange);
        onStoreChange();
      });

      return () => {
        unsubscribeOwner();
        unsubscribeStore();
      };
    },
    () => {
      const snapshot = owner
        ? signatureRegistry.getStore(owner).getState()
        : signatureRegistry.getActiveStore().getState();
      return (selector ? selector(snapshot) : snapshot) as T;
    },
    () => {
      const snapshot = owner
        ? signatureRegistry.getStore(owner).getState()
        : signatureRegistry.getActiveStore().getState();
      return (selector ? selector(snapshot) : snapshot) as T;
    }
  );

export const signatureStore = {
  getState: () => signatureRegistry.getActiveStore().getState(),
  subscribe: (fn: (state: SignatureFlowState) => void) =>
    signatureRegistry.getActiveStore().subscribe(fn),
  close: () => signatureRegistry.getActiveStore().close(),
  pause: () => signatureRegistry.getActiveStore().pause(),
  prefetch: (...args: Parameters<SignatureManager['prefetch']>) =>
    signatureRegistry.getActiveStore().prefetch(...args),
  openDirect: (...args: Parameters<SignatureManager['openDirect']>) =>
    signatureRegistry.getActiveStore().openDirect(...args),
  startUI: (...args: Parameters<SignatureManager['startUI']>) =>
    signatureRegistry.getActiveStore().startUI(...args),
  updateGasLevel: (...args: Parameters<SignatureManager['updateGasLevel']>) =>
    signatureRegistry.getActiveStore().updateGasLevel(...args),
  updateConfig: (...args: Parameters<SignatureManager['updateConfig']>) =>
    signatureRegistry.getActiveStore().updateConfig(...args),
  setGasMethod: (...args: Parameters<SignatureManager['setGasMethod']>) =>
    signatureRegistry.getActiveStore().setGasMethod(...args),
  toggleGasless: (...args: Parameters<SignatureManager['toggleGasless']>) =>
    signatureRegistry.getActiveStore().toggleGasless(...args),
  send: (...args: Parameters<SignatureManager['send']>) =>
    signatureRegistry.getActiveStore().send(...args),
  retry: (...args: Parameters<SignatureManager['retry']>) =>
    signatureRegistry.getActiveStore().retry(...args),
  resume: (...args: Parameters<SignatureManager['resume']>) =>
    signatureRegistry.getActiveStore().resume(...args),
};
