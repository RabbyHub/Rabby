import type { WalletControllerType } from '../utils/WalletContext';
import PortMessage from '@/utils/message/portMessage';
import { BACKGROUND_READY_MESSAGE } from '@/utils/message/constants';

export type WalletRequest = {
  method: PropertyKey;
  params: unknown[];
  type:
    | 'controller'
    | 'openapi'
    | 'testnetOpenapi'
    | 'fakeTestnetOpenapi'
    | 'broadcast';
};

type PendingRequest = {
  data: WalletRequest;
  reject: (error: unknown) => void;
  resolve: (value: unknown) => void;
};

export type WalletMessageChannel = {
  connect: (name?: string) => unknown;
  dispose: () => void;
  on: (
    event: 'disconnect' | 'message',
    listener: (message?: any) => void
  ) => unknown;
  request: (data: WalletRequest) => Promise<unknown>;
};

type CreateWalletOptions = {
  channel?: WalletMessageChannel;
  name: string;
  onBroadcast: (data: { type: string; data: unknown }) => void;
};

const createNamespaceProxy = (
  request: (data: WalletRequest) => Promise<unknown>,
  type: WalletRequest['type']
) =>
  new Proxy(
    {},
    {
      get(_target, method) {
        if (method === 'then') return undefined;
        return (...params: unknown[]) => request({ type, method, params });
      },
    }
  );

/**
 * Creates the UI wallet immediately and buffers calls until the background
 * service signals that its stores and controller are ready.
 */
export const createWallet = ({
  channel = new PortMessage(),
  name,
  onBroadcast,
}: CreateWalletOptions) => {
  const pendingRequests: PendingRequest[] = [];
  let backgroundReady = false;
  let connectedOnce = false;
  let disposed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let reconnectAttempt = 0;
  const reconnectListeners = new Set<() => void>();
  let resolveReady!: () => void;
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });

  const sendRequest = (data: WalletRequest) => channel.request(data);

  const flushPendingRequests = () => {
    pendingRequests.splice(0).forEach(({ data, resolve, reject }) => {
      void sendRequest(data).then(resolve, reject);
    });
  };

  const request = (data: WalletRequest): Promise<unknown> => {
    if (backgroundReady) return sendRequest(data);
    return new Promise((resolve, reject) => {
      pendingRequests.push({ data, resolve, reject });
    });
  };

  const connectChannel = () => {
    if (disposed) return;
    reconnectTimer = undefined;
    try {
      channel.connect(name);
    } catch {
      scheduleReconnect();
    }
  };

  const scheduleReconnect = () => {
    if (disposed || reconnectTimer) return;
    const retryDelay = Math.min(100 * 2 ** reconnectAttempt, 2_000);
    reconnectAttempt += 1;
    reconnectTimer = setTimeout(connectChannel, retryDelay);
  };

  channel.on('disconnect', () => {
    if (disposed) return;
    backgroundReady = false;
    scheduleReconnect();
  });

  channel.on('message', (message) => {
    if (message?.event === BACKGROUND_READY_MESSAGE) {
      if (!backgroundReady) {
        backgroundReady = true;
        reconnectAttempt = 0;
        const reconnected = connectedOnce;
        connectedOnce = true;
        if (!reconnected) {
          resolveReady();
        }
        flushPendingRequests();
        if (reconnected) {
          reconnectListeners.forEach((listener) => listener());
        }
      }
      return;
    }
    if (message?.event === 'broadcast') {
      onBroadcast(message.data);
    }
  });

  const namespaces = {
    openapi: createNamespaceProxy(request, 'openapi'),
    testnetOpenapi: createNamespaceProxy(request, 'testnetOpenapi'),
    fakeTestnetOpenapi: createNamespaceProxy(request, 'fakeTestnetOpenapi'),
  };

  const wallet = new Proxy(
    {},
    {
      get(_target, key) {
        if (key === 'then') return undefined;
        if (key in namespaces) {
          return namespaces[key as keyof typeof namespaces];
        }
        return (...params: unknown[]) =>
          request({ type: 'controller', method: key, params });
      },
    }
  ) as WalletControllerType;

  connectChannel();

  return {
    wallet,
    ready,
    request,
    onReconnect(listener: () => void) {
      reconnectListeners.add(listener);
      return () => reconnectListeners.delete(listener);
    },
    dispose() {
      disposed = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = undefined;
      }
      const error = new Error('Wallet message channel disposed');
      pendingRequests.splice(0).forEach(({ reject }) => reject(error));
      reconnectListeners.clear();
      channel.dispose();
    },
  };
};
