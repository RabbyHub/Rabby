/** Thin wrapper over the `{type:'controller', method, params}` runtime.sendMessage protocol. */

import browser from 'webextension-polyfill';

function controllerCall<T = unknown>(
  method: string,
  params: unknown[] = []
): Promise<T> {
  return browser.runtime.sendMessage({
    type: 'controller',
    method,
    params,
  }) as Promise<T>;
}

export function openInDesktopPerps(coin?: string): void {
  const path = coin
    ? `/desktop/perps?coin=${encodeURIComponent(coin)}`
    : '/desktop/perps';
  controllerCall('openInDesktop', [path]).catch(() => {});
}

export function saveBallPosition(
  pos: { x: number; y: number } | null
): Promise<void> {
  return controllerCall<void>('setPerpsWidgetBallPosition', [pos]);
}

export function loadBallPosition(): Promise<{ x: number; y: number } | null> {
  return controllerCall<{ x: number; y: number } | null>(
    'getPerpsWidgetBallPosition',
    []
  );
}
