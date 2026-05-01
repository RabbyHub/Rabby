import initLattice from '@/offscreen/scripts/lattice';
import {
  KnownOrigins,
  OffscreenCommunicationTarget,
} from '@/constant/offscreen-communication';

describe('Lattice offscreen connector', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (chrome.runtime.onMessage.addListener as any).resetHistory();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('ignores messages from a different window before accepting Lattice credentials', async () => {
    const connectorWindow = { closed: false } as Window;
    const otherWindow = { closed: false } as Window;
    const sendResponse = jest.fn();

    jest.spyOn(window, 'open').mockReturnValue(connectorWindow);

    initLattice();

    const listener = (chrome.runtime.onMessage.addListener as any).getCall(0)
      .args[0];
    const keepPortOpen = listener(
      {
        target: OffscreenCommunicationTarget.latticeOffscreen,
        params: { url: 'https://lattice.gridplus.io' },
      },
      {},
      sendResponse
    );

    await Promise.resolve();

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: KnownOrigins.lattice,
        source: otherWindow,
        data: JSON.stringify({ deviceID: 'bad', password: 'bad' }),
      })
    );

    expect(sendResponse).not.toHaveBeenCalled();

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: KnownOrigins.lattice,
        source: connectorWindow,
        data: { deviceID: 'bad', password: 'bad' },
      })
    );

    expect(sendResponse).not.toHaveBeenCalled();

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: KnownOrigins.lattice,
        source: connectorWindow,
        data: JSON.stringify({ deviceID: 'device', password: 'password' }),
      })
    );

    expect(keepPortOpen).toBe(true);
    expect(sendResponse).toHaveBeenCalledTimes(1);
    expect(sendResponse).toHaveBeenCalledWith({
      result: { deviceID: 'device', password: 'password' },
    });
  });
});
