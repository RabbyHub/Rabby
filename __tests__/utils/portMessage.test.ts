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
import { MessageDisconnectedError } from '@/utils/message/index';

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
});
