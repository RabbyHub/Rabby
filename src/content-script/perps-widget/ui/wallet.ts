/** Thin wrapper over the `{type:'controller', method, params}` runtime.sendMessage protocol. */

import browser from 'webextension-polyfill';

function isExtensionContextValid(): boolean {
  return !!browser?.runtime?.id;
}

function controllerCall<T = unknown>(
  method: string,
  params: unknown[] = []
): Promise<T> {
  if (!isExtensionContextValid()) {
    return Promise.reject(new Error('Rabby extension context invalidated'));
  }
  // Wrap so a synchronous "context invalidated" throw still surfaces as a
  // rejected promise instead of an uncaught TypeError at the call site.
  try {
    return browser.runtime.sendMessage({
      type: 'controller',
      method,
      params,
    }) as Promise<T>;
  } catch (e) {
    return Promise.reject(e);
  }
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
