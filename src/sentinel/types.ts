/**
 * ============================================================================
 * Sentinel Trust Layer — Type Definitions
 * ============================================================================
 *
 * This file defines all TypeScript types used across the Sentinel module.
 * Sentinel bridges Web3 Reputation (Ethos) with Structured Knowledge (Intuition)
 * to solve the "Flash-Hack" social media problem — identifying hacks, exploits,
 * and phishing links on X (formerly Twitter) in real-time.
 * ============================================================================
 */

// ---------------------------------------------------------------------------
// Conviction Levels — the visual trust status displayed on tweets
// ---------------------------------------------------------------------------

export type ConvictionLevel =
  | 'Safe'
  | 'Unverified'
  | 'Likely Scam'
  | 'Verified Scam'
  | 'Contested Content';

// ---------------------------------------------------------------------------
// Report — a single user-submitted flag (positive or negative)
// ---------------------------------------------------------------------------

export interface SentinelReport {
  /** Unique ID of the report */
  id: string;

  /** The full URL of the tweet being reported (e.g. https://x.com/user/status/123) */
  tweetUrl: string;

  /** The X handle of the tweet author (e.g. "@vitalik") */
  tweetAuthorHandle: string;

  /** The wallet address of the reporter */
  reporterWallet: string;

  /** The X handle of the reporter (if known) */
  reporterHandle?: string;

  /** Whether this is a negative ("scam") or positive ("legit") claim */
  claimType: 'negative' | 'positive';

  /** Free-text context provided by the reporter (e.g. "This is a drainer") */
  context: string;

  /** The reporter's Ethos credibility score at the time of reporting */
  ethosScore: number;

  /** Computed weight = ethosScore^2, or 0 if self-reporting */
  weight: number;

  /** ISO timestamp of when the report was created */
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Aggregated tweet trust data — cached per tweet URL
// ---------------------------------------------------------------------------

export interface TweetTrustData {
  /** The canonical tweet URL */
  tweetUrl: string;

  /** All reports collected for this tweet */
  reports: SentinelReport[];

  /** Current conviction level derived from calculateConfidence() */
  conviction: ConvictionLevel;

  /** Sum of negative (scam) report weights */
  negativeWeight: number;

  /** Sum of positive (legit) report weights */
  positiveWeight: number;

  /** The first reporter — the "First Responder" regardless of score */
  firstResponder: SentinelReport | null;

  /** Top 5 reporters by Ethos score — the "Council" */
  council: SentinelReport[];

  /** Last time this data was refreshed (ISO timestamp) */
  lastUpdated: string;
}

// ---------------------------------------------------------------------------
// Intuition primitives — Atoms and Triples for the knowledge graph
// ---------------------------------------------------------------------------

export interface IntuitionAtom {
  /** Unique atom identifier returned by Intuition GraphQL */
  term_id: string;

  /** Human-readable label (e.g. tweet URL, "Scam", "trustworthy") */
  label: string;

  /** Atom type as returned by the protocol (e.g. "TextObject", "Thing", "Keywords") */
  type: string;

  /** Creator wallet address */
  creator_id?: string;

  /** ISO timestamp of creation */
  created_at?: string;
}

export interface IntuitionTriple {
  /** Subject atom hash */
  subject_id: string;

  /** Predicate atom hash */
  predicate_id: string;

  /** Object atom hash */
  object_id: string;

  /** Subject atom — the tweet URL */
  subject: IntuitionAtom;

  /** Predicate atom — e.g. "has tag" */
  predicate: IntuitionAtom;

  /** Object atom — e.g. "trustworthy", "clickbait", "Scam" */
  object: IntuitionAtom;

  /** Creator wallet address */
  creator_id: string;

  /** ISO timestamp */
  created_at?: string;

  /** Positions (stakers) on this triple — positive side */
  positions: IntuitionPosition[];

  /** Counter-positions (stakers) on this triple — opposing side */
  counter_positions: IntuitionPosition[];
}

export interface IntuitionPosition {
  /** Staker wallet address */
  account_id: string;

  /** Shares staked (as string, large numbers) */
  shares: string;
}

// ---------------------------------------------------------------------------
// Ethos API response types
// ---------------------------------------------------------------------------

export interface EthosScoreResponse {
  /** Numeric credibility score */
  score: number;

  /** Human-readable level (e.g. "reputable", "untrusted") */
  level: string;
}

// ---------------------------------------------------------------------------
// Sentinel configuration
// ---------------------------------------------------------------------------

export interface SentinelConfig {
  /** Ethos API base URL */
  ethosApiBaseUrl: string;

  /** Ethos client identifier header value */
  ethosClientId: string;

  /**
   * Intuition Mainnet GraphQL endpoint (public, no auth required).
   * Powered by Hasura — supports filtering, sorting, pagination, aggregations.
   * Docs: https://www.docs.intuition.systems/docs/graphql-api/getting-started/introduction
   */
  intuitionGraphqlUrl: string;

  /**
   * Intuition Mainnet RPC endpoint for on-chain write operations.
   * Chain ID: 1155, Currency: TRUST
   * Write operations (creating atoms/triples) require wallet signing via the Intuition SDK.
   */
  intuitionRpcUrl: string;

  /** Polling interval in ms for background sync */
  pollingIntervalMs: number;

  /** Whether Sentinel is enabled */
  enabled: boolean;
}
