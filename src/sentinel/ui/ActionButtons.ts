/**
 * ============================================================================
 * Sentinel Trust Layer — Action Buttons Component
 * ============================================================================
 *
 * Renders the Red ("Scam/Hack") and Green ("Legit/Safe") buttons that are
 * injected into each tweet's action bar (next to Like, Retweet, Share).
 *
 * Clicking either button opens the Context Modal for the user to provide
 * additional information before the report is submitted.
 * ============================================================================
 */

import { SENTINEL_CSS_PREFIX } from '../constants';

/**
 * SVG icon for the "Scam" (shield-alert) button.
 * Compact 16×16 viewBox, single-path for performance.
 */
const SCAM_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

/**
 * SVG icon for the "Legit" (shield-check) button.
 */
const LEGIT_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>`;

export interface ActionButtonCallbacks {
  /** Called when the user clicks the "Scam" button */
  onScamClick: () => void;
  /** Called when the user clicks the "Legit" button */
  onLegitClick: () => void;
}

/**
 * Create the action buttons container with Red (Scam) and Green (Legit) buttons.
 *
 * @param callbacks — click handlers for each button
 * @returns HTMLElement to append to the tweet's action bar
 */
export function createActionButtons(
  callbacks: ActionButtonCallbacks
): HTMLElement {
  const p = SENTINEL_CSS_PREFIX;

  const container = document.createElement('div');
  container.className = `${p}-actions`;

  // --- Red "Scam/Hack" button ---
  const scamBtn = document.createElement('button');
  scamBtn.className = `${p}-btn ${p}-btn--scam`;
  scamBtn.setAttribute('data-tooltip', 'Report as Scam');
  scamBtn.setAttribute('aria-label', 'Report this tweet as a scam or hack');
  scamBtn.innerHTML = SCAM_ICON_SVG;
  scamBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    callbacks.onScamClick();
  });

  // --- Green "Legit/Safe" button ---
  const legitBtn = document.createElement('button');
  legitBtn.className = `${p}-btn ${p}-btn--legit`;
  legitBtn.setAttribute('data-tooltip', 'Confirm as Legit');
  legitBtn.setAttribute('aria-label', 'Confirm this tweet as legitimate and safe');
  legitBtn.innerHTML = LEGIT_ICON_SVG;
  legitBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    callbacks.onLegitClick();
  });

  container.appendChild(scamBtn);
  container.appendChild(legitBtn);

  return container;
}
