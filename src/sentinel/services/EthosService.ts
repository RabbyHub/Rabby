/**
 * ============================================================================
 * Sentinel Trust Layer — Ethos Service
 * ============================================================================
 *
 * Handles all communication with the Ethos Network REST API v2.
 * Primary responsibility: fetching credibility scores for wallet addresses
 * so that report weights can be calculated as ethosScore^2.
 *
 * Ethos API docs: https://developers.ethos.network/
 * Base URL: https://api.ethos.network
 * Required header: X-Ethos-Client
 * ============================================================================
 */

import type { EthosScoreResponse, SentinelConfig } from '../types';

/** Simple fetch with exponential backoff on 429/5xx errors */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxRetries = 2
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.status === 429 || (response.status >= 500 && attempt < maxRetries)) {
        // Exponential backoff: 1s, 2s, 4s...
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

export class EthosService {
  private baseUrl: string;
  private clientId: string;

  /** In-memory cache: wallet address → { score, fetchedAt } */
  private scoreCache: Map<string, { score: EthosScoreResponse; fetchedAt: number }> =
    new Map();

  /** Cache TTL: 5 minutes — Ethos scores don't change frequently */
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000;

  constructor(config: SentinelConfig) {
    this.baseUrl = config.ethosApiBaseUrl;
    this.clientId = config.ethosClientId;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Fetch the Ethos credibility score for a single wallet address.
   *
   * Endpoint: GET /api/v2/score/address?address=0x...
   * Returns a numeric score and a human-readable level string.
   *
   * Uses an in-memory cache to avoid hammering the API on repeated lookups
   * (e.g. when multiple tweets are flagged by the same reporter).
   */
  async getScoreByAddress(walletAddress: string): Promise<EthosScoreResponse> {
    const normalized = walletAddress.toLowerCase();

    // Check cache first
    const cached = this.scoreCache.get(normalized);
    if (cached && Date.now() - cached.fetchedAt < EthosService.CACHE_TTL_MS) {
      return cached.score;
    }

    try {
      const response = await fetchWithRetry(
        `${this.baseUrl}/api/v2/score/address?address=${encodeURIComponent(normalized)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Ethos-Client': this.clientId,
          },
        }
      );

      if (!response.ok) {
        // If 404, the user has no Ethos profile → return neutral score of 0
        if (response.status === 404) {
          return { score: 0, level: 'neutral' };
        }
        throw new Error(`Ethos API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      const result: EthosScoreResponse = {
        score: typeof data.score === 'number' ? data.score : 0,
        level: typeof data.level === 'string' ? data.level : 'neutral',
      };

      // Update cache
      this.scoreCache.set(normalized, { score: result, fetchedAt: Date.now() });

      return result;
    } catch (error) {
      console.warn('[Sentinel/EthosService] Failed to fetch score:', error);
      // Graceful degradation — return 0 so the report still goes through
      return { score: 0, level: 'neutral' };
    }
  }

  /**
   * Batch-fetch Ethos scores for multiple wallet addresses.
   *
   * Endpoint: POST /api/v2/score/addresses
   * Useful when rendering the Sentinel sidebar (Council + First Responder).
   */
  async getScoresByAddresses(
    walletAddresses: string[]
  ): Promise<Map<string, EthosScoreResponse>> {
    const results = new Map<string, EthosScoreResponse>();
    const uncached: string[] = [];

    // Separate cached from uncached
    for (const addr of walletAddresses) {
      const normalized = addr.toLowerCase();
      const cached = this.scoreCache.get(normalized);
      if (cached && Date.now() - cached.fetchedAt < EthosService.CACHE_TTL_MS) {
        results.set(normalized, cached.score);
      } else {
        uncached.push(normalized);
      }
    }

    // Fetch uncached addresses in a single batch request
    if (uncached.length > 0) {
      try {
        const response = await fetchWithRetry(`${this.baseUrl}/api/v2/score/addresses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Ethos-Client': this.clientId,
          },
          body: JSON.stringify({ addresses: uncached }),
        });

        if (response.ok) {
          const data = await response.json();

          // Ethos v2 batch response is an object keyed by address:
          // { "0xabc...": { score: 1450, level: "known" }, ... }
          for (const [addr, scoreData] of Object.entries(data)) {
            const normalized = addr.toLowerCase();
            const entry = scoreData as { score?: number; level?: string };
            const result: EthosScoreResponse = {
              score: entry.score ?? 0,
              level: entry.level ?? 'neutral',
            };
            results.set(normalized, result);
            this.scoreCache.set(normalized, { score: result, fetchedAt: Date.now() });
          }
        }
      } catch (error) {
        console.warn('[Sentinel/EthosService] Batch score fetch failed:', error);
      }

      // Fill in any addresses that weren't returned with default scores
      for (const addr of uncached) {
        if (!results.has(addr)) {
          results.set(addr, { score: 0, level: 'neutral' });
        }
      }
    }

    return results;
  }

  /**
   * Look up the X (Twitter) handle associated with a wallet address via Ethos.
   * Returns null if the user hasn't linked an X account to their Ethos profile.
   */
  async getXHandleByAddress(walletAddress: string): Promise<string | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v2/user/by/address/${encodeURIComponent(walletAddress.toLowerCase())}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Ethos-Client': this.clientId,
          },
        }
      );

      if (!response.ok) return null;

      const data = await response.json();
      // Look for an X/Twitter userkey in the user's linked accounts
      const xUserkey = (data.userkeys ?? []).find(
        (k: string) => k.startsWith('service:x.com:')
      );
      if (xUserkey) {
        // Extract username if available (format: service:x.com:username:handle)
        const parts = xUserkey.split(':');
        if (parts[2] === 'username' && parts[3]) {
          return `@${parts[3]}`;
        }
      }
      // Fall back to the Ethos username if no X handle found
      if (data.username) return `@${data.username}`;
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Invalidate a single cached entry (e.g. after the user updates their profile).
   */
  invalidateCache(walletAddress: string): void {
    this.scoreCache.delete(walletAddress.toLowerCase());
  }

  /**
   * Clear the entire score cache.
   */
  clearCache(): void {
    this.scoreCache.clear();
  }
}
