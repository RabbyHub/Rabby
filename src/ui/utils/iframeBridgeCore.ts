import {
  IFRAME_BRIDGE_DEFAULT_CALL_TIMEOUT,
  IFRAME_BRIDGE_MESSAGE_TYPES,
  createHandshakeToken,
  getBridgeMessageType,
  getSyncUrlFromMessage,
  normalizeArgs,
} from '@/ui/utils/iframeBridge';
import { syncIframeUrlToQuery } from '@/ui/utils/iframeSync';

import type {
  IframeBridgeCallResultMessage,
  IframeBridgeSyncMessage,
  IframeBridgeTheme,
} from '@/ui/utils/iframeBridge';

type PendingCall = {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  timeoutId: number;
};

export type IframeBridgeSyncOptions = {
  isActive: boolean;
  locationSearch: string;
  updateSearchParams: (updater: (params: URLSearchParams) => void) => void;
  initialUrl?: string | null;
  syncUrlParam?: string | null;
};

export type IframeBridgeOptions = {
  getIframeWindow: () => Window | null;
  iframeOrigin: string;
  rules?: unknown;
  theme: IframeBridgeTheme;
  onConnected?: () => void;
  syncUrl?: IframeBridgeSyncOptions;
  currentAddress: string;
};

export type CallInjectedMethodOptions = {
  timeoutMs?: number;
};

export type IframeBridgeInstance = {
  callInjectedMethod: (
    method: string,
    args?: any[],
    options?: CallInjectedMethodOptions
  ) => Promise<any>;
  reset: (reason?: string) => void;
  updateOptions: (options: Partial<IframeBridgeOptions>) => void;
  destroy: () => void;
  connectedRef: { current: boolean };
};

export const createIframeBridge = (
  initialOptions: IframeBridgeOptions
): IframeBridgeInstance => {
  const optionsRef = { current: initialOptions };
  const connectedRef = { current: false };
  const handshakeTokenRef = { current: createHandshakeToken() };
  const pendingCallsRef = { current: new Map<string, PendingCall>() };
  const callSeqRef = { current: 0 };

  const rejectPendingCalls = (reason: string) => {
    pendingCallsRef.current.forEach((pending) => {
      window.clearTimeout(pending.timeoutId);
      pending.reject(new Error(reason));
    });
    pendingCallsRef.current.clear();
  };

  const postMessageToIframe = (payload: Record<string, any>) => {
    const { iframeOrigin, getIframeWindow } = optionsRef.current;
    const contentWindow = getIframeWindow();
    if (!contentWindow || !iframeOrigin) {
      return false;
    }
    contentWindow.postMessage(payload, iframeOrigin);
    return true;
  };

  const postHandshake = () => {
    const { rules, theme } = optionsRef.current;
    postMessageToIframe({
      type: IFRAME_BRIDGE_MESSAGE_TYPES.HANDSHAKE,
      token: handshakeTokenRef.current,
      ...(rules ? { rules } : {}),
      theme,
    });
  };

  const syncInitialUrlIfNeeded = () => {
    const { syncUrl } = optionsRef.current;
    if (!syncUrl?.isActive) {
      return;
    }
    if (syncUrl.syncUrlParam || !syncUrl.initialUrl) {
      return;
    }
    syncIframeUrlToQuery({
      nextUrl: syncUrl.initialUrl,
      context: {
        isActive: syncUrl.isActive,
        locationSearch: syncUrl.locationSearch,
        updateSearchParams: syncUrl.updateSearchParams,
      },
    });
  };

  const handleCallResultMessage = (data: IframeBridgeCallResultMessage) => {
    if (data.token !== handshakeTokenRef.current) {
      return;
    }
    if (typeof data.id !== 'string') {
      return;
    }
    const pending = pendingCallsRef.current.get(data.id);
    if (!pending) {
      return;
    }
    pendingCallsRef.current.delete(data.id);
    window.clearTimeout(pending.timeoutId);
    if (data.success) {
      pending.resolve(data.result);
    } else {
      const message = data?.error?.message || 'Iframe injected call failed';
      pending.reject(new Error(message));
    }
  };

  const handleSyncMessage = (data: IframeBridgeSyncMessage) => {
    if (!data.token) {
      postHandshake();
      if (!connectedRef.current) {
        connectedRef.current = true;
        optionsRef.current.onConnected?.();
      }
      return;
    }

    if (data.token !== handshakeTokenRef.current) {
      return;
    }
    const nextUrl = getSyncUrlFromMessage(data);
    if (!nextUrl) {
      return;
    }
    const { syncUrl } = optionsRef.current;
    if (!syncUrl) {
      return;
    }
    syncIframeUrlToQuery({
      nextUrl,
      context: {
        isActive: syncUrl.isActive,
        locationSearch: syncUrl.locationSearch,
        updateSearchParams: syncUrl.updateSearchParams,
      },
    });
  };

  const handleMessage = (event: MessageEvent) => {
    const { getIframeWindow } = optionsRef.current;
    if (event.source !== getIframeWindow()) {
      return;
    }
    const messageType = getBridgeMessageType(event.data);
    if (!messageType) {
      return;
    }
    if (messageType === IFRAME_BRIDGE_MESSAGE_TYPES.CALL_RESULT) {
      handleCallResultMessage(event.data as IframeBridgeCallResultMessage);
      return;
    }
    if (messageType === IFRAME_BRIDGE_MESSAGE_TYPES.SYNC_URL) {
      handleSyncMessage(event.data as IframeBridgeSyncMessage);
    }
  };

  window.addEventListener('message', handleMessage);
  syncInitialUrlIfNeeded();

  const callInjectedMethod: IframeBridgeInstance['callInjectedMethod'] = (
    method,
    args = [],
    options
  ) => {
    const { iframeOrigin, getIframeWindow } = optionsRef.current;
    if (!method || typeof method !== 'string') {
      return Promise.reject(new Error('Invalid method name'));
    }
    if (!iframeOrigin) {
      return Promise.reject(new Error('Iframe origin is empty'));
    }
    if (!getIframeWindow()) {
      return Promise.reject(new Error('Iframe not ready'));
    }
    if (!connectedRef.current) {
      postHandshake();
    }
    const callId = `${Date.now()}-${(callSeqRef.current += 1)}`;
    const timeoutMs = options?.timeoutMs ?? IFRAME_BRIDGE_DEFAULT_CALL_TIMEOUT;
    const normalizedArgs = normalizeArgs(args);

    return new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        pendingCallsRef.current.delete(callId);
        reject(new Error('Iframe call timeout'));
      }, timeoutMs);
      pendingCallsRef.current.set(callId, { resolve, reject, timeoutId });
      const posted = postMessageToIframe({
        type: IFRAME_BRIDGE_MESSAGE_TYPES.CALL,
        token: handshakeTokenRef.current,
        id: callId,
        method,
        args: normalizedArgs,
      });
      if (!posted) {
        window.clearTimeout(timeoutId);
        pendingCallsRef.current.delete(callId);
        reject(new Error('Iframe not ready'));
      }
    });
  };

  const reset = (reason = 'Iframe reloaded') => {
    connectedRef.current = false;
    handshakeTokenRef.current = createHandshakeToken();
    rejectPendingCalls(reason);
  };

  const updateOptions = (next: Partial<IframeBridgeOptions>) => {
    const hasSyncUrl = Object.prototype.hasOwnProperty.call(next, 'syncUrl');
    optionsRef.current = {
      ...optionsRef.current,
      ...next,
      syncUrl: hasSyncUrl ? next.syncUrl : optionsRef.current.syncUrl,
    };
    syncInitialUrlIfNeeded();
  };

  const destroy = () => {
    window.removeEventListener('message', handleMessage);
    rejectPendingCalls('Iframe unmounted');
  };

  return {
    callInjectedMethod,
    reset,
    updateOptions,
    destroy,
    connectedRef,
  };
};
