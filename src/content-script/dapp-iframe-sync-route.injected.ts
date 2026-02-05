import { runFlow } from './auto-click-runner';
import {
  IFRAME_BRIDGE_MESSAGE_TYPES,
  INJECTED_THEME_METHOD,
  ensureInjectedNamespace,
  getBridgeMessageType,
  normalizeArgs,
  serializeError,
} from '@/ui/utils/iframeBridge';

import type {
  IframeBridgeCallMessage,
  IframeBridgeHandshakeMessage,
  IframeBridgeTheme,
} from '@/ui/utils/iframeBridge';

const INSTALL_FLAG = '__rabbyDappIframeSyncRouteInstalled';

const applyIframeTheme = (theme?: IframeBridgeTheme | null) => {
  if (theme !== 'dark' && theme !== 'light') {
    return false;
  }

  if (location.origin === 'https://polymarket.com') {
    localStorage?.setItem?.('color-mode', theme);
    document?.documentElement?.setAttribute('data-theme', theme);
    if (document?.documentElement?.style) {
      document.documentElement.style['colorScheme'] = theme;
    }
    return true;
  }

  if (location.origin === 'https://probable.markets') {
    const switchBTN = document?.documentElement?.querySelector?.(
      'header label[data-scope=[switch]'
    ) as HTMLLabelElement | null;
    if (switchBTN) {
      if (
        !document?.documentElement
          ?.querySelector?.('html')
          ?.classList?.contains(theme)
      ) {
        switchBTN?.click?.();
      }
    } else {
      localStorage?.setItem?.('theme', theme);
      document?.documentElement
        ?.querySelector?.('html')
        ?.classList.remove('light', 'dark');
      document?.documentElement?.querySelector?.('html')?.classList.add(theme);
    }
    return true;
  }

  return false;
};

const registerInjectedThemeHandler = () => {
  const registry = ensureInjectedNamespace();
  registry[INJECTED_THEME_METHOD] = (theme?: IframeBridgeTheme) =>
    applyIframeTheme(theme);
};

const setupDappIframeSyncRoute = () => {
  if (window === window.top) {
    return;
  }

  const windowAny = window as any;
  if (windowAny[INSTALL_FLAG]) {
    return;
  }
  windowAny[INSTALL_FLAG] = true;

  let handshakeToken: string | null = null;
  let lastUrl = window.location.href;
  let listening = false;
  let parentOrigin = '*';

  const postMessageToParent = (payload: Record<string, any>) => {
    window.parent.postMessage(payload, parentOrigin || '*');
  };

  const postSyncMessage = (token: string | null, url: string) => {
    postMessageToParent({
      type: IFRAME_BRIDGE_MESSAGE_TYPES.SYNC_URL,
      token,
      payload: { url },
    });
  };

  const postSyncUrl = (force = false) => {
    if (!handshakeToken) {
      return;
    }

    const nextUrl = window.location.href;

    if (!force && nextUrl === lastUrl) {
      return;
    }

    lastUrl = nextUrl;

    postSyncMessage(handshakeToken, nextUrl);
  };

  const ensureListening = () => {
    if (listening) {
      return;
    }
    listening = true;

    window.addEventListener('hashchange', () => postSyncUrl());
    window.addEventListener('popstate', () => postSyncUrl());
    const wrapHistoryMethod = (method: 'pushState' | 'replaceState') => {
      const original = history[method];
      if ((original as any).__rabbyWrapped) {
        return;
      }
      history[method] = function (
        this: History,
        ...args: Parameters<History['pushState']>
      ) {
        const result = original.apply(this, args as any);
        postSyncUrl();
        return result;
      } as History['pushState'];
      (history[method] as any).__rabbyWrapped = true;
    };
    wrapHistoryMethod('pushState');
    wrapHistoryMethod('replaceState');
  };

  const postCallResult = (
    id: string,
    success: boolean,
    payload: { result?: any; error?: any }
  ) => {
    postMessageToParent({
      type: IFRAME_BRIDGE_MESSAGE_TYPES.CALL_RESULT,
      token: handshakeToken,
      id,
      success,
      ...payload,
    });
  };

  const handleHandshakeMessage = (
    data: IframeBridgeHandshakeMessage,
    origin: string
  ) => {
    if (typeof data.token !== 'string') {
      return;
    }

    parentOrigin = origin;
    handshakeToken = data.token;

    if (data.theme) {
      if (location.origin === 'https://polymarket.com') {
        localStorage.setItem('color-mode', data.theme);
        document?.documentElement?.setAttribute('data-theme', data.theme);
        document.documentElement.style['colorScheme'] = data.theme;
      }
    }
    ensureListening();
    postSyncUrl(true);

    if (data.token && data.rules) {
      const autoRunner = () => {
        try {
          runFlow(data.rules!).catch((e) => {
            console.log('[iframe] [Flow] rule run error:', e, data.rules);
          });
        } catch (error) {
          console.log('[iframe] [Flow] parse rules error:', error, data.rules);
        }
      };
      try {
        const store = JSON.parse(
          window.localStorage.getItem('wagmi.store') || ''
        );
        if (!store?.state?.current) {
          autoRunner();
        }
      } catch (error) {
        console.log('[iframe] [Flow] autoRunner error:', error, data.rules);
        autoRunner();
      }
      return;
    }

    parentOrigin = origin;
    handshakeToken = data.token;

    applyIframeTheme(data.theme);
    ensureListening();
    postSyncUrl(true);

    if (data.token && data.rules) {
      const autoRunner = () => {
        try {
          runFlow(data.rules!).catch((e) => {
            console.log('[iframe] [Flow] rule run error:', e, data.rules);
          });
        } catch (error) {
          console.log('[iframe] [Flow] parse rules error:', error, data.rules);
        }
      };
      try {
        const store = JSON.parse(
          window.localStorage.getItem('wagmi.store') ||
            window.localStorage.getItem('polymarket.cache.wagmi.v2.store') ||
            '{}'
        );
        if (!store?.state?.current) {
          autoRunner();
        }
      } catch (error) {
        console.log('[iframe] [Flow] autoRunner error:', error, data.rules);
        autoRunner();
      }
    }
  };

  const handleCallMessage = (data: IframeBridgeCallMessage) => {
    if (!handshakeToken || data.token !== handshakeToken) {
      return;
    }
    if (typeof data.id !== 'string' || typeof data.method !== 'string') {
      return;
    }
    const args = normalizeArgs(data.args);
    const registry = ensureInjectedNamespace();
    const fn = registry[data.method];
    if (typeof fn !== 'function') {
      postCallResult(data.id, false, {
        error: {
          message: `Injected method not found: ${data.method}`,
        },
      });
      return;
    }
    Promise.resolve()
      .then(() => fn(...args))
      .then((result) => {
        postCallResult(data.id, true, { result });
      })
      .catch((error) => {
        postCallResult(data.id, false, { error: serializeError(error) });
      });
  };

  const handleMessage = (event: MessageEvent) => {
    console.log('[iframe] in handleMessage', event.origin, event);

    if (event.source !== window.parent) {
      return;
    }
    // if (event.origin !== extensionOrigin) {
    //   return;
    // }
    const messageType = getBridgeMessageType(event.data);
    if (!messageType) {
      return;
    }

    if (messageType === IFRAME_BRIDGE_MESSAGE_TYPES.HANDSHAKE) {
      handleHandshakeMessage(
        event.data as IframeBridgeHandshakeMessage,
        event.origin
      );
      return;
    }

    if (messageType === IFRAME_BRIDGE_MESSAGE_TYPES.CALL) {
      handleCallMessage(event.data as IframeBridgeCallMessage);
    }
  };

  const getHandshakeToken = () => {
    postSyncMessage(handshakeToken, lastUrl);
  };
  getHandshakeToken();

  window.addEventListener('message', handleMessage);
};

const domReadyCall = (callback) => {
  if (document.readyState === 'loading') {
    const domContentLoadedHandler = () => {
      callback();
      document.removeEventListener('DOMContentLoaded', domContentLoadedHandler);
    };
    document.addEventListener('DOMContentLoaded', domContentLoadedHandler);
  } else {
    callback();
  }
};
registerInjectedThemeHandler();

domReadyCall(() => {
  setTimeout(() => {
    setupDappIframeSyncRoute();
  }, 300);
});
