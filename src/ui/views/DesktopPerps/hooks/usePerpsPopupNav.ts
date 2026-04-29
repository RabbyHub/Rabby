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
  next?: Exclude<PerpsAction, null>;
}

const PARAM_ACTION = 'action';
const PARAM_SOURCE = 'perpsSource';
const PARAM_TARGET = 'perpsTarget';
const PARAM_DISABLE_SWITCH = 'perpsDisableSwitch';
const PARAM_NEXT = 'perpsNext';

const isPerpsQuoteAsset = (v: string | null): v is PerpsQuoteAsset =>
  v === 'USDC' || v === 'USDT' || v === 'USDH' || v === 'USDE';

/**
 * Shared URL-param driven navigation for Perps popup/modal mounting.
 * Modals are mounted at DesktopPerps top-level and toggled by reading
 * the `action` query param. Callers use `openPerpsPopup` / `closePerpsPopup`
 * (or `openPerpsPopupNext` to chain actions after success).
 */
export const usePerpsPopupNav = () => {
  const history = useHistory();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const action = (searchParams.get(PARAM_ACTION) as PerpsAction) || null;
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
  const next =
    nextRaw === 'swap' ||
    nextRaw === 'deposit' ||
    nextRaw === 'withdraw' ||
    nextRaw === 'enable-unified' ||
    nextRaw === 'transfer-to-perps'
      ? (nextRaw as Exclude<PerpsAction, null>)
      : undefined;

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

  const openPerpsPopup = useMemoizedFn(
    (act: Exclude<PerpsAction, null>, params: PerpsPopupParams = {}) => {
      writeParams((sp) => {
        sp.set(PARAM_ACTION, act);
        if (params.source) sp.set(PARAM_SOURCE, params.source);
        else sp.delete(PARAM_SOURCE);
        if (params.target) sp.set(PARAM_TARGET, params.target);
        else sp.delete(PARAM_TARGET);
        if (params.disableSwitch === true) sp.set(PARAM_DISABLE_SWITCH, 'true');
        else sp.delete(PARAM_DISABLE_SWITCH);
        if (params.next) sp.set(PARAM_NEXT, params.next);
        else sp.delete(PARAM_NEXT);
      });
    }
  );

  const closePerpsPopup = useMemoizedFn(() => {
    writeParams((sp) => {
      sp.delete(PARAM_ACTION);
      sp.delete(PARAM_SOURCE);
      sp.delete(PARAM_TARGET);
      sp.delete(PARAM_DISABLE_SWITCH);
      sp.delete(PARAM_NEXT);
    });
  });

  /**
   * Close current popup and, if a `next` chain exists, open it with the same
   * source/target params preserved. Call after a successful enable-unified
   * so the user transitions into the swap popup automatically.
   */
  const advancePerpsPopup = useMemoizedFn(() => {
    if (!next) {
      closePerpsPopup();
      return;
    }
    writeParams((sp) => {
      sp.set(PARAM_ACTION, next);
      sp.delete(PARAM_NEXT);
      // source/target left in place — the next popup reads them the same way.
    });
  });

  return {
    action,
    source,
    target,
    disableSwitch,
    next,
    openPerpsPopup,
    closePerpsPopup,
    advancePerpsPopup,
  };
};

export default usePerpsPopupNav;
