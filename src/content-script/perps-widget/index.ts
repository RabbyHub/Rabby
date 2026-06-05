/** content-script injection entry — creates a closed Shadow DOM, starts livedataClient, mounts the React UI. */

import { PerpsLiveSnapshot, PerpsLiveWsState } from '@/utils/message/perpsLive';
import { livedataClient } from './livedataClient';

type DebugWindow = Window & {
  __rabbyPerpsDebug?: () => PerpsLiveSnapshot | null;
  __rabbyPerpsDebugState?: () => PerpsLiveWsState;
};

const SHADOW_HOST_ID = '__rabby_perps_widget_host__';

function isTopFrame(): boolean {
  try {
    return window.top === window;
  } catch {
    return false;
  }
}

function hostIsBlocked(blocked: string[]): boolean {
  if (!Array.isArray(blocked) || blocked.length === 0) return false;
  try {
    const h = window.location.hostname;
    return blocked.some((b) => h === b || h.endsWith(`.${b}`));
  } catch {
    return true;
  }
}

function mountContainer(): ShadowRoot | null {
  if (document.getElementById(SHADOW_HOST_ID)) return null;
  const host = document.createElement('div');
  host.id = SHADOW_HOST_ID;
  // pointer-events: none on host so the page below stays interactive;
  // UI elements re-enable pointer-events individually.
  host.style.cssText =
    'all: initial; position: fixed; inset: 0; pointer-events: none; z-index: 2147483647;';
  (document.body ?? document.documentElement).appendChild(host);
  return host.attachShadow({ mode: 'closed' });
}

function removeContainer(): void {
  const host = document.getElementById(SHADOW_HOST_ID);
  if (host && host.parentNode) host.parentNode.removeChild(host);
}

function installDebugHook(): void {
  if (process.env.NODE_ENV !== 'production') {
    const w = window as DebugWindow;
    w.__rabbyPerpsDebug = () => livedataClient.getLatest();
    w.__rabbyPerpsDebugState = () => livedataClient.getWsState();
  }
}

export interface BootOptions {
  enabled: boolean;
  blockedHosts: string[];
}

export async function bootPerpsWidget(opts: BootOptions): Promise<void> {
  if (!isTopFrame()) return;
  if (!opts.enabled) return;
  if (hostIsBlocked(opts.blockedHosts)) return;

  const onReady = async (): Promise<void> => {
    const root = mountContainer();
    if (!root) return;

    livedataClient.start();
    installDebugHook();

    let unmountUI: (() => void) | null = null;
    try {
      const uiModule = await import(/* webpackMode: "eager" */ './ui/mount');
      unmountUI = uiModule.mountUI(root);
    } catch (err) {
      console.warn(
        '[perps-widget] UI module not available, running data-only',
        err
      );
    }

    livedataClient.registerTeardown(() => {
      if (unmountUI) {
        try {
          unmountUI();
        } catch {
          /* ignore */
        }
        unmountUI = null;
      }
      removeContainer();
    });
  };

  // Can't blindly addEventListener('DOMContentLoaded'): bootPerpsWidget awaits an SW RPC
  // first, by which point DOMContentLoaded may have already fired — a late listener
  // would never trigger. Check readyState and call onReady() directly in that case.
  if (document.readyState !== 'loading') {
    await onReady();
  } else {
    document.addEventListener('DOMContentLoaded', () => void onReady(), {
      once: true,
    });
  }
}
