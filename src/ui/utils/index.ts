// eslint-disable-next-line @typescript-eslint/no-empty-function
export const noop = () => {};

export * from './WalletContext';

export * from './hooks';

export * from './tab';

export * from './time';

const UI_TYPE = {
  Tab: 'index',
  Pop: 'popup',
  Notification: 'notification',
};

type UiTypeCheck = {
  [Prop in keyof typeof UI_TYPE as `is${Prop}`]: boolean;
};

export const getUiType: () => UiTypeCheck = () => {
  const { pathname } = window.location;
  return Object.entries(UI_TYPE).reduce((m, [key, value]) => {
    m[`is${key}`] = pathname === `/${value}.html`;

    return m;
  }, {} as UiTypeCheck);
};

export const hex2Utf8 = (hex) => {
  return decodeURIComponent(
    hex.replace(/^0x/, '').replace(/[0-9a-f]{2}/g, '%$&')
  );
};
