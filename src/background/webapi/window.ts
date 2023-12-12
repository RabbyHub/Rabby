import * as Sentry from '@sentry/browser';
import browser, { Windows } from 'webextension-polyfill';
import { EventEmitter } from 'events';
import { IS_WINDOWS } from 'consts';

const event = new EventEmitter();

// if focus other windows, then reject the approval
browser.windows.onFocusChanged.addListener((winId) => {
  event.emit('windowFocusChange', winId);
});

browser.windows.onRemoved.addListener((winId) => {
  event.emit('windowRemoved', winId);
});

const BROWSER_HEADER = 80;
const WINDOW_SIZE = {
  width: 400 + (IS_WINDOWS ? 14 : 0), // idk why windows cut the width.
  height: 600,
};

const createFullScreenWindow = ({ url, ...rest }) => {
  return new Promise((resolve) => {
    chrome.windows.create(
      {
        focused: true,
        url,
        type: 'popup',
        ...rest,
        width: undefined,
        height: undefined,
        left: undefined,
        top: undefined,
        state: 'fullscreen',
      },
      (win) => {
        resolve(win);
      }
    );
  });
};

const create = async ({ url, ...rest }): Promise<number | undefined> => {
  const { top: cTop, left: cLeft, width } = await browser.windows.getCurrent({
    windowTypes: ['normal'],
  } as Windows.GetInfo);

  const top = cTop;
  const left = cLeft! + width! - WINDOW_SIZE.width;

  const currentWindow = await browser.windows.getCurrent();
  let win;
  if (currentWindow.state === 'fullscreen') {
    // browser.windows.create not pass state to chrome
    win = await createFullScreenWindow({ url, ...rest });
  } else {
    try {
      win = await browser.windows.create({
        focused: true,
        url,
        type: 'popup',
        top,
        left,
        ...WINDOW_SIZE,
        ...rest,
      });
    } catch (e) {
      if (e.message && /Invalid value for bound/i.test(e.message)) {
        win = await browser.windows.create({
          focused: true,
          url,
          type: 'popup',
          top: 0,
          left: 0,
          ...WINDOW_SIZE,
          ...rest,
        });
      } else {
        Sentry.captureException(`tx prompt error: ${JSON.stringify(e)}`);
      }
    }
  }
  // shim firefox
  if (win.left !== left && currentWindow.state !== 'fullscreen') {
    await browser.windows.update(win.id!, { left, top });
  }

  return win.id;
};

const remove = async (winId) => {
  return browser.windows.remove(winId);
};

const openNotification = ({ route = '', ...rest } = {}): Promise<
  number | undefined
> => {
  const url = `notification.html${route && `#${route}`}`;

  return create({ url, ...rest });
};

export default {
  openNotification,
  event,
  remove,
};
