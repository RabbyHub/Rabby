/**
 * ============================================================================
 * Sentinel Trust Layer — Main Module Export
 * ============================================================================
 *
 * Sentinel turns the Rabby Wallet extension into a proactive firewall for
 * social media (specifically X / Twitter). It identifies hacks, exploits,
 * and phishing links in real-time by leveraging:
 *
 *   - Intuition Systems — for structured knowledge (Atoms, Triples, Signals)
 *   - Ethos Network — for Web3 reputation scoring and weighting
 *
 * Architecture:
 *   src/sentinel/
 *     types.ts           — TypeScript type definitions
 *     constants.ts       — Configuration, thresholds, selectors
 *     services/           — TrustService, EthosService, IntuitionService
 *     ui/                 — Badge, ActionButtons, ContextModal, Sidebar, styles
 *     content-script/     — MutationObserver injection for x.com
 *     background/         — Background polling, message handling
 *
 * All Sentinel logic is fully self-contained in this folder.
 * The Rabby core codebase remains untouched.
 * ============================================================================
 */

// --- Types ---
export type {
  ConvictionLevel,
  SentinelReport,
  TweetTrustData,
  IntuitionAtom,
  IntuitionTriple,
  IntuitionPosition,
  EthosScoreResponse,
  SentinelConfig,
} from './types';

// --- Constants ---
export {
  SENTINEL_DEFAULT_CONFIG,
  SENTINEL_MESSAGES,
  BADGE_COLORS,
  COUNCIL_SIZE,
} from './constants';

// --- Services ---
export { TrustService, EthosService, IntuitionService } from './services';

// --- Background ---
export {
  initSentinelBackground,
  setConnectedWallet,
  destroySentinelBackground,
} from './background';
