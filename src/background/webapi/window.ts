import { browser } from 'webextension-polyfill-ts';
import { EventEmitter } from 'events';

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
  width: 400,
  height: 530,
};

const create = async (url): Promise<number | undefined> => {
  const { top: cTop, left: cLeft, width } = await browser.windows.getCurrent();
  const top = cTop! + BROWSER_HEADER;
  const left = cLeft! + width! - WINDOW_SIZE.width;

  const win = await browser.windows.create({
    focused: true,
    url,
    type: 'popup',
    top,
    left,
    ...WINDOW_SIZE,
  });

  return win.id;
};

const remove = async (winId) => {
  return browser.windows.remove(winId);
};

const openNotification = (route = ''): Promise<number | undefined> => {
  const url = `notification.html${route && `#${route}`}`;

  return create(url);
};

export default {
  openNotification,
  event,
  remove,
};
