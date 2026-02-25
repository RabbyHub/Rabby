/**
 * ============================================================================
 * Sentinel Trust Layer — Sidebar Component
 * ============================================================================
 *
 * The Sentinel Sidebar is a slide-out panel that appears when a user clicks
 * on a conviction badge. It displays:
 *
 *   1. The conviction level with a color-coded pill
 *   2. A weight bar visualizing negative vs positive report weights
 *   3. The "First Responder" — the very first account to report the tweet,
 *      regardless of their Ethos score, labeled with a 🏆 icon
 *   4. The "Council" — the top 5 accounts with the highest Ethos scores
 *      who reported the tweet
 *   5. Each entry shows: handle/wallet, Ethos score, claim type, and context
 *   6. A "Low Credibility" warning if the First Responder has Ethos score ≤ 0
 *
 * This panel bridges Web3 Reputation (Ethos) with Structured Knowledge
 * (Intuition) to give users full transparency into how a conviction was reached.
 * ============================================================================
 */

import type { TweetTrustData, SentinelReport, ConvictionLevel } from '../types';
import {
  SENTINEL_CSS_PREFIX,
  BADGE_COLORS,
  FIRST_RESPONDER_ICON,
  LOW_CREDIBILITY_THRESHOLD,
} from '../constants';

/**
 * Render a single reporter card (used for both First Responder and Council).
 *
 * @param report — the report data
 * @param role — 'first-responder' or 'council'
 * @returns HTMLElement for the card
 */
function renderReporterCard(
  report: SentinelReport,
  role: 'first-responder' | 'council'
): HTMLElement {
  const p = SENTINEL_CSS_PREFIX;

  const card = document.createElement('div');
  card.className = `${p}-reporter-card`;

  // --- Avatar (first letter of handle or wallet) ---
  const avatar = document.createElement('div');
  avatar.className = `${p}-reporter-card__avatar`;
  const displayChar = report.reporterHandle
    ? report.reporterHandle.replace('@', '').charAt(0).toUpperCase()
    : report.reporterWallet.charAt(2).toUpperCase(); // Skip "0x"
  avatar.textContent = displayChar;

  // --- Info column ---
  const info = document.createElement('div');
  info.className = `${p}-reporter-card__info`;

  // Name row: handle + badges
  const nameRow = document.createElement('div');
  nameRow.className = `${p}-reporter-card__name`;

  const nameText = document.createElement('span');
  nameText.textContent = report.reporterHandle || shortenWallet(report.reporterWallet);

  nameRow.appendChild(nameText);

  // Role badge: First Responder 🏆
  if (role === 'first-responder') {
    const frBadge = document.createElement('span');
    frBadge.className = `${p}-reporter-card__badge ${p}-reporter-card__badge--first-responder`;
    frBadge.textContent = `${FIRST_RESPONDER_ICON} First Responder`;
    nameRow.appendChild(frBadge);
  }

  // Low Credibility warning if Ethos score ≤ 0
  if (report.ethosScore <= LOW_CREDIBILITY_THRESHOLD) {
    const lcBadge = document.createElement('span');
    lcBadge.className = `${p}-reporter-card__badge ${p}-reporter-card__badge--low-credibility`;
    lcBadge.textContent = '\u{26A0}\u{FE0F} Low Credibility';
    nameRow.appendChild(lcBadge);
  }

  // Handle/wallet line
  const handleLine = document.createElement('div');
  handleLine.className = `${p}-reporter-card__handle`;
  handleLine.textContent = report.reporterHandle
    ? `${shortenWallet(report.reporterWallet)}`
    : shortenWallet(report.reporterWallet);

  // Ethos score pill
  const scorePill = document.createElement('span');
  scorePill.className = `${p}-reporter-card__score`;
  scorePill.textContent = `Ethos: ${report.ethosScore.toLocaleString()}`;

  // Claim type pill
  const claimPill = document.createElement('span');
  claimPill.className = `${p}-reporter-card__claim-type ${
    report.claimType === 'negative'
      ? `${p}-reporter-card__claim-type--negative`
      : `${p}-reporter-card__claim-type--positive`
  }`;
  claimPill.textContent = report.claimType === 'negative' ? 'Scam' : 'Legit';

  // Context note
  const contextEl = document.createElement('div');
  contextEl.className = `${p}-reporter-card__context`;
  contextEl.textContent = `"${report.context}"`;

  // Assemble info
  info.appendChild(nameRow);
  info.appendChild(handleLine);

  const metaRow = document.createElement('div');
  metaRow.style.cssText = 'display:flex;gap:6px;align-items:center;margin-top:4px;flex-wrap:wrap;';
  metaRow.appendChild(scorePill);
  metaRow.appendChild(claimPill);
  info.appendChild(metaRow);

  info.appendChild(contextEl);

  card.appendChild(avatar);
  card.appendChild(info);

  return card;
}

/**
 * Shorten a wallet address for display: 0x1234...abcd
 */
function shortenWallet(wallet: string): string {
  if (!wallet || wallet.length < 10) return wallet;
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

/**
 * Get badge style attributes for a conviction level.
 */
function getConvictionStyle(conviction: ConvictionLevel): string {
  const colors = BADGE_COLORS[conviction] || BADGE_COLORS['Unverified'];
  return `background:${colors.background};color:${colors.text};border:1px solid ${colors.border};`;
}

/**
 * Create and display the Sentinel Sidebar.
 *
 * @param trustData — the full aggregated trust data for the tweet
 * @param onClose — callback when the sidebar is closed
 * @returns The overlay + sidebar elements (for cleanup)
 */
export function showSidebar(
  trustData: TweetTrustData,
  onClose: () => void
): { overlay: HTMLElement; sidebar: HTMLElement } {
  const p = SENTINEL_CSS_PREFIX;

  // --- Overlay backdrop ---
  const overlay = document.createElement('div');
  overlay.className = `${p}-sidebar-overlay`;

  // --- Sidebar panel ---
  const sidebar = document.createElement('div');
  sidebar.className = `${p}-sidebar`;
  sidebar.addEventListener('click', (e) => e.stopPropagation());

  // --- Header: title + close button ---
  const header = document.createElement('div');
  header.className = `${p}-sidebar__header`;

  const title = document.createElement('div');
  title.className = `${p}-sidebar__title`;
  title.innerHTML = `<span>\u{1F6E1}\u{FE0F}</span> Sentinel Report`;

  const closeBtn = document.createElement('button');
  closeBtn.className = `${p}-sidebar__close`;
  closeBtn.innerHTML = '&times;';
  closeBtn.setAttribute('aria-label', 'Close Sentinel sidebar');

  header.appendChild(title);
  header.appendChild(closeBtn);

  // --- Conviction pill ---
  const convictionPill = document.createElement('div');
  convictionPill.className = `${p}-sidebar__conviction`;
  convictionPill.setAttribute('style', getConvictionStyle(trustData.conviction));
  convictionPill.textContent = trustData.conviction;

  // --- Weight bar: visual negative vs positive breakdown ---
  const totalWeight = trustData.negativeWeight + trustData.positiveWeight;
  const negPct = totalWeight > 0 ? (trustData.negativeWeight / totalWeight) * 100 : 50;
  const posPct = totalWeight > 0 ? (trustData.positiveWeight / totalWeight) * 100 : 50;

  const weightBar = document.createElement('div');
  weightBar.className = `${p}-weight-bar`;

  const negBar = document.createElement('div');
  negBar.className = `${p}-weight-bar__negative`;
  negBar.style.width = `${negPct}%`;

  const posBar = document.createElement('div');
  posBar.className = `${p}-weight-bar__positive`;
  posBar.style.width = `${posPct}%`;

  weightBar.appendChild(negBar);
  weightBar.appendChild(posBar);

  const weightLabels = document.createElement('div');
  weightLabels.className = `${p}-weight-labels`;
  weightLabels.innerHTML = `
    <span style="color:#E34935">\u{1F6A8} Scam: ${formatWeight(trustData.negativeWeight)}</span>
    <span style="color:#2ABB7F">\u{2705} Legit: ${formatWeight(trustData.positiveWeight)}</span>
  `;

  // --- Assemble header section ---
  sidebar.appendChild(header);
  sidebar.appendChild(convictionPill);
  sidebar.appendChild(weightBar);
  sidebar.appendChild(weightLabels);

  // --- Tweet URL reference ---
  const urlRef = document.createElement('div');
  urlRef.style.cssText = 'font-size:12px;color:#6A7587;margin-bottom:16px;word-break:break-all;';
  urlRef.textContent = trustData.tweetUrl;
  sidebar.appendChild(urlRef);

  // --- First Responder section ---
  if (trustData.firstResponder) {
    const frTitle = document.createElement('div');
    frTitle.className = `${p}-sidebar__section-title`;
    frTitle.textContent = `${FIRST_RESPONDER_ICON} The Whistleblower — First Responder`;
    sidebar.appendChild(frTitle);

    sidebar.appendChild(
      renderReporterCard(trustData.firstResponder, 'first-responder')
    );
  }

  // --- The Council section ---
  if (trustData.council.length > 0) {
    const councilTitle = document.createElement('div');
    councilTitle.className = `${p}-sidebar__section-title`;
    councilTitle.textContent = '\u{1F3DB}\u{FE0F} The Council — Top Ethos Reporters';
    sidebar.appendChild(councilTitle);

    for (const member of trustData.council) {
      sidebar.appendChild(renderReporterCard(member, 'council'));
    }
  }

  // --- Total reports count ---
  const totalReports = document.createElement('div');
  totalReports.style.cssText =
    'font-size:12px;color:#6A7587;margin-top:24px;text-align:center;';
  totalReports.textContent = `${trustData.reports.length} total report${trustData.reports.length !== 1 ? 's' : ''}`;
  sidebar.appendChild(totalReports);

  // --- Close handlers ---
  const close = () => {
    overlay.remove();
    sidebar.remove();
    onClose();
  };

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', close);

  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);

  return { overlay, sidebar };
}

/**
 * Format large weight numbers for display (e.g. 1,000,000 → "1.0M").
 */
function formatWeight(weight: number): string {
  if (weight >= 1_000_000_000) return `${(weight / 1_000_000_000).toFixed(1)}B`;
  if (weight >= 1_000_000) return `${(weight / 1_000_000).toFixed(1)}M`;
  if (weight >= 1_000) return `${(weight / 1_000).toFixed(1)}K`;
  return weight.toLocaleString();
}
