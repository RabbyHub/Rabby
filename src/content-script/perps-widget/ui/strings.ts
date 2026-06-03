/** v1 ships hardcoded English. When i18n lands, replace keys with lookups against `perpsWidget.*`. */

export const STRINGS = {
  hiddenPositions: (count: number): string =>
    count === 0
      ? 'View more detail in web'
      : `${count} position${count > 1 ? 's' : ''} hidden, view in web`,
  pnl: 'PNL',
  connectionLost: 'Connection lost, reconnecting...',
  loading: 'Loading...',
};
