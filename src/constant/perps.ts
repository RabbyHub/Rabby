/**
 * Perps constants shared by the background service and the UI. They live here
 * rather than in `background/service/perps` so the UI can import the runtime
 * default without pulling the background service module into the UI bundle.
 */

/**
 * Name Hyperliquid shows for the agent wallet Rabby creates.
 *
 * Lives here, not in `ui/views/Perps/constants`, because `sdkManager` needs it
 * and `sdkManager` is reachable from `background/controller/wallet`. The
 * background entry is built with `asyncChunks: false`, so anything that module
 * graph touches is inlined into `background.js` — importing the view-level
 * constants module for one string would drag its fallback market JSON along.
 */
export const PERPS_AGENT_NAME = 'rabby-agent';

/**
 * Order types whose pre-submit confirmation dialog the user can opt out of.
 *
 * Two deliberate absences:
 * - Scale — its confirmation is mandatory, so there is nothing to persist.
 * - Reverse — `ClosePositionModal` in `reverse` mode already *is* the
 *   confirmation step, so it needs no second dialog and no toggle.
 */
export type PerpsOrderConfirmType =
  | 'market'
  | 'limit'
  | 'conditional'
  | 'twap'
  | 'closeMarket'
  | 'closeLimit'
  | 'tpsl';

export type PerpsOrderConfirmations = Record<PerpsOrderConfirmType, boolean>;

/**
 * Frozen: the background hands this very object to `createPersistStore` as the
 * `orderConfirmations` template, so a mutation here would rewrite the shipped
 * defaults for the rest of the session.
 */
export const DEFAULT_PERPS_ORDER_CONFIRMATIONS: Readonly<PerpsOrderConfirmations> = Object.freeze(
  {
    market: true,
    limit: true,
    conditional: true,
    twap: true,
    closeMarket: true,
    closeLimit: true,
    tpsl: true,
  }
);

/** Render order for the Order Confirmations settings panel. */
export const PERPS_ORDER_CONFIRM_SETTING_ORDER: PerpsOrderConfirmType[] = [
  'limit',
  'market',
  'conditional',
  'twap',
  'closeMarket',
  'closeLimit',
  'tpsl',
];

export const PERPS_ORDER_CONFIRM_TYPES = Object.keys(
  DEFAULT_PERPS_ORDER_CONFIRMATIONS
) as PerpsOrderConfirmType[];

export const isPerpsOrderConfirmType = (
  v: string
): v is PerpsOrderConfirmType =>
  (PERPS_ORDER_CONFIRM_TYPES as string[]).includes(v);
