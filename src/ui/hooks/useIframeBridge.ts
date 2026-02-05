import { useCallback, useEffect, useRef } from 'react';
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

  if (!bridgeRef.current) {
    bridgeRef.current = createIframeBridge({
      getIframeWindow: () => iframeRef.current?.contentWindow ?? null,
      iframeOrigin,
      rules,
      theme,
      onConnected,
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
      onConnected,
      syncUrl,
    });
  }, [iframeOrigin, iframeRef, onConnected, rules, syncUrl, theme]);

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
