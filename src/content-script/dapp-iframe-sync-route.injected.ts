import { runFlow } from './auto-clik-runner';
const HANDSHAKE_MESSAGE_TYPE = 'rabby-dapp-iframe-handshake';
const SYNC_MESSAGE_TYPE = 'rabby-dapp-iframe-sync-url';
const INSTALL_FLAG = '__rabbyDappIframeSyncRouteInstalled';

const getExtensionOrigin = () => {
  const currentScript = document.currentScript as HTMLScriptElement | null;
  const fromDataset = currentScript?.dataset?.extensionOrigin;
  if (fromDataset) {
    return fromDataset;
  }
  const fallbackScript = document.querySelector(
    'script[data-rabby-dapp-iframe-sync-route="1"]'
  ) as HTMLScriptElement | null;
  const fromFallbackDataset = fallbackScript?.dataset?.extensionOrigin;
  if (fromFallbackDataset) {
    return fromFallbackDataset;
  }
  const src = currentScript?.src || fallbackScript?.src;
  if (!src) {
    return '';
  }
  try {
    return new URL(src).origin;
  } catch (err) {
    return '';
  }
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

  const postSyncUrl = (force = false) => {
    if (!handshakeToken) {
      return;
    }

    const nextUrl = window.location.href;

    if (!force && nextUrl === lastUrl) {
      return;
    }

    lastUrl = nextUrl;

    window.parent.postMessage(
      {
        type: SYNC_MESSAGE_TYPE,
        token: handshakeToken,
        payload: { url: nextUrl },
      },
      parentOrigin || '*'
    );
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

  const handleHandshake = (event: MessageEvent) => {
    console.log('[iframe] in handleshake', event.origin, event);

    if (event.source !== window.parent) {
      return;
    }
    // if (event.origin !== extensionOrigin) {
    //   return;
    // }
    const data = event.data;
    if (!data || typeof data !== 'object') {
      return;
    }
    if (data.type !== HANDSHAKE_MESSAGE_TYPE) {
      return;
    }

    console.log(`[iframe] in dapp:${location.origin}`, event);

    if (typeof data.token !== 'string') {
      return;
    }

    parentOrigin = event.origin;
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
      try {
        runFlow(data.rules).catch((e) => {
          console.log('[iframe] [Flow] rule run error:', e, data.rules);
        });
      } catch (error) {
        console.log('[iframe] [Flow] parse rules error:', error, data.rules);
      }
    }
  };

  const getHandshakeToken = () => {
    window.parent.postMessage(
      {
        type: SYNC_MESSAGE_TYPE,
        token: handshakeToken,
        payload: { url: lastUrl },
      },
      parentOrigin
    );
  };
  getHandshakeToken();

  window.addEventListener('message', handleHandshake);
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

domReadyCall(() => {
  setupDappIframeSyncRoute();
});
console.log('test setupDappIframeSyncRoute watchDomReady 2222');
