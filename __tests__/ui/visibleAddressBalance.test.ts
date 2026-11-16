import { act, createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { useInViewport } from 'ahooks';
import { AddressBalance } from '@/ui/views/AddAddress/AddressBalance';

jest.mock('ahooks', () => ({
  useInViewport: jest.fn(),
}));

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('visible address balance', () => {
  const previousActEnvironment = (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
  const firstAddress = '0x1111111111111111111111111111111111111111';
  const nextAddress = '0x2222222222222222222222222222222222222222';
  let container: HTMLDivElement;
  let root: Root;
  let loader: { load: jest.Mock };

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (useInViewport as jest.Mock).mockReturnValue([false]);
    loader = { load: jest.fn() };
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  afterAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });

  const render = async (visible: boolean, address = firstAddress) => {
    (useInViewport as jest.Mock).mockReturnValue([visible]);
    await act(async () => {
      root.render(createElement(AddressBalance, { address, loader }));
    });
  };

  it('does not load mounted rows until they enter the viewport', async () => {
    const request = deferred<number>();
    loader.load.mockReturnValue(request.promise);

    await render(false);
    expect(loader.load).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain('$0.00');

    await render(true);
    expect(loader.load).toHaveBeenCalledTimes(1);
    expect(loader.load.mock.calls[0][0]).toBe(firstAddress);
    expect(loader.load.mock.calls[0][1].aborted).toBe(false);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();

    await act(async () => request.resolve(123.45));
    expect(container.textContent).toBe('$123.45');
    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it('cancels a row leaving the viewport and ignores its late result', async () => {
    const firstRequest = deferred<number>();
    const nextRequest = deferred<number>();
    loader.load
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(nextRequest.promise);

    await render(true);
    const signal = loader.load.mock.calls[0][1] as AbortSignal;
    await render(false);
    expect(signal.aborted).toBe(true);

    await render(true);
    expect(loader.load).toHaveBeenCalledTimes(2);
    await act(async () => nextRequest.resolve(20));
    expect(container.textContent).toBe('$20.00');

    await act(async () => firstRequest.resolve(900));
    expect(container.textContent).toBe('$20.00');
  });

  it('cancels pending work when the row is removed', async () => {
    const request = deferred<number>();
    loader.load.mockReturnValue(request.promise);
    await render(true);
    const signal = loader.load.mock.calls[0][1] as AbortSignal;

    await act(async () => root.render(null));
    expect(signal.aborted).toBe(true);
    await act(async () => request.resolve(10));
    expect(container.textContent).toBe('');
  });

  it('does not apply an old address response to a replacement address', async () => {
    const firstRequest = deferred<number>();
    const nextRequest = deferred<number>();
    loader.load
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(nextRequest.promise);

    await render(true);
    const firstSignal = loader.load.mock.calls[0][1] as AbortSignal;
    await render(true, nextAddress);
    expect(firstSignal.aborted).toBe(true);
    expect(loader.load.mock.calls[1][0]).toBe(nextAddress);

    await act(async () => firstRequest.resolve(100));
    expect(container.textContent).not.toContain('$100.00');
    await act(async () => nextRequest.resolve(200));
    expect(container.textContent).toBe('$200.00');
  });

  it('clears a previous address amount while loading its replacement', async () => {
    const nextRequest = deferred<number>();
    loader.load
      .mockResolvedValueOnce(100)
      .mockReturnValueOnce(nextRequest.promise);

    await render(true);
    expect(container.textContent).toBe('$100.00');
    await render(true, nextAddress);
    expect(container.textContent).not.toContain('$100.00');
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();

    await act(async () => nextRequest.resolve(200));
    expect(container.textContent).toBe('$200.00');
  });

  it('shows an unavailable amount on failure and retries on the next entry', async () => {
    const request = deferred<number>();
    loader.load.mockReturnValueOnce(request.promise).mockResolvedValueOnce(30);

    await render(true);
    await act(async () => request.reject(new Error('Request failed')));
    expect(container.textContent).toBe('—');
    expect(container.querySelector('[aria-busy="true"]')).toBeNull();

    await render(true);
    expect(loader.load).toHaveBeenCalledTimes(1);
    await render(false);
    await render(true);
    expect(loader.load).toHaveBeenCalledTimes(2);
    expect(container.textContent).toBe('$30.00');
  });

  it('displays a successfully loaded zero separately from unavailable data', async () => {
    loader.load.mockResolvedValue(0);
    await render(true);
    expect(container.textContent).toBe('$0.00');
    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
  });
});
