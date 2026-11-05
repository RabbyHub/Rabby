/**
 * Holds work until the background has restored its stores. A UI call that
 * reaches the controller earlier reads services whose store is still undefined.
 */
export const createReadyGate = () => {
  let isOpen = false;
  let resolveOpened!: () => void;
  const opened = new Promise<void>((resolve) => {
    resolveOpened = resolve;
  });
  return {
    get isOpen() {
      return isOpen;
    },
    open() {
      isOpen = true;
      resolveOpened();
    },
    // Runs `task` now once open, so a ready background keeps its sync results.
    run<T>(task: () => T): T | Promise<T> {
      return isOpen ? task() : opened.then(task);
    },
  };
};
