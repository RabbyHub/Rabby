import { useHistory, useLocation } from 'react-router-dom';
import { useMemoizedFn } from 'ahooks';
import { PerpsQuoteAsset } from '@/ui/views/Perps/constants';

export type PerpsAction =
  | 'deposit'
  | 'withdraw'
  | 'swap'
  | 'enable-unified'
  | 'transfer-to-perps'
  | null;

type PerpsActionName = Exclude<PerpsAction, null>;

export interface PerpsPopupParams {
  /** Pre-fill the `from` side of SpotSwap (i.e., user clicked their USDT row to sell it). */
  source?: PerpsQuoteAsset;
  /** Pre-fill the `to` side of SpotSwap. Soft seed only — user can still
   *  change tokens unless the caller also passes `disableSwitch: true`. */
  target?: PerpsQuoteAsset;
  /** Set to true only when the caller has decided which stablecoin pair the
   *  user must end up with (e.g. trading panel needs USDH to trade a
   *  USDH-quoted market). Locks BOTH from and to dropdowns. Defaults to false
   *  — both dropdowns stay editable. */
  disableSwitch?: boolean;
  /** After current action completes, navigate to this follow-up action. */
  next?: PerpsActionName;
}

const PARAM_ACTIONS = 'actions';
const PARAM_SOURCE = 'perpsSource';
const PARAM_TARGET = 'perpsTarget';
const PARAM_DISABLE_SWITCH = 'perpsDisableSwitch';
const PARAM_NEXT = 'perpsNext';

const ACTION_NAMES: ReadonlyArray<PerpsActionName> = [
  'deposit',
  'withdraw',
  'swap',
  'enable-unified',
  'transfer-to-perps',
];

const isPerpsActionName = (v: string | null): v is PerpsActionName =>
  v != null && (ACTION_NAMES as ReadonlyArray<string>).includes(v);

const isPerpsQuoteAsset = (v: string | null): v is PerpsQuoteAsset =>
  v === 'USDC' || v === 'USDT' || v === 'USDH' || v === 'USDE';

const parseStack = (raw: string | null): PerpsActionName[] => {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(isPerpsActionName);
};

const writeStack = (sp: URLSearchParams, stack: PerpsActionName[]) => {
  if (stack.length === 0) sp.delete(PARAM_ACTIONS);
  else sp.set(PARAM_ACTIONS, stack.join(','));
};

const clearAuxParams = (sp: URLSearchParams) => {
  sp.delete(PARAM_SOURCE);
  sp.delete(PARAM_TARGET);
  sp.delete(PARAM_DISABLE_SWITCH);
  sp.delete(PARAM_NEXT);
};

/**
 * Apply only the keys that are explicitly present in `params`. Missing keys
 * are left untouched so that pushing a new layer onto an existing stack does
 * not wipe params owned by a layer below (e.g. swap's source/target should
 * survive when deposit is pushed on top from inside swap).
 */
const applyAuxParams = (sp: URLSearchParams, params: PerpsPopupParams) => {
  if ('source' in params) {
    if (params.source) sp.set(PARAM_SOURCE, params.source);
    else sp.delete(PARAM_SOURCE);
  }
  if ('target' in params) {
    if (params.target) sp.set(PARAM_TARGET, params.target);
    else sp.delete(PARAM_TARGET);
  }
  if ('disableSwitch' in params) {
    if (params.disableSwitch) sp.set(PARAM_DISABLE_SWITCH, 'true');
    else sp.delete(PARAM_DISABLE_SWITCH);
  }
  if ('next' in params) {
    if (params.next) sp.set(PARAM_NEXT, params.next);
    else sp.delete(PARAM_NEXT);
  }
};

/** Z-index assigned to the bottom-most popup. Each layer above adds 10. */
const Z_INDEX_BASE = 1000;
const Z_INDEX_STEP = 10;

/**
 * Shared URL-param driven navigation for Perps popup/modal mounting.
 *
 * Modals are mounted at DesktopPerps top-level. The visible set is a STACK
 * — multiple modals can be open at once (e.g. user opens deposit from inside
 * swap; swap stays mounted underneath). The stack is encoded as a
 * comma-separated `actions` query param. Layer order in the URL matches
 * z-index order: the right-most entry is on top.
 */
export const usePerpsPopupNav = () => {
  const history = useHistory();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const actions = parseStack(searchParams.get(PARAM_ACTIONS));
  // Top-of-stack convenience accessor — many call sites only care about which
  // popup is currently focused.
  const action: PerpsAction = actions[actions.length - 1] || null;

  const sourceRaw = searchParams.get(PARAM_SOURCE);
  const targetRaw = searchParams.get(PARAM_TARGET);
  const disableSwitchRaw = searchParams.get(PARAM_DISABLE_SWITCH);
  const nextRaw = searchParams.get(PARAM_NEXT);

  const source: PerpsQuoteAsset | undefined = isPerpsQuoteAsset(sourceRaw)
    ? sourceRaw
    : undefined;
  const target: PerpsQuoteAsset | undefined = isPerpsQuoteAsset(targetRaw)
    ? targetRaw
    : undefined;
  // Default false (editable). Caller must explicitly opt in by passing `disableSwitch: true`.
  const disableSwitch: boolean = disableSwitchRaw === 'true';
  const next: PerpsActionName | undefined = isPerpsActionName(nextRaw)
    ? nextRaw
    : undefined;

  const isActionOpen = useMemoizedFn((act: PerpsActionName): boolean =>
    actions.includes(act)
  );

  /**
   * Returns the z-index for a given action's modal, or undefined if the
   * action is not currently in the stack. Bottom layer = base, each layer
   * above adds Z_INDEX_STEP. Modal components must apply this to BOTH
   * the antd `zIndex` prop AND any `maskStyle.zIndex` they set, otherwise
   * higher layers' masks render under lower layers' dialogs.
   */
  const getActionZIndex = useMemoizedFn((act: PerpsActionName):
    | number
    | undefined => {
    const idx = actions.indexOf(act);
    if (idx < 0) return undefined;
    return Z_INDEX_BASE + idx * Z_INDEX_STEP;
  });

  const writeParams = (
    mutator: (sp: URLSearchParams) => void,
    replace = false
  ) => {
    const sp = new URLSearchParams(location.search);
    mutator(sp);
    const method = replace ? history.replace : history.push;
    method({
      pathname: location.pathname,
      search: sp.toString(),
    });
  };

  /**
   * Push `act` onto the popup stack, or refresh its params if it's already
   * the top. When pushing onto a non-empty stack, params not present in
   * `params` are preserved (so swap's source/target survive a deposit push).
   * When pushing onto an empty stack, behavior matches the legacy single-slot
   * version: any pre-existing aux params are first cleared, then the provided
   * ones applied.
   */
  const openPerpsPopup = useMemoizedFn(
    (act: PerpsActionName, params: PerpsPopupParams = {}) => {
      writeParams((sp) => {
        const cur = parseStack(sp.get(PARAM_ACTIONS));
        const top = cur[cur.length - 1];
        const nextStack: PerpsActionName[] = top === act ? cur : [...cur, act];
        if (cur.length === 0) clearAuxParams(sp);
        writeStack(sp, nextStack);
        applyAuxParams(sp, params);
      });
    }
  );

  /**
   * Pop the top popup. If the stack becomes empty, all aux params are
   * cleared so a future open starts from a clean slate.
   */
  const closePerpsPopup = useMemoizedFn(() => {
    writeParams((sp) => {
      const cur = parseStack(sp.get(PARAM_ACTIONS));
      const nextStack = cur.slice(0, -1);
      writeStack(sp, nextStack);
      if (nextStack.length === 0) clearAuxParams(sp);
    });
  });

  /**
   * Replace the top popup with the chained `next` action (consumed) while
   * preserving aux params. Call after a successful enable-unified so the
   * user transitions into the swap popup automatically. If no `next` is
   * present, this degenerates to closePerpsPopup.
   */
  const advancePerpsPopup = useMemoizedFn(() => {
    writeParams((sp) => {
      const cur = parseStack(sp.get(PARAM_ACTIONS));
      const nextRaw = sp.get(PARAM_NEXT);
      if (!isPerpsActionName(nextRaw) || cur.length === 0) {
        const popped = cur.slice(0, -1);
        writeStack(sp, popped);
        if (popped.length === 0) clearAuxParams(sp);
        return;
      }
      const replaced: PerpsActionName[] = [...cur.slice(0, -1), nextRaw];
      writeStack(sp, replaced);
      sp.delete(PARAM_NEXT);
    });
  });

  return {
    action,
    actions,
    source,
    target,
    disableSwitch,
    next,
    isActionOpen,
    getActionZIndex,
    openPerpsPopup,
    closePerpsPopup,
    advancePerpsPopup,
  };
};

export default usePerpsPopupNav;
