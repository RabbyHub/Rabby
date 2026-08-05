/**
 * Which way the mark price has to move for a TP/SL trigger to fire.
 *
 * Take-profit on a long fires as price rises; stop-loss on a long fires as it
 * falls; both invert for a short. The confirmation dialogs render this as
 * `Mark Price>=…` / `Mark Price<=…`, and getting it backwards would describe an
 * order as doing the opposite of what it does — so the rule lives in one place
 * rather than being re-derived at each dialog.
 *
 * `isLong` is the direction of the resulting position: the order side for an
 * entry, the position side for a TP/SL placed on an open position.
 *
 * Kept in its own leaf module — `DesktopPerps/utils` pulls in the toast
 * component and the Hyperliquid SDK, which a pure rule shouldn't drag along.
 */
export const resolveTriggerComparator = (
  isLong: boolean,
  isTakeProfit: boolean
): '>=' | '<=' => (isLong === isTakeProfit ? '>=' : '<=');
