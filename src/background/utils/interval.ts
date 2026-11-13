/**
 * Run `fn` again and again, waiting `delayMs` before each run and for each run
 * to finish before starting the next delay. `fn` gets the run number (from 1)
 * and a `stop` callback that ends the loop after the current run. If `fn`
 * throws, the loop ends and the returned promise rejects with that error.
 */
export function interval(
  fn: (iteration: number, stop: () => void) => Promise<unknown>,
  delayMs: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const run = (iteration: number) => {
      let stopped = false;
      const stop = () => {
        stopped = true;
      };
      setTimeout(() => {
        fn(iteration, stop).then(() => {
          if (stopped) {
            resolve();
          } else {
            run(iteration + 1);
          }
        }, reject);
      }, delayMs);
    };
    run(1);
  });
}
