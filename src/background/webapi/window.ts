import { EventEmitter } from 'events';

const event = new EventEmitter();

// if focus other windows, then reject the approval
chrome.windows.onFocusChanged.addListener((winId) => {
  event.emit('windowFocusChange', winId);
});

chrome.windows.onRemoved.addListener((winId) => {
  event.emit('windowRemoved', winId);
});

const WINDOW_SIZE = {
  width: 366,
  height: 440,
};

const create = (url): Promise<number> => {
  return new Promise((resolve, reject) => {
    chrome.windows.create(
      {
        focused: true,
        url,
        type: 'popup',
        ...WINDOW_SIZE,
      },
      (win) => resolve(win!.id)
    );
  });
};

const remove = (winId) => {
  return new Promise((resolve, reject) => {
    chrome.windows.remove(winId, resolve);
  });
};

const openNotification = (route = ''): Promise<number> => {
  const url = `notification.html${route && `#${route}`}`;

  return create(url);
};

export default {
  openNotification,
  event,
  remove,
};
