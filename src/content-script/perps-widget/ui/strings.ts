/** v1 ships hardcoded English. When i18n lands, replace keys with lookups against `perpsWidget.*`. */

export const STRINGS = {
  hiddenPositions: (count: number): string =>
    count === 0
      ? 'Open Pro Mode to view more details'
      : `${count} position${count > 1 ? 's' : ''} hidden, View all in Pro Mode`,
  pnl: 'PNL',
};
