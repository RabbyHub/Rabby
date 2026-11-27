import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { PerpsHomeBalance } from '@/ui/views/Dashboard/components/DashboardPanel/PerpsHomeBalance';
import { usePerpsHomePnl } from '@/ui/views/Perps/hooks/usePerpsHomePnl';
import { KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import type {
  PerpsHomeAccount,
  PerpsHomeAmount,
} from '@/db/schema/perpsHomeBalance';

const a = { address: '0xAa', type: KEYRING_CLASS.HARDWARE.LEDGER };
const b = { ...a, address: '0xBb' };
const mockState = {
  perps: {
    currentPerpsAccount: a as PerpsHomeAccount | null,
    userAbstractionStatus: 'ready',
  },
};
const mockWallet = {
  getPerpsHomeBalance: jest.fn(),
  setPerpsHomeBalance: jest.fn(),
};
const mockFetch = jest.fn();
const mockPricing = {
  availableBalance: 0,
  isAvailableBalanceReady: false,
  isUnifiedAccount: false,
  isPortfolioMargin: false,
};

jest.mock('@/ui/store', () => ({
  useRabbySelector: (select) => select(mockState),
}));
jest.mock('@/ui/utils', () => ({ useWallet: () => mockWallet }));
jest.mock('@/ui/views/DesktopPerps/utils', () => ({
  getCustomClearinghouseState: (...args) => mockFetch(...args),
}));
jest.mock('@/ui/views/Perps/hooks/usePerpsAccount', () => ({
  usePerpsAccount: () => mockPricing,
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

const livePosition = (pnl: number) => ({
  assetPositions: [{ position: { unrealizedPnl: String(pnl) } }],
});
const flat = (withdrawable: string) => ({ assetPositions: [], withdrawable });
const pnl = (value: number): PerpsHomeAmount => ({ kind: 'pnl', value });

function Card({ hidden }: { hidden: boolean }) {
  return React.createElement(PerpsHomeBalance, {
    ...usePerpsHomePnl(),
    hidden,
  });
}

function openCard(hidden = false) {
  const element = (hide: boolean) =>
    React.createElement(Card, { hidden: hide });
  const view = render(element(hidden));
  let skeletons = 0;
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of Array.from(record.addedNodes)) {
        if (
          node instanceof Element &&
          (node.matches('.ant-skeleton') || node.querySelector('.ant-skeleton'))
        )
          skeletons++;
      }
    }
  });
  observer.observe(view.container, { childList: true, subtree: true });
  return {
    ...view,
    update: (hide = false) => view.rerender(element(hide)),
    skeleton: () => view.container.querySelector('.ant-skeleton'),
    skeletonsShown: () => skeletons,
    close: () => {
      observer.disconnect();
      view.unmount();
    },
  };
}

beforeEach(() => {
  jest.resetAllMocks();
  mockState.perps.currentPerpsAccount = a;
  mockState.perps.userAbstractionStatus = 'ready';
  Object.assign(mockPricing, {
    availableBalance: 0,
    isAvailableBalanceReady: false,
    isUnifiedAccount: false,
    isPortfolioMargin: false,
  });
  mockWallet.getPerpsHomeBalance.mockResolvedValue(null);
  mockWallet.setPerpsHomeBalance.mockResolvedValue(undefined);
});

test('cold open loads once, reopen shows cached PnL throughout a slow refresh, closing a position changes the display kind', async () => {
  let saved: PerpsHomeAmount | null = null;
  mockWallet.getPerpsHomeBalance.mockImplementation(async () => saved);
  mockWallet.setPerpsHomeBalance.mockImplementation(
    async (_account, amount) => {
      saved = amount;
    }
  );
  const first = deferred<ReturnType<typeof livePosition>>();
  mockFetch.mockReturnValueOnce(first.promise);
  const initial = openCard();
  expect(initial.skeleton()).toBeNull();
  await waitFor(() => expect(initial.skeleton()).toBeTruthy());
  first.resolve(livePosition(12.5));
  await initial.findByText('+$12.5');
  initial.close();

  const next = deferred<ReturnType<typeof flat>>();
  mockFetch.mockReturnValueOnce(next.promise);
  const reopened = openCard();
  await reopened.findByText('+$12.5');
  expect(mockFetch).toHaveBeenCalledTimes(2);
  next.resolve(flat('86'));
  await reopened.findByText('$86.00');
  expect(reopened.skeletonsShown()).toBe(0);
  expect(saved).toEqual({ kind: 'availableBalance', value: 86 });
  reopened.close();
});

test('delayed disk read and failed write cannot replace fresh PnL', async () => {
  const disk = deferred<PerpsHomeAmount>();
  mockWallet.getPerpsHomeBalance.mockReturnValue(disk.promise);
  mockWallet.setPerpsHomeBalance.mockRejectedValue(new Error('disk full'));
  mockFetch.mockResolvedValue(livePosition(-3));
  const view = openCard();
  await view.findByText('-$3');
  await act(async () => disk.resolve(pnl(90)));
  expect(view.getByText('-$3')).toBeTruthy();
  view.close();
});

test('no selected account leaves the amount blank and performs no I/O', () => {
  mockState.perps.currentPerpsAccount = null;
  const view = openCard();
  expect(view.container.textContent).toBe('');
  expect(view.skeleton()).toBeNull();
  expect(mockWallet.getPerpsHomeBalance).not.toHaveBeenCalled();
  expect(mockWallet.setPerpsHomeBalance).not.toHaveBeenCalled();
  expect(mockFetch).not.toHaveBeenCalled();
  view.close();
});

test('a confirmed break-even position is saved as PnL and rendered as green +$0', async () => {
  mockFetch.mockResolvedValue(livePosition(0));
  const view = openCard();
  const label = await view.findByText('+$0');
  expect(label.className).toContain('text-r-green-default');
  await waitFor(() =>
    expect(mockWallet.setPerpsHomeBalance).toHaveBeenCalledTimes(1)
  );
  expect(mockWallet.setPerpsHomeBalance.mock.calls[0][1]).toEqual(pnl(0));
  view.close();
});

test('cold spot balance waits for the first frame before saving the amount', async () => {
  mockPricing.isPortfolioMargin = true;
  mockFetch.mockResolvedValue(flat('0'));
  const view = openCard();
  await waitFor(() => expect(view.skeleton()).toBeTruthy());
  expect(mockWallet.setPerpsHomeBalance).not.toHaveBeenCalled();
  mockPricing.isAvailableBalanceReady = true;
  mockPricing.availableBalance = 37;
  view.update();
  await view.findByText('$37.00');
  view.close();
});

test('switch withdraws the old amount immediately and ignores late disk and network results', async () => {
  const old = deferred<ReturnType<typeof livePosition>>();
  const disk = deferred<PerpsHomeAmount>();
  mockWallet.getPerpsHomeBalance
    .mockReturnValueOnce(disk.promise)
    .mockResolvedValueOnce(pnl(-8));
  mockFetch.mockReturnValueOnce(old.promise).mockResolvedValueOnce(flat('42'));
  const view = openCard();
  mockState.perps.currentPerpsAccount = b;
  view.update();
  await view.findByText('$42.00');
  await act(async () => {
    old.resolve(livePosition(999));
    disk.resolve(pnl(100));
  });
  expect(view.getByText('$42.00')).toBeTruthy();
  expect(
    mockWallet.setPerpsHomeBalance.mock.calls.map(
      ([account]) => account.address
    )
  ).toEqual(['0xbb']);
  view.close();
});

test.each([KEYRING_TYPE.WatchAddressKeyring, KEYRING_TYPE.GnosisKeyring])(
  'same address switching to %s has live data only',
  async (type) => {
    mockWallet.getPerpsHomeBalance.mockResolvedValue(pnl(80));
    const previous = deferred<ReturnType<typeof flat>>();
    const request = deferred<ReturnType<typeof flat>>();
    mockFetch
      .mockReturnValueOnce(previous.promise)
      .mockReturnValueOnce(request.promise);
    const view = openCard();
    await view.findByText('+$80');
    mockWallet.getPerpsHomeBalance.mockClear();
    mockState.perps.currentPerpsAccount = { ...a, type };
    view.update();
    expect(view.queryByText('+$80')).toBeNull();
    previous.resolve(flat('80'));
    request.resolve(flat('4'));
    await view.findByText('$4.00');
    expect(mockWallet.getPerpsHomeBalance).not.toHaveBeenCalled();
    expect(mockWallet.setPerpsHomeBalance).not.toHaveBeenCalled();
    view.close();
  }
);

test.each([null, pnl(4)])(
  'offline refresh keeps the cached result or ends loading on a miss',
  async (saved) => {
    if (saved) mockWallet.getPerpsHomeBalance.mockResolvedValue(saved);
    else
      mockWallet.getPerpsHomeBalance.mockRejectedValue(
        new Error('database unavailable')
      );
    mockFetch.mockRejectedValue(new Error('offline'));
    const view = openCard();
    await view.findByText(saved ? '+$4' : '--');
    expect(view.skeleton()).toBeNull();
    expect(mockWallet.setPerpsHomeBalance).not.toHaveBeenCalled();
    view.close();
  }
);

test('pending mode and spot frames cannot overwrite cached balance; a confirmed zero can', async () => {
  mockWallet.getPerpsHomeBalance.mockResolvedValue(pnl(20));
  mockState.perps.userAbstractionStatus = 'loading';
  mockFetch.mockResolvedValue(flat('18'));
  const view = openCard(true);
  await view.findByText('*****');
  await waitFor(() => expect(mockFetch).toHaveBeenCalled());
  view.update(false);
  await view.findByText('+$20');
  mockPricing.isUnifiedAccount = true;
  mockState.perps.userAbstractionStatus = 'ready';
  view.update();
  expect(view.getByText('+$20')).toBeTruthy();
  expect(mockWallet.setPerpsHomeBalance).not.toHaveBeenCalled();
  mockPricing.isAvailableBalanceReady = true;
  view.update(true);
  expect(view.getByText('*****')).toBeTruthy();
  expect(view.queryByText('$0.00')).toBeNull();
  view.update(false);
  await view.findByText('$0.00');
  expect(mockWallet.setPerpsHomeBalance.mock.calls[0][1]).toEqual({
    kind: 'availableBalance',
    value: 0,
  });
  view.close();
});
