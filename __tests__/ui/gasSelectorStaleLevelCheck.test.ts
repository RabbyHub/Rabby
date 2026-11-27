import { act, createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { useDebounceEffect } from 'ahooks';

// GasSelectorHeader's gas-level check is an async call inside a debounced
// effect, guarded by a per-run flag that the effect's cleanup sets. That
// component's result state has no reader to assert on, so this mirrors its
// effect and pins the contract the guard relies on: ahooks runs the returned
// cleanup when the next debounced run starts and on unmount. react-use's
// useDebounce ignored the return value, which is how the guard was lost.

type Deferred = {
  promise: Promise<boolean>;
  resolve: (value: boolean) => void;
};

const deferred = (): Deferred => {
  let resolve!: (value: boolean) => void;
  const promise = new Promise<boolean>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

const Probe = ({
  gasLimit,
  check,
  onResult,
}: {
  gasLimit: number;
  check: (gasLimit: number) => Promise<boolean>;
  onResult: (gasLimit: number, notEnough: boolean) => void;
}) => {
  useDebounceEffect(
    () => {
      let superseded = false;
      check(gasLimit).then((notEnough) => {
        if (superseded) return;
        onResult(gasLimit, notEnough);
      });
      return () => {
        superseded = true;
      };
    },
    [gasLimit, check],
    { wait: 100 }
  );
  return null;
};

describe('GasSelectorHeader gas-level check', () => {
  let root: Root;
  let container: HTMLDivElement;
  const previousActEnvironment = (globalThis as any).IS_REACT_ACT_ENVIRONMENT;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });
  beforeEach(() => {
    jest.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    jest.useRealTimers();
  });
  afterAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  const setup = () => {
    const pending = new Map<number, Deferred>();
    const check = jest.fn((gasLimit: number) => {
      const d = deferred();
      pending.set(gasLimit, d);
      return d.promise;
    });
    const onResult = jest.fn();
    const render = (gasLimit: number) => {
      act(() => {
        root.render(createElement(Probe, { gasLimit, check, onResult }));
      });
      act(() => {
        jest.advanceTimersByTime(100);
      });
    };
    const resolve = async (gasLimit: number, notEnough: boolean) => {
      await act(async () => {
        pending.get(gasLimit)!.resolve(notEnough);
      });
    };
    return { check, onResult, render, resolve };
  };

  it('ignores a run that resolves after a newer run has started', async () => {
    const { check, onResult, render, resolve } = setup();

    render(21000);
    render(50000);
    expect(check.mock.calls).toEqual([[21000], [50000]]);

    await resolve(50000, false);
    await resolve(21000, true);

    expect(onResult.mock.calls).toEqual([[50000, false]]);
  });

  it('ignores a run that resolves after unmount', async () => {
    const { check, onResult, render, resolve } = setup();

    render(21000);
    expect(check).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
    root = createRoot(container);

    await resolve(21000, true);

    expect(onResult).not.toHaveBeenCalled();
  });
});
