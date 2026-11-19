import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { PositionCard } from '@/content-script/perps-widget/ui/PositionCard';
import { PerpsLivePosition } from '@/utils/message/perpsLive';

const mockOpenPerps = jest.fn();
jest.mock('@/content-script/perps-widget/ui/wallet', () => ({
  openInDesktopPerps: (...args: unknown[]) => mockOpenPerps(...args),
}));

test('keeps position details and navigation while accepting only inline logos', () => {
  const actEnvironment = (global as any).IS_REACT_ACT_ENVIRONMENT;
  (global as any).IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  const position: PerpsLivePosition = {
    coin: 'BTC',
    quoteAsset: 'USDC',
    displayName: 'BTC',
    tokenLabel: 'BTC',
    logoUrl: 'https://app.hyperliquid.xyz/coins/BTC.svg',
    direction: 'long',
    leverage: { type: 'cross', value: 3 },
    szi: '1',
    entryPx: '100',
    positionValue: '120',
    markPx: '120',
    unrealizedPnl: '20',
    returnOnEquity: '2',
    marginUsed: '10',
    liquidationPx: null,
    dayChangePct: 0.2,
    sparkline: [100, 110, 120],
  };
  try {
    act(() => root.render(React.createElement(PositionCard, { position })));
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('BTC');
    expect(container.textContent).toContain('long 3x');
    expect(container.querySelector('svg')).not.toBeNull();
    act(() =>
      (container.querySelector('[role="button"]') as HTMLElement).click()
    );
    expect(mockOpenPerps).toHaveBeenCalledWith('BTC');

    const logoUrl = 'data:image/png;base64,aWNvbg==';
    act(() =>
      root.render(
        React.createElement(PositionCard, {
          position: { ...position, logoUrl },
        })
      )
    );
    expect(container.querySelector('img')?.getAttribute('src')).toBe(logoUrl);
    expect(container.textContent).toContain('long 3x');
  } finally {
    act(() => root.unmount());
    container.remove();
    (global as any).IS_REACT_ACT_ENVIRONMENT = actEnvironment;
  }
});
