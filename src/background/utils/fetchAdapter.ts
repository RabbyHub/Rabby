import axios from 'axios';
import type { AxiosAdapter, AxiosRequestConfig, AxiosResponse } from 'axios';

type AxiosErrorCtor = typeof import('axios').AxiosError;

type AxiosErrorLike = Error & { isAxiosError?: boolean };

type FetchResult<T = any> = AxiosResponse<T> | AxiosErrorLike;

type AdapterExtras = {
  mode?: RequestMode;
  cache?: RequestCache;
  integrity?: string;
  redirect?: RequestRedirect;
  referrer?: string;
  settle?: (
    resolve: (value: AxiosResponse) => void,
    reject: (reason?: any) => void,
    response: AxiosResponse
  ) => void;
  responseType?: AxiosRequestConfig['responseType'];
};

const fetchAdapter: AxiosAdapter = async (config) => {
  const request = createRequest(config);
  const executors: Array<Promise<FetchResult>> = [getResponse(request, config)];
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  if (config.timeout && config.timeout > 0) {
    executors.push(
      new Promise<FetchResult>((resolve) => {
        timeoutId = setTimeout(() => {
          const message =
            config.timeoutErrorMessage ??
            `timeout of ${config.timeout}ms exceeded`;
          const transitional = config.transitional ?? {};
          const timeoutCode = transitional.clarifyTimeoutError
            ? 'ETIMEDOUT'
            : 'ECONNABORTED';
          resolve(createError(message, config, timeoutCode, request));
        }, config.timeout);
      })
    );
  }

  const settled = await Promise.race(executors);

  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  if (settled instanceof Error) {
    throw settled;
  }

  const extras = config as AdapterExtras;

  if (extras.settle) {
    return await new Promise<AxiosResponse>((resolve, reject) => {
      extras.settle!(resolve, reject, settled);
    });
  }

  return settleResponse(settled);
};

export default fetchAdapter;

async function getResponse(
  request: Request,
  config: AxiosRequestConfig
): Promise<FetchResult> {
  let stageOne: Response;

  try {
    stageOne = await fetch(request);
  } catch (error: any) {
    if (isAbortError(error)) {
      return createError('Request aborted', config, 'ERR_CANCELED', request);
    }
    return createError('Network Error', config, 'ERR_NETWORK', request);
  }

  const responseHeaders = toPlainHeaders(stageOne.headers);
  const response: AxiosResponse = {
    data: await parseBody(stageOne, config),
    status: stageOne.status,
    statusText: stageOne.statusText,
    headers: responseHeaders,
    config,
    request,
  };

  return response;
}

function createRequest(config: AxiosRequestConfig) {
  const headers = new Headers();
  if (config.headers) {
    Object.keys(config.headers).forEach((key) => {
      const value = (config.headers as any)[key];
      if (value == null) return;
      headers.append(key, String(value));
    });
  }

  if (config.auth) {
    const username = config.auth.username ?? '';
    const password = config.auth.password
      ? decodeURI(encodeURIComponent(config.auth.password))
      : '';
    headers.set('Authorization', `Basic ${btoa(`${username}:${password}`)}`);
  }

  const method = (config.method ?? 'get').toUpperCase();
  const options: RequestInit = {
    headers,
    method,
  };

  if (
    method !== 'GET' &&
    method !== 'HEAD' &&
    typeof config.data !== 'undefined'
  ) {
    options.body = config.data as BodyInit;
  }

  const extras = config as AdapterExtras;
  if (extras.mode) {
    options.mode = extras.mode;
  }
  if (extras.cache) {
    options.cache = extras.cache;
  }
  if (extras.integrity) {
    options.integrity = extras.integrity;
  }
  if (extras.redirect) {
    options.redirect = extras.redirect;
  }
  if (extras.referrer) {
    options.referrer = extras.referrer;
  }
  if (!isUndefined(config.withCredentials)) {
    options.credentials = config.withCredentials ? 'include' : 'omit';
  }
  if (config.signal) {
    options.signal = config.signal;
  }

  const url = axios.getUri(config);

  return new Request(url, options);
}

function settleResponse(response: AxiosResponse) {
  const validateStatus = response.config?.validateStatus;

  if (!response.status || !validateStatus || validateStatus(response.status)) {
    return response;
  }

  const code = response.status >= 500 ? 'ERR_BAD_RESPONSE' : 'ERR_BAD_REQUEST';

  throw createError(
    `Request failed with status code ${response.status}`,
    response.config,
    code,
    response.request,
    response
  );
}

function parseBody(response: Response, config: AxiosRequestConfig) {
  const method = (config.method ?? 'get').toUpperCase();
  if (method === 'HEAD' || response.status === 204 || response.status === 205) {
    return Promise.resolve(null);
  }

  const responseType = (config as AdapterExtras).responseType;

  switch (responseType) {
    case 'arraybuffer':
      return response.arrayBuffer();
    case 'blob':
      return response.blob();
    case 'stream':
      return Promise.resolve(response.body);
    case 'json':
      return parseJsonSafely(response);
    case 'document':
    case 'text':
    default:
      return response.text();
  }
}

async function parseJsonSafely(response: Response) {
  const text = await response.text();
  if (!text) {
    return text;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toPlainHeaders(headers: Headers) {
  const flattened: Record<string, string> = {};
  headers.forEach((value, key) => {
    const existing = flattened[key];
    flattened[key] = existing ? `${existing}, ${value}` : value;
  });
  return flattened;
}

function isAbortError(error: any): boolean {
  return (
    !!error &&
    (error.name === 'AbortError' ||
      error.code === 'ERR_CANCELED' ||
      error.message === 'canceled')
  );
}

function createError(
  message: string,
  config: AxiosRequestConfig,
  code?: string,
  request?: any,
  response?: AxiosResponse
) {
  const AxiosErrorClass: AxiosErrorCtor | undefined = (axios as any).AxiosError;
  const resolvedCode = resolveAxiosCode(code, AxiosErrorClass);

  if (AxiosErrorClass && typeof AxiosErrorClass === 'function') {
    return new AxiosErrorClass(
      message,
      resolvedCode,
      config,
      request,
      response
    );
  }

  return enhanceError(
    new Error(message),
    config,
    resolvedCode,
    request,
    response
  );
}

function resolveAxiosCode(code: string | undefined, ctor?: AxiosErrorCtor) {
  if (!code) return code;
  if (ctor && (ctor as any)[code]) {
    return (ctor as any)[code];
  }
  return code;
}

function enhanceError(
  error: AxiosErrorLike,
  config: AxiosRequestConfig,
  code?: string,
  request?: any,
  response?: AxiosResponse
) {
  (error as any).config = config;
  if (code) {
    (error as any).code = code;
  }
  if (request) {
    (error as any).request = request;
  }
  if (response) {
    (error as any).response = response;
  }
  error.isAxiosError = true;
  (error as any).toJSON = function toJSON() {
    return {
      message: this.message,
      name: this.name,
      description: (this as any).description,
      number: (this as any).number,
      fileName: (this as any).fileName,
      lineNumber: (this as any).lineNumber,
      columnNumber: (this as any).columnNumber,
      stack: this.stack,
      config: (this as any).config,
      code: (this as any).code,
      status:
        this.response && this.response.status ? this.response.status : null,
    };
  };
  return error;
}

function isUndefined(value: unknown): value is undefined {
  return typeof value === 'undefined';
}
