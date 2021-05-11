// eslint-disable-next-line @typescript-eslint/no-empty-function
export const noop = () => {};

export * from './WalletContext';

export * from './hooks';

export * from './tab';

export enum WINDOW_TYPE {
  TAB,
  POPUP,
  NOTIFICATION,
  BACKGROUND,
}

export const checkWindowType = () => {
  switch (window.location.pathname) {
    case '/index.html':
      return WINDOW_TYPE.TAB;
    case '/popup.html':
      return WINDOW_TYPE.POPUP;
    case '/notification.html':
      return WINDOW_TYPE.NOTIFICATION;
    default:
      return WINDOW_TYPE.BACKGROUND;
  }
};

export const isNotification = () =>
  checkWindowType() === WINDOW_TYPE.NOTIFICATION;
