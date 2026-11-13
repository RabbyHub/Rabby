export const EXTENSION_MESSAGES = {
  CONNECTION_READY: 'CONNECTION_READY',
  READY: 'RABBY_EXTENSION_READY',
  INJECT_PERPS_WIDGET: 'RABBY_INJECT_PERPS_WIDGET',
} as const;

// Built as its own entry and injected by the background, never bundled into
// content-script.js
export const PERPS_WIDGET_SCRIPT = 'perps-widget.js';

// The import stash lives in background memory and is lost when the service
// worker restarts, so a stash ID held by an open page can expire. Expected
// state, not a bug: callers get this code and Sentry ignores it.
export const KEYRING_IMPORT_EXPIRED = 'KEYRING_IMPORT_EXPIRED';
