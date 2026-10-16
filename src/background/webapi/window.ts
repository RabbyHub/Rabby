import * as Sentry from '@sentry/browser';
import browser, { Windows } from 'webextension-polyfill';
import { EventEmitter } from 'events';
import { IS_WINDOWS } from 'consts';

const event = new EventEmitter();

// if focus other windows, then reject the approval
browser.windows.onFocusChanged.addListener((winId) => {
  event.emit('windowFocusChange', winId);
});

const programmaticallyClosingWindows = new Set<number>();
browser.windows.onRemoved.addListener((winId) => {
  const isManuallyClosed = !programmaticallyClosingWindows.delete(winId);
  event.emit('windowRemoved', winId, isManuallyClosed);
});

const BROWSER_HEADER = 80;
const WINDOW_SIZE = {
  width: 400 + (IS_WINDOWS ? 14 : 0), // idk why windows cut the width.
  height: 600,
};

const createFullScreenWindow = ({ url, ...rest }) => {
  return browser.windows.create({
    focused: true,
    url,
    type: 'popup',
    ...rest,
    width: undefined,
    height: undefined,
    left: undefined,
    top: undefined,
    state: 'fullscreen',
  });
};

const create = async ({ url, ...rest }): Promise<number | undefined> => {
  const [normalWindow, currentWindow] = await Promise.all([
    browser.windows.getLastFocused({
      windowTypes: ['normal'],
    } as Windows.GetInfo),
    browser.windows.getLastFocused(),
  ]);
  const { top: cTop, left: cLeft, width, height } = normalWindow;

  const top = cTop;
  const left = cLeft! + width! - WINDOW_SIZE.width;
  const optionHeight = rest.height || 600;
  const maxHeight = (height || 1000) - 40;
  const finalHeight = Math.min(Math.max(optionHeight, 600), maxHeight);

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
        height: finalHeight,
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
          height: finalHeight,
        });
      } else {
        Sentry.captureException(`tx prompt error: ${JSON.stringify(e)}`);
      }
    }
  }
  if (!win) return;

  // shim firefox
  if (win.left !== left && currentWindow.state !== 'fullscreen') {
    try {
      await browser.windows.update(win.id!, { left, top });
    } catch (e) {
      // nothing to do, just avoid error prevent id response
    }
  }

  return win.id;
};

const remove = async (winId: number) => {
  // Register before calling the browser: onRemoved may arrive before the
  // removal promise resolves, and other windows can close in the meantime.
  programmaticallyClosingWindows.add(winId);
  try {
    return await browser.windows.remove(winId);
  } catch (error) {
    programmaticallyClosingWindows.delete(winId);
    throw error;
  }
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
