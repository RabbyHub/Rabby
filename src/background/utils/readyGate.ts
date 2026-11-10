import { ethErrors } from 'eth-rpc-errors';

/**
 * Holds work until the background has restored its stores. A UI call that
 * reaches the controller earlier reads services whose store is still undefined.
 */
export const createReadyGate = () => {
  let isOpen = false;
  let resolveOpened!: () => void;
  let rejectOpened!: (error: unknown) => void;
  const opened = new Promise<void>((resolve, reject) => {
    resolveOpened = resolve;
    rejectOpened = reject;
  });
  opened.catch(() => undefined); // nothing may be waiting when it fails
  return {
    get isOpen() {
      return isOpen;
    },
    open() {
      isOpen = true;
      resolveOpened();
    },
    // The stores will never be restored: reject held and later tasks with
    // `error` instead of leaving their callers waiting forever.
    fail(error: unknown) {
      rejectOpened(error);
    },
    // Runs `task` now once open, so a ready background keeps its sync results.
    run<T>(task: () => T): T | Promise<T> {
      return isOpen ? task() : opened.then(task);
    },
  };
};

type ReadyGate = ReturnType<typeof createReadyGate>;

// Handles a UI port's requests through `gate`. A request held while the port
// closes is dropped: nobody waits for its result, and it may change state.
export const holdPortRequests = <D, R>(
  gate: ReadyGate,
  port: { onDisconnect: { addListener: (cb: () => void) => void } },
  handle: (data: D) => R
) => {
  let closed = false;
  port.onDisconnect.addListener(() => {
    closed = true;
  });
  return (data: D) =>
    gate.run(() => {
      if (closed) throw ethErrors.provider.disconnected();
      return handle(data);
    });
};
