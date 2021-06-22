// eslint-disable-next-line @typescript-eslint/no-empty-function
export const noop = () => {};

export * from './WalletContext';

export * from './hooks';

export * from './tab';

export * from './time';

export * from './number';

const UI_TYPE = {
  Tab: 'index',
  Pop: 'popup',
  Notification: 'notification',
};

type UiTypeCheck = {
  [Prop in keyof typeof UI_TYPE as `is${Prop}`]: boolean;
};

export const getUiType = (): UiTypeCheck => {
  const { pathname } = window.location;
  return Object.entries(UI_TYPE).reduce((m, [key, value]) => {
    m[`is${key}`] = pathname === `/${value}.html`;

    return m;
  }, {} as UiTypeCheck);
};

export const hex2Text = (hex: string) => {
  try {
    return hex.startsWith('0x')
      ? decodeURIComponent(
          hex.replace(/^0x/, '').replace(/[0-9a-f]{2}/g, '%$&')
        )
      : hex;
  } catch {
    return hex;
  }
};

/**
 *
 * @param origin (exchange.pancakeswap.finance)
 * @returns (pancakeswap)
 */
export const getOriginName = (origin: string) => {
  const matches = origin.replace(/https?:\/\//, '').match(/^([^.]+\.)?(\S+)\./);

  return matches ? matches[2] || origin : origin;
};

export const hashCode = (str: string) => {
  if (!str) return 0;
  let hash = 0,
    i,
    chr,
    len;
  if (str.length === 0) return hash;
  for (i = 0, len = str.length; i < len; i++) {
    chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};
