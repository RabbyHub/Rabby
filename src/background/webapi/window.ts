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

const create = (hash = ''): Promise<number> => {
  return new Promise((resolve, reject) => {
    chrome.windows.create(
      {
        focused: true,
        url: `notification.html${hash}`,
        type: 'popup',
        ...WINDOW_SIZE,
      },
      (win) => resolve(win!.id)
    );
  });
};

const remove = (winId) => {
  chrome.windows.remove(winId);
};

let window = {
  create,
  event,
  remove,
};

export default window;
