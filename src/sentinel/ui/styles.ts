/**
 * ============================================================================
 * Sentinel Trust Layer — Injected Styles
 * ============================================================================
 *
 * All CSS for Sentinel UI components is injected into X.com's page via a
 * <style> element inside a Shadow DOM host. This prevents style leakage in
 * both directions — X's styles can't break Sentinel, and Sentinel can't
 * break X.
 *
 * Design approach:
 *   - Uses Rabby's existing color palette (see cssvars.css / var-defs.ts)
 *   - Supports both light and dark mode via CSS custom properties
 *   - All class names are prefixed with "sentinel-" to avoid collisions
 *   - Animations are minimal and GPU-accelerated (transform, opacity)
 * ============================================================================
 */

import { SENTINEL_CSS_PREFIX, BADGE_COLORS } from '../constants';

// ---------------------------------------------------------------------------
// Rabby color tokens (hardcoded values from cssvars.css / var-defs.ts)
// We can't use CSS custom properties because Sentinel renders inside a
// Shadow DOM on x.com — outside Rabby's popup where the vars are defined.
// ---------------------------------------------------------------------------

const RABBY = {
  // --- Light mode ---
  light: {
    blue:       '#4C65FF',  // --r-blue-default / brand primary
    red:        '#E34935',  // --r-red-default
    redDark:    '#AE2A19',  // --r-red-dark
    green:      '#2ABB7F',  // --r-green-default
    orange:     '#FF9F0A',  // --rb-orange-default
    title:      '#192945',  // --r-neutral-title-1
    body:       '#3E495E',  // --r-neutral-body
    foot:       '#6A7587',  // --r-neutral-foot
    line:       '#E0E5EC',  // --r-neutral-line
    bg1:        '#FFFFFF',  // --r-neutral-bg-1
    bg2:        '#F2F4F7',  // --r-neutral-bg-2
    card1:      '#FFFFFF',  // --r-neutral-card-1
  },
  // --- Dark mode ---
  dark: {
    blue:       '#4C65FF',  // --r-blue-default (same in dark)
    blueSoft:   '#7084FF',  // --rb-brand-default (dark variant)
    red:        '#EF5C48',  // --r-red-default (dark)
    redDark:    '#AE2A19',  // --r-red-dark (dark)
    green:      '#2ABB7F',  // --r-green-default (dark, same)
    orange:     '#FFC64A',  // --r-orange-default (dark)
    title:      '#F7FAFC',  // --r-neutral-title-1 (dark)
    body:       '#D3D8E0',  // --r-neutral-body (dark)
    foot:       '#BABEC5',  // --r-neutral-foot (dark)
    line:       'rgba(255, 255, 255, 0.1)',  // --r-neutral-line (dark)
    bg1:        '#0C0F1F',  // --r-neutral-bg-1 (dark) — Rabby's deep navy
    bg2:        '#0C0F1F',  // --r-neutral-bg-2 (dark)
    card1:      'rgba(255, 255, 255, 0.06)', // --r-neutral-card-1 (dark)
  },
} as const;

/**
 * Generate the full Sentinel stylesheet as a string.
 * This is injected once into the Shadow DOM host element.
 */
export function getSentinelStyles(): string {
  const p = SENTINEL_CSS_PREFIX;

  return `
/* =========================================================================
   Sentinel Trust Layer — Injected Styles (Rabby palette)
   ========================================================================= */

/* --- Reset inside shadow DOM --- */
.${p}-root,
.${p}-root * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    Helvetica, Arial, sans-serif;
  line-height: 1.4;
}

/* =========================================================================
   Badge — pill-shaped label injected above tweet text
   ========================================================================= */

.${p}-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: box-shadow 0.2s ease, transform 0.15s ease;
  user-select: none;
  margin-bottom: 6px;
  border: 1px solid transparent;
}

.${p}-badge:hover {
  transform: scale(1.04);
}

/* Badge color variants */
.${p}-badge--verified-scam {
  background: ${BADGE_COLORS['Verified Scam'].background};
  color: ${BADGE_COLORS['Verified Scam'].text};
  border-color: ${BADGE_COLORS['Verified Scam'].border};
  box-shadow: 0 0 8px ${BADGE_COLORS['Verified Scam'].glow};
}

.${p}-badge--likely-scam {
  background: ${BADGE_COLORS['Likely Scam'].background};
  color: ${BADGE_COLORS['Likely Scam'].text};
  border-color: ${BADGE_COLORS['Likely Scam'].border};
  box-shadow: 0 0 8px ${BADGE_COLORS['Likely Scam'].glow};
}

.${p}-badge--contested {
  background: ${BADGE_COLORS['Contested Content'].background};
  color: ${BADGE_COLORS['Contested Content'].text};
  border-color: ${BADGE_COLORS['Contested Content'].border};
  box-shadow: 0 0 8px ${BADGE_COLORS['Contested Content'].glow};
}

.${p}-badge--safe {
  background: ${BADGE_COLORS['Safe'].background};
  color: ${BADGE_COLORS['Safe'].text};
  border-color: ${BADGE_COLORS['Safe'].border};
  box-shadow: 0 0 8px ${BADGE_COLORS['Safe'].glow};
}

/* "Glow" animation for Verified Scam — subtle pulsing shadow */
@keyframes ${p}-glow-pulse {
  0%, 100% { box-shadow: 0 0 8px ${BADGE_COLORS['Verified Scam'].glow}; }
  50% { box-shadow: 0 0 16px ${BADGE_COLORS['Verified Scam'].glow}; }
}

.${p}-badge--verified-scam {
  animation: ${p}-glow-pulse 2s ease-in-out infinite;
}

/* =========================================================================
   Action Buttons — Red (Scam) / Green (Legit) in tweet action bar
   ========================================================================= */

.${p}-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: 4px;
  vertical-align: middle;
}

.${p}-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease;
  font-size: 14px;
  line-height: 1;
  outline: none;
  position: relative;
}

.${p}-btn:active {
  transform: scale(0.9);
}

/* Red button — report as scam (Rabby red) */
.${p}-btn--scam {
  background: rgba(227, 73, 53, 0.1);
  color: ${RABBY.light.red};
}
.${p}-btn--scam:hover {
  background: rgba(227, 73, 53, 0.2);
}

/* Green button — mark as legit (Rabby green) */
.${p}-btn--legit {
  background: rgba(42, 187, 127, 0.1);
  color: ${RABBY.light.green};
}
.${p}-btn--legit:hover {
  background: rgba(42, 187, 127, 0.2);
}

/* Tooltip on hover */
.${p}-btn::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  background: ${RABBY.light.title};
  color: #FFFFFF;
  font-size: 11px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 6px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
  z-index: 10000;
}

.${p}-btn:hover::after {
  opacity: 1;
}

/* =========================================================================
   Context Modal — appears when user clicks a report button
   ========================================================================= */

.${p}-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.4);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${p}-fade-in 0.15s ease;
}

@keyframes ${p}-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.${p}-modal {
  background: ${RABBY.light.bg1};
  border-radius: 16px;
  padding: 24px;
  width: 380px;
  max-width: 90vw;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  animation: ${p}-slide-up 0.2s ease;
  color: ${RABBY.light.title};
}

@keyframes ${p}-slide-up {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .${p}-modal {
    background: ${RABBY.dark.bg1};
    color: ${RABBY.dark.title};
  }
}

.${p}-modal__title {
  font-size: 20px;
  font-weight: 500;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.${p}-modal__subtitle {
  font-size: 13px;
  color: ${RABBY.light.foot};
  margin-bottom: 16px;
}

@media (prefers-color-scheme: dark) {
  .${p}-modal__subtitle {
    color: ${RABBY.dark.foot};
  }
}

.${p}-modal__textarea {
  width: 100%;
  min-height: 80px;
  border: 1px solid ${RABBY.light.line};
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  resize: vertical;
  outline: none;
  transition: border-color 0.15s ease;
  font-family: inherit;
  background: transparent;
  color: inherit;
}

.${p}-modal__textarea:focus {
  border-color: ${RABBY.light.blue};
}

@media (prefers-color-scheme: dark) {
  .${p}-modal__textarea {
    border-color: ${RABBY.dark.line};
  }
  .${p}-modal__textarea:focus {
    border-color: ${RABBY.dark.blueSoft};
  }
}

.${p}-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.${p}-modal__btn {
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.${p}-modal__btn:active {
  transform: scale(0.97);
}

/* Cancel — Rabby neutral bg-2 */
.${p}-modal__btn--cancel {
  background: ${RABBY.light.bg2};
  color: ${RABBY.light.body};
}
.${p}-modal__btn--cancel:hover {
  background: ${RABBY.light.line};
}

@media (prefers-color-scheme: dark) {
  .${p}-modal__btn--cancel {
    background: ${RABBY.dark.card1};
    color: ${RABBY.dark.body};
  }
  .${p}-modal__btn--cancel:hover {
    background: ${RABBY.dark.line};
  }
}

/* Submit scam — Rabby red */
.${p}-modal__btn--submit-scam {
  background: ${RABBY.light.red};
  color: #FFFFFF;
}
.${p}-modal__btn--submit-scam:hover {
  background: ${RABBY.light.redDark};
}

/* Submit legit — Rabby green */
.${p}-modal__btn--submit-legit {
  background: ${RABBY.light.green};
  color: #FFFFFF;
}
.${p}-modal__btn--submit-legit:hover {
  background: #239E6B;
}

/* =========================================================================
   Sentinel Sidebar — slide-out panel with First Responder + Council
   ========================================================================= */

.${p}-sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.3);
  z-index: 99998;
  animation: ${p}-fade-in 0.15s ease;
}

.${p}-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  width: 380px;
  max-width: 90vw;
  height: 100vh;
  background: ${RABBY.light.bg1};
  box-shadow: -8px 0 30px rgba(0, 0, 0, 0.1);
  z-index: 99999;
  overflow-y: auto;
  animation: ${p}-slide-in-right 0.25s ease;
  padding: 24px;
  color: ${RABBY.light.title};
}

@keyframes ${p}-slide-in-right {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

@media (prefers-color-scheme: dark) {
  .${p}-sidebar {
    background: ${RABBY.dark.bg1};
    color: ${RABBY.dark.title};
  }
}

.${p}-sidebar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.${p}-sidebar__title {
  font-size: 20px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}

.${p}-sidebar__close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: ${RABBY.light.bg2};
  color: ${RABBY.light.body};
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease;
}
.${p}-sidebar__close:hover {
  background: ${RABBY.light.line};
}

@media (prefers-color-scheme: dark) {
  .${p}-sidebar__close {
    background: ${RABBY.dark.card1};
    color: ${RABBY.dark.body};
  }
  .${p}-sidebar__close:hover {
    background: ${RABBY.dark.line};
  }
}

.${p}-sidebar__conviction {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 20px;
}

.${p}-sidebar__section-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${RABBY.light.foot};
  margin-bottom: 12px;
  margin-top: 24px;
}

@media (prefers-color-scheme: dark) {
  .${p}-sidebar__section-title {
    color: ${RABBY.dark.foot};
  }
}

/* Individual reporter card */
.${p}-reporter-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: ${RABBY.light.bg2};
  margin-bottom: 8px;
  transition: background 0.15s ease;
}

@media (prefers-color-scheme: dark) {
  .${p}-reporter-card {
    background: ${RABBY.dark.card1};
  }
}

.${p}-reporter-card__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${RABBY.light.line};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  color: ${RABBY.light.body};
  flex-shrink: 0;
}

@media (prefers-color-scheme: dark) {
  .${p}-reporter-card__avatar {
    background: ${RABBY.dark.card1};
    color: ${RABBY.dark.body};
  }
}

.${p}-reporter-card__info {
  flex: 1;
  min-width: 0;
}

.${p}-reporter-card__name {
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.${p}-reporter-card__handle {
  font-size: 12px;
  color: ${RABBY.light.foot};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (prefers-color-scheme: dark) {
  .${p}-reporter-card__handle {
    color: ${RABBY.dark.foot};
  }
}

/* Ethos score pill — Rabby blue */
.${p}-reporter-card__score {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 9999px;
  background: rgba(76, 101, 255, 0.1);
  color: ${RABBY.light.blue};
}

@media (prefers-color-scheme: dark) {
  .${p}-reporter-card__score {
    background: rgba(112, 132, 255, 0.12);
    color: ${RABBY.dark.blueSoft};
  }
}

.${p}-reporter-card__context {
  font-size: 13px;
  color: ${RABBY.light.body};
  margin-top: 6px;
  line-height: 1.4;
}

@media (prefers-color-scheme: dark) {
  .${p}-reporter-card__context {
    color: ${RABBY.dark.body};
  }
}

.${p}-reporter-card__badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 9999px;
}

/* First responder — Rabby orange */
.${p}-reporter-card__badge--first-responder {
  background: rgba(255, 159, 10, 0.15);
  color: ${RABBY.light.orange};
}

/* Low credibility — Rabby red */
.${p}-reporter-card__badge--low-credibility {
  background: rgba(227, 73, 53, 0.1);
  color: ${RABBY.light.red};
}

.${p}-reporter-card__claim-type {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 9999px;
}

.${p}-reporter-card__claim-type--negative {
  background: rgba(227, 73, 53, 0.1);
  color: ${RABBY.light.red};
}

.${p}-reporter-card__claim-type--positive {
  background: rgba(42, 187, 127, 0.1);
  color: ${RABBY.light.green};
}

@media (prefers-color-scheme: dark) {
  .${p}-reporter-card__claim-type--negative {
    background: rgba(239, 92, 72, 0.15);
    color: ${RABBY.dark.red};
  }
  .${p}-reporter-card__claim-type--positive {
    background: rgba(42, 187, 127, 0.15);
    color: ${RABBY.dark.green};
  }
}

/* =========================================================================
   Weight bar visualization in sidebar
   ========================================================================= */

.${p}-weight-bar {
  display: flex;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
  background: ${RABBY.light.line};
}

@media (prefers-color-scheme: dark) {
  .${p}-weight-bar {
    background: ${RABBY.dark.line};
  }
}

.${p}-weight-bar__negative {
  background: ${RABBY.light.red};
  transition: width 0.3s ease;
}

.${p}-weight-bar__positive {
  background: ${RABBY.light.green};
  transition: width 0.3s ease;
}

.${p}-weight-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: ${RABBY.light.foot};
  margin-bottom: 16px;
}

@media (prefers-color-scheme: dark) {
  .${p}-weight-labels {
    color: ${RABBY.dark.foot};
  }
}
`;
}
