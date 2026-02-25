/**
 * ============================================================================
 * Sentinel Trust Layer — Badge Component
 * ============================================================================
 *
 * Renders the pill-shaped conviction badge injected above tweet text.
 * The badge shows the current conviction level (e.g. "Likely Scam") and,
 * when clicked, opens the Sentinel Sidebar with full details.
 *
 * Design: pill shape, color-coded by conviction level, with a subtle glow
 * animation for "Verified Scam" to draw attention.
 * ============================================================================
 */

import type { ConvictionLevel } from '../types';
import { SENTINEL_CSS_PREFIX } from '../constants';

/**
 * Map conviction level to the CSS modifier class suffix.
 */
function getConvictionClass(conviction: ConvictionLevel): string {
  const p = SENTINEL_CSS_PREFIX;
  switch (conviction) {
    case 'Verified Scam':
      return `${p}-badge--verified-scam`;
    case 'Likely Scam':
      return `${p}-badge--likely-scam`;
    case 'Contested Content':
      return `${p}-badge--contested`;
    case 'Safe':
      return `${p}-badge--safe`;
    default:
      return '';
  }
}

/**
 * Map conviction level to its icon prefix character.
 */
function getConvictionIcon(conviction: ConvictionLevel): string {
  switch (conviction) {
    case 'Verified Scam':
      return '\u{1F6A8}'; // 🚨
    case 'Likely Scam':
      return '\u{26A0}\u{FE0F}'; // ⚠️
    case 'Contested Content':
      return '\u{1F500}'; // 🔀
    case 'Safe':
      return '\u{2705}'; // ✅
    default:
      return '';
  }
}

/**
 * Create a badge DOM element for the given conviction level.
 *
 * @param conviction — the calculated conviction level for this tweet
 * @param onClick — callback when the badge is clicked (opens sidebar)
 * @returns HTMLElement to inject above tweet text, or null for "Unverified"
 */
export function createBadge(
  conviction: ConvictionLevel,
  onClick: () => void
): HTMLElement | null {
  // "Unverified" means no badge is shown — insufficient signal
  if (conviction === 'Unverified') return null;

  const p = SENTINEL_CSS_PREFIX;
  const badge = document.createElement('div');
  badge.className = `${p}-badge ${getConvictionClass(conviction)}`;
  badge.setAttribute('role', 'button');
  badge.setAttribute('tabindex', '0');
  badge.setAttribute(
    'aria-label',
    `Sentinel Trust: ${conviction}. Click for details.`
  );

  // Icon + label
  const icon = document.createElement('span');
  icon.textContent = getConvictionIcon(conviction);
  icon.setAttribute('aria-hidden', 'true');

  const label = document.createElement('span');
  label.textContent = conviction;

  badge.appendChild(icon);
  badge.appendChild(label);

  // Click handler → open the Sentinel Sidebar
  badge.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    onClick();
  });

  // Keyboard accessibility — Enter/Space activates the badge
  badge.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  });

  return badge;
}

/**
 * Update an existing badge element with a new conviction level.
 * Used when the background poller refreshes trust data.
 */
export function updateBadge(
  badgeEl: HTMLElement,
  conviction: ConvictionLevel
): void {
  const p = SENTINEL_CSS_PREFIX;

  // Reset classes
  badgeEl.className = `${p}-badge ${getConvictionClass(conviction)}`;

  // Update icon + label
  const children = badgeEl.childNodes;
  if (children[0]) (children[0] as HTMLElement).textContent = getConvictionIcon(conviction);
  if (children[1]) (children[1] as HTMLElement).textContent = conviction;

  badgeEl.setAttribute(
    'aria-label',
    `Sentinel Trust: ${conviction}. Click for details.`
  );
}
