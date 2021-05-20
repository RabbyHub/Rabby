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

const WINDOW_SIZE = {
  width: 400,
  height: 500,
};

const create = async (url): Promise<number | undefined> => {
  const win = await browser.windows.create({
    focused: true,
    url,
    type: 'popup',
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
