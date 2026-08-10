/** v1 ships hardcoded English. When i18n lands, replace keys with lookups against `perpsWidget.*`. */

export const STRINGS = {
  /** Truncated list invites viewing the rest; a complete list just offers Pro Mode. */
  footerLink: (hiddenCount: number): string =>
    hiddenCount > 0 ? 'See more positions' : 'Open Pro Mode',
  pnl: 'PNL',
  hideWidget: 'Hide this widget. Re-enable it in Settings.',
};
