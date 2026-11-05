const mockConnect = jest.fn();

jest.mock('webextension-polyfill', () => ({
  __esModule: true,
  default: {
    runtime: {
      connect: (...args: unknown[]) => mockConnect(...args),
    },
  },
}));

import PortMessage from '@/utils/message/portMessage';
import {
  MessageDisconnectedError,
  setMessageErrorReporter,
} from '@/utils/message/index';
import { errorCodes } from 'eth-rpc-errors';

const createEvent = () => {
  const listeners: ((...args: any[]) => void)[] = [];
  return {
    addListener(listener: (...args: any[]) => void) {
      listeners.push(listener);
    },
    emit(...args: any[]) {
      listeners.forEach((listener) => listener(...args));
    },
  };
};

const createPort = () => ({
  disconnect: jest.fn(),
  onDisconnect: createEvent(),
  onMessage: createEvent(),
  postMessage: jest.fn(),
});

describe('PortMessage', () => {
  beforeEach(() => {
    mockConnect.mockReset();
  });

  test('rejects in-flight requests and reports a port disconnect', async () => {
    const port = createPort();
    mockConnect.mockReturnValue(port);
    const message = new PortMessage().connect('popup');
    const onDisconnect = jest.fn();
    message.on('disconnect', onDisconnect);

    const request = message.request({ method: 'isUnlocked' });
    await Promise.resolve();
    await Promise.resolve();
    expect(port.postMessage).toHaveBeenCalledTimes(1);

    port.onDisconnect.emit();

    await expect(request).rejects.toBeInstanceOf(MessageDisconnectedError);
    expect(message.port).toBeNull();
    expect(onDisconnect).toHaveBeenCalledTimes(1);
  });

  test('rejects requests instead of leaving them pending without a port', async () => {
    const message = new PortMessage();

    await expect(
      message.request({ method: 'isUnlocked' })
    ).rejects.toBeInstanceOf(MessageDisconnectedError);
  });

  // The content script forwards these rejections to the dapp, which branches
  // on `error.code`. Before this carried a code the dapp saw a bare message.
  test('carries the EIP-1193 disconnected code', async () => {
    const port = createPort();
    mockConnect.mockReturnValue(port);
    const message = new PortMessage().connect('popup');

    const request = message.request({ method: 'eth_sendTransaction' });
    await Promise.resolve();
    await Promise.resolve();
    port.onDisconnect.emit();

    await expect(request).rejects.toMatchObject({
      code: errorCodes.provider.disconnected,
    });
    expect(errorCodes.provider.disconnected).toBe(4900);
  });

  test('relays the disconnected code across the request boundary', async () => {
    // Mirrors the content script: a page request is forwarded over a port that
    // is already gone, and the failure has to reach the page with its code.
    const pageSide = new PortMessage();
    const relay = new PortMessage();
    const sent: any[] = [];
    (pageSide as any).send = (type: string, data: any) => {
      sent.push({ type, data });
      return true;
    };
    pageSide.listenCallback = (data: any) => relay.request(data);

    await pageSide.onRequest({ ident: 'req-1', data: { method: 'eth_chainId' } });

    const response = sent.find((item) => item.type === 'response');
    expect(response.data.err).toMatchObject({
      code: errorCodes.provider.disconnected,
      message: 'Message channel disconnected',
    });
  });

  // The reporter decides by method, e.g. to withhold the message of an error
  // thrown while handling a private key.
  test('hands the failed request to the error reporter', async () => {
    const reporter = jest.fn(() => true);
    setMessageErrorReporter(reporter);
    const listener = new PortMessage();
    const sent: any[] = [];
    (listener as any).send = (type: string, data: any) => {
      sent.push({ type, data });
      return true;
    };
    const error = new TypeError('boom');
    listener.listenCallback = () => {
      throw error;
    };
    const request = { type: 'controller', method: 'importPrivateKey' };

    await listener.onRequest({ ident: 'req-1', data: request });

    expect(reporter).toHaveBeenCalledWith(error, request);
    expect(sent[0].data.err).toMatchObject({
      message: 'boom',
      reportedFromBackground: true,
    });
    setMessageErrorReporter(() => false);
  });
});
