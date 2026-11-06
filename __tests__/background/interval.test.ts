import { interval } from '@/background/utils/interval';

const flush = () =>
  new Promise((resolve) => jest.requireActual('timers').setImmediate(resolve));

describe('interval', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('waits before each run, counts runs from 1 and stops on request', async () => {
    const calls: number[] = [];
    const done = interval(async (iteration, stop) => {
      calls.push(iteration);
      if (iteration === 3) stop();
    }, 1000);

    jest.advanceTimersByTime(999);
    await flush();
    expect(calls).toEqual([]);

    for (let i = 0; i < 5; i++) {
      jest.advanceTimersByTime(1000);
      await flush();
    }
    await expect(done).resolves.toBeUndefined();
    expect(calls).toEqual([1, 2, 3]);
  });

  it('waits for a slow run to finish before starting the next delay', async () => {
    let finishRun: () => void = () => undefined;
    const fn = jest.fn(
      () => new Promise<void>((resolve) => (finishRun = resolve))
    );
    interval(fn, 100);

    jest.advanceTimersByTime(100);
    await flush();
    expect(fn).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1000);
    await flush();
    expect(fn).toHaveBeenCalledTimes(1);

    finishRun();
    await flush();
    jest.advanceTimersByTime(100);
    await flush();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('stops and rejects when a run throws', async () => {
    const error = new Error('boom');
    const fn = jest.fn(async () => {
      throw error;
    });
    const result = interval(fn, 10).catch((e) => e);

    jest.advanceTimersByTime(10);
    await flush();
    expect(await result).toBe(error);

    jest.advanceTimersByTime(100);
    await flush();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
