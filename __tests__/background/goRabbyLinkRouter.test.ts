import chrome from 'sinon-chrome';

type RouterListener = (details: {
  tabId: number;
  method: string;
  url: string;
}) => void;

function loadRouter() {
  chrome.runtime.getURL
    .withArgs('desktop.html#/desktop/profile')
    .returns('chrome-extension://test/desktop.html#/desktop/profile');
  chrome.runtime.getURL
    .withArgs('desktop.html#/desktop/perps')
    .returns('chrome-extension://test/desktop.html#/desktop/perps');
  chrome.runtime.getURL
    .withArgs('desktop.html#/desktop/profile?action=swap')
    .returns(
      'chrome-extension://test/desktop.html#/desktop/profile?action=swap'
    );
  chrome.runtime.getURL
    .withArgs('desktop.html#/desktop/profile?action=bridge')
    .returns(
      'chrome-extension://test/desktop.html#/desktop/profile?action=bridge'
    );
  chrome.tabs.update.returns(Promise.resolve());

  jest.isolateModules(() => {
    require('../../_raw/go-rabby-link-router.js');
  });

  const [
    listener,
    filter,
    extraInfoSpec,
  ] = chrome.webRequest.onBeforeRequest.addListener.firstCall.args;
  return {
    listener: listener as RouterListener,
    filter,
    extraInfoSpec,
  };
}

beforeEach(() => {
  chrome.webRequest.onBeforeRequest.addListener.resetHistory();
  chrome.tabs.update.resetHistory();
  chrome.runtime.getURL.resetHistory();
});

describe('go-regression.rabby.io top-level navigation router', () => {
  it('opens the home route by default and drops external parameters', () => {
    const { listener, filter, extraInfoSpec } = loadRouter();

    expect(filter).toEqual({
      urls: ['https://go.rabby.io/mobile/*'],
      types: ['main_frame'],
    });
    expect(extraInfoSpec).toBeUndefined();
    expect(
      listener({
        tabId: 7,
        method: 'GET',
        url: 'https://go.rabby.io/mobile/money?address=0x123&route=evil',
      })
    ).toBeUndefined();
    expect(
      chrome.tabs.update.calledWith(7, {
        url: 'chrome-extension://test/desktop.html#/desktop/profile',
      })
    ).toBe(true);
  });

  it.each([
    {
      target: 'home',
      desktopUrl: 'chrome-extension://test/desktop.html#/desktop/profile',
    },
    {
      target: 'perps',
      desktopUrl: 'chrome-extension://test/desktop.html#/desktop/perps',
    },
    {
      target: 'swap',
      desktopUrl:
        'chrome-extension://test/desktop.html#/desktop/profile?action=swap',
    },
    {
      target: 'bridge',
      desktopUrl:
        'chrome-extension://test/desktop.html#/desktop/profile?action=bridge',
    },
  ])(
    'opens the allowlisted $target desktop route',
    ({ target, desktopUrl }) => {
      const { listener } = loadRouter();

      listener({
        tabId: 8,
        method: 'GET',
        url: `https://go.rabby.io/mobile/?target=${target}&route=evil`,
      });

      expect(chrome.tabs.update.calledWith(8, { url: desktopUrl })).toBe(true);
    }
  );

  it('silently falls back to home for an unknown target', () => {
    const { listener } = loadRouter();

    listener({
      tabId: 9,
      method: 'GET',
      url: 'https://go.rabby.io/mobile/?target=../../unlock',
    });

    expect(
      chrome.tabs.update.calledWith(9, {
        url: 'chrome-extension://test/desktop.html#/desktop/profile',
      })
    ).toBe(true);
  });

  it.each([
    {
      tabId: -1,
      method: 'GET',
      url: 'https://go.rabby.io/mobile/',
    },
    {
      tabId: 1,
      method: 'POST',
      url: 'https://go.rabby.io/mobile/',
    },
    {
      tabId: 1,
      method: 'GET',
      url: 'https://go.rabby.io.evil.test/mobile/',
    },
    {
      tabId: 1,
      method: 'GET',
      url: 'https://go.rabby.io/.well-known/assetlinks.json',
    },
  ])('ignores an ineligible request %#', (request) => {
    const { listener } = loadRouter();

    expect(listener(request)).toBeUndefined();
    expect(chrome.tabs.update.called).toBe(false);
  });
});
