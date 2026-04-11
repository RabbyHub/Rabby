import { useCallback, useEffect, useRef } from 'react';
import { INJECTED_THEME_METHOD } from '@/ui/utils/iframeBridge';
import { createIframeBridge } from '@/ui/utils/iframeBridgeCore';

import type { RefObject } from 'react';
import type { IframeBridgeTheme } from '@/ui/utils/iframeBridge';
import type {
  CallInjectedMethodOptions,
  IframeBridgeInstance,
  IframeBridgeSyncOptions,
} from '@/ui/utils/iframeBridgeCore';

export type UseIframeBridgeOptions = {
  iframeRef: RefObject<HTMLIFrameElement>;
  iframeOrigin: string;
  rules?: unknown;
  theme: IframeBridgeTheme;
  onConnected?: () => void;
  syncUrl?: IframeBridgeSyncOptions;
  currentAddress: string;
};

export type UseIframeBridgeReturn = {
  callInjectedMethod: (
    method: string,
    args?: any[],
    options?: CallInjectedMethodOptions
  ) => Promise<any>;
  resetBridge: (reason?: string) => void;
  connectedRef: { current: boolean };
};

export const useIframeBridge = ({
  iframeRef,
  iframeOrigin,
  rules,
  theme,
  onConnected,
  syncUrl,
  currentAddress,
}: UseIframeBridgeOptions): UseIframeBridgeReturn => {
  const bridgeRef = useRef<IframeBridgeInstance | null>(null);
  const themeRef = useRef<IframeBridgeTheme>(theme);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  const syncTheme = useCallback((nextTheme: IframeBridgeTheme) => {
    const bridge = bridgeRef.current;
    if (!bridge?.connectedRef.current) {
      return;
    }
    bridge.callInjectedMethod(INJECTED_THEME_METHOD, [nextTheme]).catch(() => {
      // Ignore theme sync errors to avoid breaking bridge flow.
    });
  }, []);

  const handleConnected = useCallback(() => {
    onConnected?.();
    syncTheme(themeRef.current);
  }, [onConnected, syncTheme]);

  if (!bridgeRef.current) {
    bridgeRef.current = createIframeBridge({
      getIframeWindow: () => iframeRef.current?.contentWindow ?? null,
      iframeOrigin,
      rules,
      theme,
      onConnected: handleConnected,
      syncUrl,
      currentAddress,
    });
  }

  useEffect(() => {
    bridgeRef.current?.updateOptions({
      getIframeWindow: () => iframeRef.current?.contentWindow ?? null,
      iframeOrigin,
      rules,
      theme,
      onConnected: handleConnected,
      syncUrl,
    });
  }, [handleConnected, iframeOrigin, iframeRef, rules, syncUrl, theme]);

  useEffect(() => {
    syncTheme(theme);
  }, [syncTheme, theme]);

  useEffect(() => {
    return () => {
      bridgeRef.current?.destroy();
    };
  }, []);

  const callInjectedMethod = useCallback(
    (...args: Parameters<IframeBridgeInstance['callInjectedMethod']>) => {
      if (!bridgeRef.current) {
        return Promise.reject(new Error('Iframe bridge not ready'));
      }
      return bridgeRef.current.callInjectedMethod(...args);
    },
    []
  );

  const resetBridge = useCallback((reason?: string) => {
    bridgeRef.current?.reset(reason);
  }, []);

  return {
    callInjectedMethod,
    resetBridge,
    connectedRef: bridgeRef.current?.connectedRef ?? { current: false },
  };
};
