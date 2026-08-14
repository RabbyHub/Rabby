import { EventEmitter } from 'events';
import { createWallet } from '@/ui/wallet/createWallet';
import { BACKGROUND_READY_MESSAGE } from '@/utils/message/constants';

class TestChannel extends EventEmitter {
  connectedName?: string;
  connectedNames: (string | undefined)[] = [];
  requests: any[] = [];

  connect(name?: string) {
    this.connectedName = name;
    this.connectedNames.push(name);
    return this;
  }

  request = async (data: any) => {
    this.requests.push(data);
    return `${String(data.type)}:${String(data.method)}`;
  };

  dispose() {
    return undefined;
  }
}

describe('createWallet', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('buffers wallet calls until the background ready handshake', async () => {
    const channel = new TestChannel();
    const { wallet, ready } = createWallet({
      channel,
      name: 'popup',
      onBroadcast: jest.fn(),
    });

    const controllerRequest = wallet.isUnlocked();
    const openapiRequest = wallet.openapi.getSupportedDEXList();

    expect(channel.connectedName).toBe('popup');
    expect(channel.requests).toEqual([]);

    channel.emit('message', { event: BACKGROUND_READY_MESSAGE });
    await ready;

    await expect(controllerRequest).resolves.toBe('controller:isUnlocked');
    await expect(openapiRequest).resolves.toBe('openapi:getSupportedDEXList');
    expect(channel.requests.map(({ method }) => method)).toEqual([
      'isUnlocked',
      'getSupportedDEXList',
    ]);
  });

  test('forwards background broadcasts separately from request responses', () => {
    const channel = new TestChannel();
    const onBroadcast = jest.fn();
    createWallet({
      channel,
      name: 'tab',
      onBroadcast,
    });

    channel.emit('message', {
      event: 'broadcast',
      data: { type: 'storeChanged', data: { selectedChain: 'ETH' } },
    });

    expect(onBroadcast).toHaveBeenCalledWith({
      type: 'storeChanged',
      data: { selectedChain: 'ETH' },
    });
  });

  test('does not expose thenable wallet proxies', async () => {
    const channel = new TestChannel();
    const { wallet } = createWallet({
      channel,
      name: 'popup',
      onBroadcast: jest.fn(),
    });

    expect((wallet as any).then).toBeUndefined();
    expect((wallet.openapi as any).then).toBeUndefined();
    await expect(Promise.resolve(wallet)).resolves.toBe(wallet);
    expect(channel.requests).toEqual([]);
  });

  test('reconnects and buffers new calls until the restarted background is ready', async () => {
    jest.useFakeTimers();
    const channel = new TestChannel();
    const onReconnect = jest.fn();
    const client = createWallet({
      channel,
      name: 'popup',
      onBroadcast: jest.fn(),
    });
    client.onReconnect(onReconnect);

    channel.emit('message', { event: BACKGROUND_READY_MESSAGE });
    await client.ready;
    channel.requests = [];

    channel.emit('disconnect');
    const request = client.wallet.isUnlocked();

    expect(channel.connectedNames).toEqual(['popup']);
    jest.advanceTimersByTime(100);
    expect(channel.connectedNames).toEqual(['popup', 'popup']);
    expect(channel.requests).toEqual([]);

    channel.emit('message', { event: BACKGROUND_READY_MESSAGE });

    await expect(request).resolves.toBe('controller:isUnlocked');
    expect(channel.requests).toEqual([
      expect.objectContaining({ method: 'isUnlocked', type: 'controller' }),
    ]);
    expect(onReconnect).toHaveBeenCalledTimes(1);
  });
});
