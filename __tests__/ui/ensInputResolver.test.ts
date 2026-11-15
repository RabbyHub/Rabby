import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { useEnsInputResolver } from '@/ui/hooks/useEnsInputResolver';
import { resolveEnsAddressByName } from '@/ui/utils/ens';
import type { WalletControllerType } from '@/ui/utils';

jest.mock('@/ui/utils/ens', () => ({
  resolveEnsAddressByName: jest.fn(),
}));

type EnsResult = Awaited<ReturnType<typeof resolveEnsAddressByName>>;
type Resolution = ReturnType<typeof useEnsInputResolver>;

const ADDRESS_A = '0x1111111111111111111111111111111111111111';
const ADDRESS_B = '0x2222222222222222222222222222222222222222';
const RESULT_A = { addr: ADDRESS_A, name: 'alice.eth' };
const RESULT_B = { addr: ADDRESS_B, name: 'bob.eth' };
const IDLE = {
  ensResult: null,
  isPending: false,
  isNameNotFound: false,
};
const PENDING = { ...IDLE, isPending: true };
const NOT_FOUND = { ...IDLE, isNameNotFound: true };

function deferredLookup() {
  let resolve!: (result: EnsResult) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<EnsResult>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('useEnsInputResolver', () => {
  const resolveName = resolveEnsAddressByName as jest.MockedFunction<
    typeof resolveEnsAddressByName
  >;
  const reactActEnvironment = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  };
  const wallet = {} as WalletControllerType;
  let root: Root;
  let mounted: boolean;
  let current: Resolution;
  let requests: ReturnType<typeof deferredLookup>[];

  function Resolver({
    input,
    lookupWallet,
  }: {
    input: string;
    lookupWallet: WalletControllerType;
  }) {
    current = useEnsInputResolver(input, lookupWallet);
    return null;
  }

  const render = (input: string, lookupWallet = wallet) => {
    act(() =>
      root.render(React.createElement(Resolver, { input, lookupWallet }))
    );
  };
  const advance = (ms = 300) => {
    act(() => jest.advanceTimersByTime(ms));
  };
  const settle = async (index: number, result: EnsResult) => {
    await act(async () => {
      requests[index].resolve(result);
      await requests[index].promise;
    });
  };
  const reject = async (index: number) => {
    await act(async () => {
      requests[index].reject(new Error('Resolver unavailable'));
      await requests[index].promise.catch(() => undefined);
    });
  };
  const unmount = () => {
    act(() => root.unmount());
    mounted = false;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    root = createRoot(document.createElement('div'));
    mounted = true;
    requests = [];
    resolveName.mockReset();
    resolveName.mockImplementation(() => {
      const request = deferredLookup();
      requests.push(request);
      return request.promise;
    });
  });

  afterEach(() => {
    if (mounted) unmount();
    jest.useRealTimers();
    delete reactActEnvironment.IS_REACT_ACT_ENVIRONMENT;
  });

  test('stays pending during the debounce and slow lookup without reporting invalid', async () => {
    render('alice.eth');
    expect(current).toEqual(PENDING);
    advance(299);
    expect(resolveName).not.toHaveBeenCalled();
    advance(1);
    expect(resolveName).toHaveBeenCalledWith('alice.eth', wallet);
    advance(10000);
    expect(current).toEqual(PENDING);

    await settle(0, RESULT_A);
    expect(current).toEqual({ ...IDLE, ensResult: RESULT_A });
  });

  test('debounces successive edits so only the latest input is queried', () => {
    render('alice.e');
    advance(200);
    render('alice.et');
    advance(200);
    render('alice.eth');
    advance();
    expect(resolveName).toHaveBeenCalledTimes(1);
    expect(resolveName).toHaveBeenCalledWith('alice.eth', wallet);
    expect(current).toEqual(PENDING);
  });

  test.each(['hong', '0x1234', 'alice.', '.eth', 'alice..eth', 'alice .eth'])(
    'does not query or show loading for a non-name input %p',
    (input) => {
      render(input);
      expect(current).toEqual(NOT_FOUND);
      advance(10000);
      expect(resolveName).not.toHaveBeenCalled();
      expect(current).toEqual(NOT_FOUND);
    }
  );

  test.each(['janbenes.zk.money', 'rabby.io', ' Alice.ETH ', '🦊.eth'])(
    'still queries domain-shaped input %p',
    (input) => {
      render(input);
      expect(current).toEqual(PENDING);
      advance();
      expect(resolveName).toHaveBeenCalledWith(input, wallet);
    }
  );

  test('drops a late success while the current input is still pending', async () => {
    render('alice.eth');
    advance();
    render('bob.eth');
    advance();

    await settle(0, RESULT_A);
    expect(current).toEqual(PENDING);
    await settle(1, RESULT_B);
    expect(current).toEqual({ ...IDLE, ensResult: RESULT_B });
  });

  test('does not replace a newer result with an older success', async () => {
    render('alice.eth');
    advance();
    render('bob.eth');
    advance();

    await settle(1, RESULT_B);
    await settle(0, RESULT_A);
    expect(current).toEqual({ ...IDLE, ensResult: RESULT_B });
  });

  test.each(['not found', 'rejected'])(
    'ignores an older %s response after the current input resolves',
    async (failure) => {
      render('alice.et');
      advance();
      render('alice.eth');
      advance();
      await settle(1, RESULT_A);

      if (failure === 'not found') await settle(0, null);
      else await reject(0);
      expect(current).toEqual({ ...IDLE, ensResult: RESULT_A });
    }
  );

  test.each(['not found', 'rejected'])(
    'reports invalid only after the current lookup is %s',
    async (failure) => {
      render('alice.eth');
      advance();
      expect(current).toEqual(PENDING);

      if (failure === 'not found') await settle(0, null);
      else await reject(0);
      expect(current).toEqual(NOT_FOUND);

      render('bob.eth');
      expect(current).toEqual(PENDING);
    }
  );

  test('immediately hides a settled result when the input changes', async () => {
    render('alice.eth');
    advance();
    await settle(0, RESULT_A);

    render('bob.eth');
    expect(current).toEqual(PENDING);
    expect(resolveName).toHaveBeenCalledTimes(1);
  });

  test('rejects a resolver result that is not a valid address', async () => {
    render('alice.eth');
    advance();
    await settle(0, { name: 'alice.eth', addr: '0xinvalid' });
    expect(current).toEqual(NOT_FOUND);
  });

  test('ignores the previous wallet lookup and resolves again when the wallet changes', async () => {
    render('alice.eth');
    advance();
    const nextWallet = {} as WalletControllerType;
    render('alice.eth', nextWallet);
    advance();
    expect(resolveName).toHaveBeenLastCalledWith('alice.eth', nextWallet);

    await settle(0, RESULT_A);
    expect(current).toEqual(PENDING);
    await settle(1, RESULT_A);
    expect(current).toEqual({ ...IDLE, ensResult: RESULT_A });
  });

  test('does not accept the first request after changing A to B and back to A', async () => {
    render('alice.eth');
    advance();
    render('bob.eth');
    advance();
    render('alice.eth');
    advance();

    await settle(0, RESULT_A);
    await settle(1, RESULT_B);
    expect(current).toEqual(PENDING);
    await settle(2, null);
    expect(current).toEqual(NOT_FOUND);
  });

  test.each(['', ADDRESS_B])(
    'clears the lookup when input becomes %p and ignores its late result',
    async (input) => {
      render('alice.eth');
      advance();
      render(input);
      expect(current).toEqual(IDLE);
      advance();
      await settle(0, RESULT_A);
      expect(current).toEqual(IDLE);
      expect(resolveName).toHaveBeenCalledTimes(1);
    }
  );

  test.each(['', ADDRESS_B])(
    'cancels a scheduled name lookup when input becomes %p',
    (input) => {
      render('alice.eth');
      render(input);
      advance();
      expect(resolveName).not.toHaveBeenCalled();
      expect(current).toEqual(IDLE);
    }
  );

  test('cancels the debounce on unmount', () => {
    render('alice.eth');
    unmount();
    advance();
    expect(resolveName).not.toHaveBeenCalled();
  });

  test('does not deliver an in-flight result after unmount', async () => {
    render('alice.eth');
    advance();
    unmount();
    await settle(0, RESULT_A);
    expect(current).toEqual(PENDING);
    expect(jest.getTimerCount()).toBe(0);
  });
});
