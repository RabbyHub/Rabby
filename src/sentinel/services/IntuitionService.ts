/**
 * ============================================================================
 * Sentinel Trust Layer — Intuition Service
 * ============================================================================
 *
 * Handles all communication with the Intuition protocol via the public
 * Mainnet GraphQL API (Hasura-powered, no authentication required):
 *
 *   Endpoint: https://mainnet.intuition.sh/v1/graphql
 *
 * Read operations (queries):
 *   - Searching atoms by label (e.g. tweet URLs)
 *   - Querying triples where the subject is a tweet URL
 *   - Batch-querying triples for multiple URLs via _in operator
 *
 * Write operations (on-chain):
 *   - Creating atoms and triples requires wallet signing on the
 *     Intuition Mainnet (chain ID 1155) via the Intuition SDK.
 *   - For the prototype, writes are stored locally and flagged for
 *     future on-chain submission.
 *
 * Intuition Architecture:
 *   Atoms   = unique identifiers for any entity or concept (term_id, label, type)
 *   Triples = subject-predicate-object attestations linking atoms
 *   Positions = economic stakes (shares) weighting those attestations
 *
 * Docs: https://www.docs.intuition.systems/docs/graphql-api/getting-started/introduction
 * ============================================================================
 */

import type { IntuitionAtom, IntuitionTriple, IntuitionPosition, SentinelConfig } from '../types';
import {
  INTUITION_PREDICATE_IS,
  INTUITION_OBJECT_SCAM,
  INTUITION_OBJECT_SAFE,
} from '../constants';

// ---------------------------------------------------------------------------
// GraphQL query fragments
// ---------------------------------------------------------------------------

/** Fields returned for every atom in a query */
const ATOM_FIELDS = `
  term_id
  label
  type
  creator_id
  created_at
`;

/** Fields returned for every triple, including nested atoms and vault positions */
const TRIPLE_FIELDS = `
  subject_id
  predicate_id
  object_id
  creator_id
  created_at
  subject { ${ATOM_FIELDS} }
  predicate { ${ATOM_FIELDS} }
  object { ${ATOM_FIELDS} }
  term {
    vaults {
      total_shares
      position_count
      current_share_price
      positions(order_by: { shares: desc }) {
        account_id
        shares
      }
    }
  }
`;

export class IntuitionService {
  private graphqlUrl: string;
  private rpcUrl: string;

  /** Local cache: atom label → atom object (avoids duplicate queries) */
  private atomCache: Map<string, IntuitionAtom> = new Map();

  constructor(config: SentinelConfig) {
    this.graphqlUrl = config.intuitionGraphqlUrl;
    this.rpcUrl = config.intuitionRpcUrl;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /** Simple fetch with exponential backoff on 429/5xx errors */
  private async fetchWithRetry(
    url: string,
    init: RequestInit,
    maxRetries = 2
  ): Promise<Response> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, init);
        if (response.status === 429 || (response.status >= 500 && attempt < maxRetries)) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        return response;
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError ?? new Error('fetchWithRetry: all retries exhausted');
  }

  /**
   * Execute a GraphQL query against the Intuition Mainnet endpoint.
   * No authentication required — the API is fully public.
   */
  private async graphql<T = any>(
    query: string,
    variables?: Record<string, any>
  ): Promise<T | null> {
    try {
      const response = await this.fetchWithRetry(this.graphqlUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
      });

      if (!response.ok) {
        console.warn(
          `[Sentinel/IntuitionService] GraphQL HTTP error: ${response.status}`
        );
        return null;
      }

      const json = await response.json();

      if (json.errors?.length) {
        console.warn(
          '[Sentinel/IntuitionService] GraphQL errors:',
          json.errors.map((e: any) => e.message)
        );
        return null;
      }

      return json.data as T;
    } catch (error) {
      console.warn('[Sentinel/IntuitionService] GraphQL fetch failed:', error);
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // Atom queries (read-only via GraphQL)
  // -------------------------------------------------------------------------

  /**
   * Find an atom by its exact label (e.g. a tweet URL).
   */
  async findAtomByLabel(label: string): Promise<IntuitionAtom | null> {
    const cached = this.atomCache.get(label);
    if (cached) return cached;

    const data = await this.graphql<{ atoms: IntuitionAtom[] }>(
      `query FindAtom($label: String!) {
        atoms(where: { label: { _eq: $label } }, limit: 1) {
          ${ATOM_FIELDS}
        }
      }`,
      { label }
    );

    if (!data?.atoms?.length) return null;

    const atom = data.atoms[0];
    this.atomCache.set(label, atom);
    return atom;
  }

  /**
   * Search atoms whose labels contain a substring (e.g. "https://x.com").
   * Useful for discovering Sentinel-related atoms.
   */
  async searchAtomsByLabel(
    pattern: string,
    limit = 20
  ): Promise<IntuitionAtom[]> {
    const data = await this.graphql<{ atoms: IntuitionAtom[] }>(
      `query SearchAtoms($pattern: String!, $limit: Int!) {
        atoms(where: { label: { _ilike: $pattern } }, limit: $limit, order_by: { created_at: desc }) {
          ${ATOM_FIELDS}
        }
      }`,
      { pattern: `%${pattern}%`, limit }
    );

    return data?.atoms ?? [];
  }

  // -------------------------------------------------------------------------
  // Triple queries (read-only via GraphQL)
  // -------------------------------------------------------------------------

  /**
   * Query all triples where the subject atom's label matches the tweet URL.
   *
   * This is the core query used by the background polling script to
   * fetch real-time flag data for tweets currently in the viewport.
   *
   * Returns triples with their subject/predicate/object atoms and
   * positions (shares staked for/against).
   */
  async getTriplesForUrl(tweetUrl: string): Promise<IntuitionTriple[]> {
    const data = await this.graphql<{ triples: any[] }>(
      `query GetTriplesForUrl($url: String!) {
        triples(
          where: { subject: { label: { _eq: $url } } }
          order_by: { created_at: desc }
        ) {
          ${TRIPLE_FIELDS}
        }
      }`,
      { url: tweetUrl }
    );

    if (!data?.triples?.length) return [];

    return data.triples.map((t: any) => this.mapTriple(t));
  }

  /**
   * Batch-query triples for multiple tweet URLs in a single GraphQL request.
   *
   * Uses the Hasura _in operator to query all URLs at once, avoiding
   * N+1 queries. Results are grouped by subject label (tweet URL).
   */
  async getTriplesForUrls(
    tweetUrls: string[]
  ): Promise<Map<string, IntuitionTriple[]>> {
    const results = new Map<string, IntuitionTriple[]>();

    if (tweetUrls.length === 0) return results;

    // Initialize empty arrays for all URLs
    for (const url of tweetUrls) {
      results.set(url, []);
    }

    const data = await this.graphql<{ triples: any[] }>(
      `query GetTriplesForUrls($urls: [String!]!) {
        triples(
          where: { subject: { label: { _in: $urls } } }
          order_by: { created_at: desc }
        ) {
          ${TRIPLE_FIELDS}
        }
      }`,
      { urls: tweetUrls }
    );

    if (!data?.triples?.length) return results;

    // Group triples by their subject label (the tweet URL)
    for (const raw of data.triples) {
      const triple = this.mapTriple(raw);
      const url = triple.subject.label;
      const existing = results.get(url) ?? [];
      existing.push(triple);
      results.set(url, existing);
    }

    return results;
  }

  // -------------------------------------------------------------------------
  // Write operations — local-first with on-chain flag
  // -------------------------------------------------------------------------

  /**
   * Record a claim triple locally and flag it for future on-chain submission.
   *
   * Creating atoms and triples on-chain requires:
   *   1. A wallet connected to the Intuition Mainnet (chain ID 1155)
   *   2. Signing a transaction via the Intuition SDK / MultiVault contract
   *   3. Paying gas in TRUST tokens
   *
   * For the prototype, we store the claim locally and return a placeholder
   * triple. Full on-chain integration will use @0xintuition/sdk.
   */
  async createClaimTriple(
    tweetUrl: string,
    claimType: 'negative' | 'positive',
    creatorWallet?: string
  ): Promise<IntuitionTriple> {
    const objectLabel =
      claimType === 'negative' ? INTUITION_OBJECT_SCAM : INTUITION_OBJECT_SAFE;

    // Try to find existing atoms for the subject and object
    const [subjectAtom, objectAtom] = await Promise.all([
      this.findAtomByLabel(tweetUrl),
      this.findAtomByLabel(objectLabel),
    ]);

    const now = new Date().toISOString();
    const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // NOTE: predicate_id uses a local placeholder. Real on-chain triples
    // require a registered predicate atom looked up by term_id via the
    // Intuition SDK. This will be replaced during on-chain integration.
    const triple: IntuitionTriple = {
      subject_id: subjectAtom?.term_id ?? localId,
      predicate_id: `local-predicate-${INTUITION_PREDICATE_IS}`,
      object_id: objectAtom?.term_id ?? localId,
      subject: subjectAtom ?? {
        term_id: localId,
        label: tweetUrl,
        type: 'TextObject',
        creator_id: creatorWallet,
        created_at: now,
      },
      predicate: {
        term_id: `local-predicate-${INTUITION_PREDICATE_IS}`,
        label: INTUITION_PREDICATE_IS,
        type: 'Keywords',
      },
      object: objectAtom ?? {
        term_id: localId,
        label: objectLabel,
        type: 'Thing',
        creator_id: creatorWallet,
        created_at: now,
      },
      creator_id: creatorWallet ?? 'unknown',
      created_at: now,
      positions: [],
      counter_positions: [],
    };

    console.info(
      `[Sentinel/IntuitionService] Local claim created: ${tweetUrl} → ${objectLabel}. ` +
        `On-chain submission requires Intuition SDK + wallet signing on chain 1155.`
    );

    return triple;
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /**
   * Map a raw GraphQL triple response to our IntuitionTriple type.
   */
  private mapTriple(raw: any): IntuitionTriple {
    // Extract positions from the vault-based structure.
    // Triples have two vaults: positive (affirming) and counter (denying).
    const vaults = raw.term?.vaults ?? [];
    const positions: IntuitionPosition[] = [];
    const counterPositions: IntuitionPosition[] = [];

    // The first vault is the positive vault, the second is the counter vault
    // (ordered by the Hasura query or by curve_id convention).
    for (let i = 0; i < vaults.length; i++) {
      const vaultPositions = (vaults[i]?.positions ?? []).map((p: any) => ({
        account_id: p.account_id,
        shares: p.shares ?? '0',
      }));
      if (i === 0) {
        positions.push(...vaultPositions);
      } else {
        counterPositions.push(...vaultPositions);
      }
    }

    return {
      subject_id: raw.subject_id,
      predicate_id: raw.predicate_id,
      object_id: raw.object_id,
      creator_id: raw.creator_id,
      created_at: raw.created_at,
      subject: {
        term_id: raw.subject?.term_id ?? raw.subject_id,
        label: raw.subject?.label ?? '',
        type: raw.subject?.type ?? 'Unknown',
        creator_id: raw.subject?.creator_id,
        created_at: raw.subject?.created_at,
      },
      predicate: {
        term_id: raw.predicate?.term_id ?? raw.predicate_id,
        label: raw.predicate?.label ?? '',
        type: raw.predicate?.type ?? 'Unknown',
        creator_id: raw.predicate?.creator_id,
        created_at: raw.predicate?.created_at,
      },
      object: {
        term_id: raw.object?.term_id ?? raw.object_id,
        label: raw.object?.label ?? '',
        type: raw.object?.type ?? 'Unknown',
        creator_id: raw.object?.creator_id,
        created_at: raw.object?.created_at,
      },
      positions,
      counter_positions: counterPositions,
    };
  }

  /**
   * Clear the local atom cache.
   */
  clearCache(): void {
    this.atomCache.clear();
  }
}
