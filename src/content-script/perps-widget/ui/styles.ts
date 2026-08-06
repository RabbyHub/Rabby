/**
 * Dark-only by product decision (decoupled from Rabby's theme preference).
 * adoptedStyleSheets bypasses the host page's CSP `style-src`.
 */

// Relative import: theme-colors is a .js file and webpack's TSConfigPathsPlugin
// (which powers the `@/*` alias) only resolves .ts/.tsx.
import {
  appThemeColors,
  rabbyAppCssPrefix,
} from '../../../constant/theme-colors';

function buildHostVars(): string {
  return Object.entries(appThemeColors.dark)
    .map(([k, v]) => `--${rabbyAppCssPrefix}${k}: ${v};`)
    .join('\n      ');
}

const STYLES = `
  :host {
    all: initial;
    ${buildHostVars()}
    font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Roboto, sans-serif;
    color-scheme: dark;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    /* so scrollbars don't flash during the expand transition */
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* legacy Edge/IE */
  }
  *::-webkit-scrollbar {
    display: none; /* WebKit/Blink */
  }

  /* Transparent chrome — bg comes from the header/body children */
  .rabby-perps-widget {
    position: fixed;
    display: flex;
    flex-direction: column;
    max-height: 48px;
    color: var(--rb-neutral-title-1);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    pointer-events: auto;
    user-select: none;
    overflow: hidden;
    cursor: grab;
    transition:
      max-height 0.5s cubic-bezier(0.32, 0.72, 0, 1),
      border-radius 0.5s cubic-bezier(0.32, 0.72, 0, 1),
      box-shadow 0.5s ease;
  }

  .rabby-perps-widget.dock-right {
    border-radius: 16px 0 0 16px;
  }
  .rabby-perps-widget.dock-left {
    border-radius: 0 16px 16px 0;
  }

  /* no transition so pointer-follow isn't laggy */
  .rabby-perps-widget.dragging {
    border-radius: 16px;
    cursor: grabbing;
    transition: none;
  }

  .rabby-perps-widget.expanded {
    width: 400px;
    max-height: 520px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
    cursor: default;
  }

  /* Bottom-anchored (inline) so the panel grows upward instead of off-screen */

  .rabby-perps-widget__header {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 12px 16px;
    height: 48px;
    flex-shrink: 0;
    cursor: grab;
    background: var(--rb-neutral-bg-2);
    transition: padding 0.5s, height 0.5s;
  }
  .rabby-perps-widget.expanded .rabby-perps-widget__header {
    justify-content: space-between;
    padding: 12px 16px;
    height: 48px;
  }
  .rabby-perps-widget.dragging .rabby-perps-widget__header {
    cursor: grabbing;
  }
  .rabby-perps-widget__header-left {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }
  .rabby-perps-widget__logo {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
  }
  .rabby-perps-widget.expanded .rabby-perps-widget__logo {
    width: 24px;
    height: 24px;
  }
  .rabby-perps-widget__logo-main {
    width: 100%;
    height: auto;
    display: block;
  }
  .rabby-perps-widget__logo-badge {
    position: absolute;
    right: -2px;
    bottom: -2px;
    width: 12px;
    height: 12px;
  }
  .rabby-perps-widget.expanded .rabby-perps-widget__logo-badge {
    width: 12px;
    height: 12px;
  }
  .rabby-perps-widget__pnl {
    font-size: 14px;
    font-weight: 700;
  }
  .rabby-perps-widget.expanded .rabby-perps-widget__pnl {
    font-size: 14px;
    font-weight: 700;
  }
  .rabby-perps-widget__pnl-pos {
    color: var(--rb-green-default);
  }
  .rabby-perps-widget__pnl-neg {
    color: var(--rb-red-default);
  }

  /* display:none (not opacity:0) so it doesn't add to the widget's min-width */
  .rabby-perps-widget__address {
    display: none;
    font-size: 12px;
    color: var(--rb-neutral-secondary);
    opacity: 0;
    transition: opacity 0.5s ease-out 0.06s, color 0.3s ease;
  }
  .rabby-perps-widget.expanded .rabby-perps-widget__address {
    display: inline-block;
    opacity: 1;
    cursor: pointer;
  }
  .rabby-perps-widget.expanded .rabby-perps-widget__address:hover {
    color: var(--rb-neutral-foot);
  }

  .rabby-perps-widget__body {
    display: none;
    flex-direction: column;
    padding: 0 16px 16px;
    gap: 12px;
    background: var(--rb-neutral-bg-3);
    opacity: 0;
    transition: opacity 0.5s ease-out 0.06s;
    overflow-y: auto;
  }
  .rabby-perps-widget.expanded .rabby-perps-widget__body {
    display: flex;
    padding-top: 16px;
    opacity: 1;
  }

  .rabby-perps-widget__cards {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .rabby-perps-card {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 12px 16px;
    height: 92px;
    border-radius: 16px;
    background: var(--rb-neutral-bg-3);
    border: 1px solid var(--rb-neutral-line);
    cursor: pointer;
    overflow: hidden;
    transition: background 0.5s ease;
  }
  .rabby-perps-card:hover {
    background: var(--rb-neutral-bg-2);
  }
  .rabby-perps-card:active {
    background: var(--rb-neutral-bg-4);
  }
  .rabby-perps-card__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .rabby-perps-card__top-left {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    flex: 1 1 auto;
  }
  .rabby-perps-card__logo {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    flex-shrink: 0;
    /* White circle so transparent / dark token icons stay visible.
       Mask (not border-radius) shapes the circle: Chromium doesn't
       anti-alias border-radius on a composited <img> → jagged edges. */
    background: #fff;
    -webkit-mask-image: radial-gradient(
      circle closest-side,
      #000 calc(100% - 1px),
      transparent 100%
    );
    mask-image: radial-gradient(
      circle closest-side,
      #000 calc(100% - 1px),
      transparent 100%
    );
  }
  .rabby-perps-card__name {
    font-size: 13px;
    font-weight: 600;
    color: var(--rb-neutral-title-1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  .rabby-perps-card__quoteAsset {
    color: var(--rb-neutral-foot);
    font-weight: 400;
  }
  .rabby-perps-card__direction {
    display: inline-flex;
    align-items: center;
    padding-left: 4px;
    padding-right: 4px;
    height: 16px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 500;
    text-transform: lowercase;
  }
  .rabby-perps-card__direction-long {
    background: var(--rb-green-light-1);
    color: var(--rb-green-default);
  }
  .rabby-perps-card__direction-short {
    background: var(--rb-red-light-1);
    color: var(--rb-red-default);
  }
  .rabby-perps-card__top-right {
    width: 125px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .rabby-perps-card__value {
    font-size: 12px;
    font-weight: 400;
    color: var(--rb-neutral-foot);
  }
  .rabby-perps-card__change {
    font-size: 12px;
    font-weight: 400;
  }
  .rabby-perps-card__change-pos {
    color: var(--rb-green-default);
  }
  .rabby-perps-card__change-neg {
    color: var(--rb-red-default);
  }
  .rabby-perps-card__bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .rabby-perps-card__pnl-block {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .rabby-perps-card__pnl-label {
    font-size: 12px;
    color: var(--rb-neutral-secondary);
    font-weight: 400;
  }
  .rabby-perps-card__pnl-value {
    font-size: 20px;
    font-weight: 700;
    line-height: 18px;
  }
  .rabby-perps-card__sparkline {
    flex-shrink: 0;
    width: 125px;
    height: 40px;
  }

  .rabby-perps-widget__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 13px;
    color: var(--rb-neutral-secondary);
  }
  .rabby-perps-widget__footer-text {
    cursor: pointer;
    transition: color 0.5s ease;
  }
  .rabby-perps-widget__footer-text:hover {
    color: var(--rb-neutral-foot);
  }

  .rabby-perps-widget__hide {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    cursor: pointer;
    color: var(--rb-neutral-secondary);
    transition: color 0.3s ease;
  }
  .rabby-perps-widget__hide:hover {
    color: var(--rb-neutral-foot);
  }
  /* Anchored to the button's right edge so it grows inward — the widget clips overflow */
  .rabby-perps-widget__hide-tip {
    position: absolute;
    right: 0;
    bottom: calc(100% + 10px);
    padding: 6px 8px;
    border-radius: 6px;
    background: var(--rb-neutral-bg-2);
    border: 1px solid var(--rb-neutral-line);
    color: var(--rb-neutral-title-1);
    font-size: 12px;
    line-height: 16px;
    white-space: nowrap;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 0.2s ease, visibility 0.2s ease;
  }
  /* Rotated square, not a border triangle: only a real box can carry the 1px
     outline on its two exposed sides. Sits half outside so its body overlaps
     the bubble's bottom border and the two seams merge. */
  .rabby-perps-widget__hide-tip::after {
    content: '';
    position: absolute;
    right: 8px;
    bottom: -4px;
    width: 7px;
    height: 7px;
    transform: translateX(50%) rotate(45deg);
    background: var(--rb-neutral-bg-2);
    border-right: 1px solid var(--rb-neutral-line);
    border-bottom: 1px solid var(--rb-neutral-line);
    border-bottom-right-radius: 2px;
  }
  .rabby-perps-widget__hide:hover .rabby-perps-widget__hide-tip {
    opacity: 1;
    visibility: visible;
  }
`;

let cachedSheet: CSSStyleSheet | null = null;

export function installStyles(root: ShadowRoot): void {
  if (!cachedSheet) {
    cachedSheet = new CSSStyleSheet();
    cachedSheet.replaceSync(STYLES);
  }
  // Project's lib.dom doesn't declare adoptedStyleSheets yet; cast narrowly.
  (root as ShadowRoot & {
    adoptedStyleSheets: CSSStyleSheet[];
  }).adoptedStyleSheets = [cachedSheet];
}
