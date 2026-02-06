import type { FlowConfig } from '@/content-script/auto-click-runner';

export const IFRAME_BRIDGE_MESSAGE_TYPES = {
  HANDSHAKE: 'rabby-dapp-iframe-handshake',
  SYNC_URL: 'rabby-dapp-iframe-sync-url',
  CALL: 'rabby-dapp-iframe-call',
  CALL_RESULT: 'rabby-dapp-iframe-call-result',
} as const;

export type IframeBridgeMessageType = typeof IFRAME_BRIDGE_MESSAGE_TYPES[keyof typeof IFRAME_BRIDGE_MESSAGE_TYPES];

export type IframeBridgeTheme = 'dark' | 'light';

export type IframeBridgeHandshakeMessage = {
  type: typeof IFRAME_BRIDGE_MESSAGE_TYPES.HANDSHAKE;
  token: string;
  rules?: FlowConfig;
  theme?: IframeBridgeTheme;
  currentAddress: string;
};

export type IframeBridgeSyncMessage = {
  type: typeof IFRAME_BRIDGE_MESSAGE_TYPES.SYNC_URL;
  token?: string | null;
  payload?: { url?: string };
  url?: string;
  syncUrl?: string;
  href?: string;
};

export type SerializedError = {
  message: string;
  name?: string;
  stack?: string;
};

export type IframeBridgeCallMessage = {
  type: typeof IFRAME_BRIDGE_MESSAGE_TYPES.CALL;
  token: string;
  id: string;
  method: string;
  args: any[];
};

export type IframeBridgeCallResultMessage = {
  type: typeof IFRAME_BRIDGE_MESSAGE_TYPES.CALL_RESULT;
  token: string;
  id: string;
  success: boolean;
  result?: any;
  error?: SerializedError;
};

export type IframeBridgeMessage =
  | IframeBridgeHandshakeMessage
  | IframeBridgeSyncMessage
  | IframeBridgeCallMessage
  | IframeBridgeCallResultMessage;

export const IFRAME_BRIDGE_DEFAULT_CALL_TIMEOUT = 12 * 1000;
export const INJECTED_NAMESPACE = '__rabbyDesktopInjected';
export const INJECTED_THEME_METHOD = 'setRabbyTheme' as const;

const MESSAGE_TYPE_SET = new Set(
  Object.values(IFRAME_BRIDGE_MESSAGE_TYPES) as string[]
);

export const isPlainObject = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null;

export const getBridgeMessageType = (
  data: unknown
): IframeBridgeMessageType | null => {
  if (!isPlainObject(data)) {
    return null;
  }
  const type = data.type;
  if (typeof type !== 'string') {
    return null;
  }
  if (!MESSAGE_TYPE_SET.has(type)) {
    return null;
  }
  return type as IframeBridgeMessageType;
};

export const normalizeArgs = (args: unknown): any[] => {
  if (Array.isArray(args)) {
    return args;
  }
  if (args === undefined || args === null) {
    return [];
  }
  return [args];
};

export const getSyncUrlFromMessage = (
  data: IframeBridgeSyncMessage
): string | null => {
  const nextUrl =
    data?.payload?.url || data?.url || data?.syncUrl || data?.href;
  return typeof nextUrl === 'string' ? nextUrl : null;
};

export const createHandshakeToken = () => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const serializeError = (error: unknown): SerializedError => {
  if (error instanceof Error) {
    return {
      message: error.message || 'Unknown error',
      name: error.name,
      stack: error.stack,
    };
  }
  if (typeof error === 'string') {
    return { message: error };
  }
  try {
    return { message: JSON.stringify(error) };
  } catch (err) {
    return { message: 'Unknown error' };
  }
};

export const ensureInjectedNamespace = () => {
  if (typeof window === 'undefined') {
    return {} as Record<string, (...args: any[]) => any>;
  }
  const windowAny = window as any;
  if (!windowAny[INJECTED_NAMESPACE]) {
    windowAny[INJECTED_NAMESPACE] = {};
  }
  return windowAny[INJECTED_NAMESPACE] as Record<
    string,
    (...args: any[]) => any
  >;
};
