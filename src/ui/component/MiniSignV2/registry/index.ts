import { useSyncExternalStore } from 'use-sync-external-store/shim';

import { SignatureManager } from '../state/SignatureManager';

class SignatureManagerRegistry {
  private instances = new Map<string, SignatureManager>();
  private listeners = new Set<() => void>();
  private snapshot: SignatureManager[] = [];

  add(instance: SignatureManager): void {
    if (this.instances.has(instance.instanceId)) {
      return;
    }
    this.instances.set(instance.instanceId, instance);
    this.updateSnapshot();
    this.scheduleEmit();
  }

  private emitScheduled = false;

  private scheduleEmit() {
    if (this.emitScheduled) {
      return;
    }
    this.emitScheduled = true;
    Promise.resolve().then(() => {
      this.emitScheduled = false;
      this.emit();
    });
  }

  destroy(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      return;
    }
    instance.reset();
    this.instances.delete(instanceId);
    this.updateSnapshot();
    this.emit();
  }

  get(instanceId: string): SignatureManager | undefined {
    return this.instances.get(instanceId);
  }

  getSnapshot = (): SignatureManager[] => {
    return this.snapshot;
  };

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  private updateSnapshot() {
    this.snapshot = Array.from(this.instances.values());
  }

  private emit() {
    for (const fn of this.listeners) {
      fn();
    }
  }
}

export const registry = new SignatureManagerRegistry();

export const useRegistryInstances = (): SignatureManager[] =>
  useSyncExternalStore(registry.subscribe, registry.getSnapshot);
