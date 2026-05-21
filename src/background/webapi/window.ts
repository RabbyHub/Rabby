import * as Sentry from '@sentry/browser';
import browser, { Windows } from 'webextension-polyfill';
import { EventEmitter } from 'events';
import { IS_WINDOWS } from 'consts';

const event = new EventEmitter();

// if focus other windows, then reject the approval
browser.windows.onFocusChanged.addListener((winId) => {
  event.emit('windowFocusChange', winId);
});

let isManuallyClosed = true;
browser.runtime.onMessage.addListener(({ type }) => {
  if (type === 'closeNotification') {
    isManuallyClosed = false;
    event.emit('closeNotification');
  }
});
browser.windows.onRemoved.addListener((winId) => {
  event.emit('windowRemoved', winId, isManuallyClosed);
  isManuallyClosed = true;
});

const BROWSER_HEADER = 80;
const WINDOW_SIZE = {
  width: 400 + (IS_WINDOWS ? 14 : 0), // idk why windows cut the width.
  height: 600,
};

const isBoundsError = (error: unknown) => {
  return (
    error instanceof Error &&
    /Invalid value for bounds?|visible screen space/i.test(error.message)
  );
};

const reportWindowError = (message: string, error: unknown) => {
  Sentry.captureException(
    new Error(
      `${message}: ${
        error instanceof Error ? error.message : JSON.stringify(error)
      }`
    )
  );
};

const createPopupWindow = ({ url, ...rest }) => {
  return browser.windows.create({
    focused: true,
    url,
    type: 'popup',
    ...WINDOW_SIZE,
    ...rest,
  });
};

const createPopupWindowWithoutPosition = ({ url, ...rest }) => {
  const { top: _top, left: _left, ...restWithoutPosition } = rest;
  return createPopupWindow({ url, ...restWithoutPosition });
};

const createPopupWindowWithDefaultBounds = ({ url, ...rest }) => {
  const {
    top: _top,
    left: _left,
    width: _width,
    height: _height,
    ...restWithoutBounds
  } = rest;

  return browser.windows.create({
    focused: true,
    url,
    type: 'popup',
    ...restWithoutBounds,
  });
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
  const {
    top: cTop,
    left: cLeft,
    width,
  } = await browser.windows.getLastFocused({
    windowTypes: ['normal'],
  } as Windows.GetInfo);

  const top = cTop;
  const left = cLeft! + width! - WINDOW_SIZE.width;
  const position =
    Number.isFinite(top) && Number.isFinite(left) ? { top, left } : {};

  const currentWindow = await browser.windows.getLastFocused();
  let win;
  if (currentWindow.state === 'fullscreen') {
    // browser.windows.create not pass state to chrome
    win = await createFullScreenWindow({ url, ...rest });
  } else {
    try {
      win = await createPopupWindow({ url, ...position, ...rest });
    } catch (e) {
      if (isBoundsError(e)) {
        try {
          win = await createPopupWindowWithoutPosition({ url, ...rest });
        } catch (retryError) {
          if (!isBoundsError(retryError)) {
            throw retryError;
          }
          win = await createPopupWindowWithDefaultBounds({ url, ...rest });
        }
      } else {
        reportWindowError('tx prompt error', e);
        win = await createPopupWindowWithDefaultBounds({ url, ...rest });
      }
    }
  }
  // shim firefox
  if (
    win &&
    Number.isFinite(top) &&
    Number.isFinite(left) &&
    win.left !== left &&
    currentWindow.state !== 'fullscreen'
  ) {
    try {
      await browser.windows.update(win.id!, { left, top });
    } catch (e) {
      // nothing to do, just avoid error prevent id response
    }
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
