/**
 * ============================================================================
 * Sentinel Trust Layer — Constants
 * ============================================================================
 *
 * Central configuration and threshold constants for the Sentinel module.
 * Tuning these values adjusts how aggressively tweets are flagged and how
 * the reputation-weighted conviction system behaves.
 * ============================================================================
 */

import type { SentinelConfig } from './types';

// ---------------------------------------------------------------------------
// Default Sentinel configuration
// ---------------------------------------------------------------------------

export const SENTINEL_DEFAULT_CONFIG: SentinelConfig = {
  /** Ethos Network REST API v2 base */
  ethosApiBaseUrl: 'https://api.ethos.network',

  /** Client identifier sent via X-Ethos-Client header */
  ethosClientId: 'rabby-sentinel@1.0.0',

  /**
   * Intuition Mainnet GraphQL endpoint (public, no authentication required).
   * Powered by Hasura — supports filtering, sorting, pagination, aggregations.
   * Interactive explorer: https://studio.apollographql.com/sandbox/explorer?endpoint=https%3A%2F%2Fmainnet.intuition.sh%2Fv1%2Fgraphql
   */
  intuitionGraphqlUrl: 'https://mainnet.intuition.sh/v1/graphql',

  /**
   * Intuition Mainnet RPC for on-chain write operations (chain ID 1155).
   * Creating atoms/triples requires wallet signing via the Intuition SDK.
   * Explorer: https://explorer.intuition.systems
   */
  intuitionRpcUrl: 'https://rpc.intuition.systems/http',

  /** Background polling interval: every 30 seconds */
  pollingIntervalMs: 30_000,

  /** Sentinel is enabled by default */
  enabled: true,
};

// ---------------------------------------------------------------------------
// Conviction thresholds
// ---------------------------------------------------------------------------
// These thresholds are applied to the NET score (negativeWeight - positiveWeight).
// Each report's weight = ethosScore^2, so a single user with score 1000 contributes
// 1,000,000 weight — enough to push a tweet into "Likely Scam" on their own.
// ---------------------------------------------------------------------------

/** Below 0 → the positive (legit) reports outweigh negatives */
export const THRESHOLD_SAFE = 0;

/** 0 – 1,000,000 → insufficient signal, show no badge */
export const THRESHOLD_UNVERIFIED = 1_000_000;

/** 1,000,000 – 10,000,000 → strong negative signal; ≥10M → "Verified Scam" */
export const THRESHOLD_LIKELY_SCAM = 10_000_000;

/**
 * Contested content ratio: if the smaller side is at least this fraction
 * of the larger side AND both sides exceed THRESHOLD_UNVERIFIED,
 * the tweet is marked "Contested Content."
 */
export const CONTESTED_RATIO = 0.4;

// ---------------------------------------------------------------------------
// Intuition semantic constants — atom values used in triples
// ---------------------------------------------------------------------------

export const INTUITION_PREDICATE_IS = 'is';
export const INTUITION_OBJECT_SCAM = 'Scam';
export const INTUITION_OBJECT_SAFE = 'Safe';

// ---------------------------------------------------------------------------
// DOM selectors for X (Twitter) tweet injection
// ---------------------------------------------------------------------------

export const SELECTOR_TWEET = '[data-testid="tweet"]';
export const SELECTOR_TWEET_TEXT = '[data-testid="tweetText"]';
export const SELECTOR_TWEET_ACTIONS = '[role="group"]';

// ---------------------------------------------------------------------------
// CSS class prefixes — all Sentinel DOM elements use this prefix
// to avoid collisions with X's own styles
// ---------------------------------------------------------------------------

export const SENTINEL_CSS_PREFIX = 'sentinel';

// ---------------------------------------------------------------------------
// Badge colors — aligned with Rabby's existing palette where possible
// ---------------------------------------------------------------------------

export const BADGE_COLORS = {
  /** Verified Scam — Rabby red-default (#E34935 / --r-red-default) */
  'Verified Scam': {
    background: '#E34935',
    text: '#FFFFFF',
    border: '#E34935',
    glow: 'rgba(227, 73, 53, 0.25)',
  },
  /** Likely Scam — Rabby orange-default (#FF9F0A / --rb-orange-default) */
  'Likely Scam': {
    background: '#FF9F0A',
    text: '#192945',
    border: '#FF9F0A',
    glow: 'rgba(255, 159, 10, 0.25)',
  },
  /** Contested Content — Rabby blue-default (#4C65FF / --r-blue-default) */
  'Contested Content': {
    background: '#4C65FF',
    text: '#FFFFFF',
    border: '#4C65FF',
    glow: 'rgba(76, 101, 255, 0.25)',
  },
  /** Safe — Rabby green-default (#2ABB7F / --r-green-default) */
  Safe: {
    background: '#2ABB7F',
    text: '#FFFFFF',
    border: '#2ABB7F',
    glow: 'rgba(42, 187, 127, 0.25)',
  },
  /** Unverified — no badge shown, but defined for completeness */
  Unverified: {
    background: 'transparent',
    text: '#6A7587',
    border: '#E0E5EC',
    glow: 'none',
  },
} as const;

// ---------------------------------------------------------------------------
// Sidebar / Council constants
// ---------------------------------------------------------------------------

/** Number of top-Ethos-score reporters shown in the "Council" panel */
export const COUNCIL_SIZE = 5;

/** First Responder trophy icon */
export const FIRST_RESPONDER_ICON = '\u{1F3C6}'; // 🏆

/** Low credibility warning threshold */
export const LOW_CREDIBILITY_THRESHOLD = 0;

// ---------------------------------------------------------------------------
// Message types for background ↔ content script communication
// ---------------------------------------------------------------------------

export const SENTINEL_MESSAGES = {
  /** Content script → background: submit a new report */
  SUBMIT_REPORT: 'sentinel:submit-report',

  /** Content script → background: request trust data for tweet URLs */
  GET_TRUST_DATA: 'sentinel:get-trust-data',

  /** Background → content script: push updated trust data */
  TRUST_DATA_UPDATE: 'sentinel:trust-data-update',

  /** Content script → background: fetch Ethos score for a wallet */
  GET_ETHOS_SCORE: 'sentinel:get-ethos-score',

  /** Background → content script: Sentinel enabled/disabled toggle */
  TOGGLE_SENTINEL: 'sentinel:toggle',
} as const;
