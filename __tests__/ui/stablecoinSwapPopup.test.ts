import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';

let mockCommonPopupVisible = false;

jest.mock('@/ui/utils', () => ({
  useCommonPopupView: () => ({ visible: mockCommonPopupVisible }),
}));
jest.mock('react-router-dom', () => ({
  useHistory: () => ({ push: jest.fn() }),
}));
jest.mock('@/constant', () => ({ ETH_USDT_CONTRACT: '0xusdt' }));
jest.mock('@/constant/dex-swap', () => ({
  DEFAULT_SWAP_TO_TOKEN_ITEM_BY_CHAIN_SERVER_ID: { eth: { id: 'eth' } },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  useStablecoinSwapPopup,
} = require('@/ui/views/Dashboard/hooks/ads/useStablecoinSwapPopup');

const setDocumentVisibility = (state: 'visible' | 'hidden') => {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('useStablecoinSwapPopup token animation', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    jest.useFakeTimers();
    window.localStorage.clear();
    mockCommonPopupVisible = false;
    setDocumentVisibility('visible');
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    jest.useRealTimers();
  });

  const render = (paused: boolean) => {
    const probe = { renders: 0, value: undefined as any };
    const Probe = ({ paused }: { paused: boolean }) => {
      probe.renders++;
      probe.value = useStablecoinSwapPopup({ paused });
      return null;
    };
    const rerender = (nextPaused: boolean) =>
      act(() =>
        root.render(React.createElement(Probe, { paused: nextPaused }))
      );
    rerender(paused);
    return { probe, rerender };
  };

  const tick = (ms: number) => act(() => jest.advanceTimersByTime(ms));

  it('switches a token every 2s while the strip can be seen', () => {
    const { probe } = render(false);
    const first = probe.value.receiveToken.symbol;
    tick(2000);
    expect(probe.value.receiveToken.symbol).not.toBe(first);
    expect(probe.value.previousReceiveToken.symbol).toBe(first);
  });

  it('stays still while the Dashboard reports it covered, then resumes', () => {
    const { probe, rerender } = render(true);
    const renders = probe.renders;
    tick(10000);
    expect(probe.renders).toBe(renders);
    expect(probe.value.previousReceiveToken).toBeNull();

    rerender(false);
    tick(2000);
    expect(probe.value.previousReceiveToken).not.toBeNull();
  });

  it('stays still while the common popup is open', () => {
    mockCommonPopupVisible = true;
    const { probe } = render(false);
    const renders = probe.renders;
    tick(10000);
    expect(probe.renders).toBe(renders);
  });

  it('stays still while the page is hidden, then resumes', () => {
    const { probe } = render(false);
    act(() => setDocumentVisibility('hidden'));
    const renders = probe.renders;
    tick(10000);
    expect(probe.renders).toBe(renders);

    act(() => setDocumentVisibility('visible'));
    tick(2000);
    expect(probe.value.previousReceiveToken).not.toBeNull();
  });
});
