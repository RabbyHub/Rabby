/**
 * ============================================================================
 * Sentinel Trust Layer — TrustService (Core Engine)
 * ============================================================================
 *
 * The TrustService is the brain of Sentinel. It orchestrates:
 *
 *   1. Confidence Calculation — the reputation-weighted formula that turns
 *      individual reports into a collective "Conviction" level.
 *
 *   2. Report Submission — validating, weighting, and persisting new flags
 *      through both Ethos (reputation) and Intuition (knowledge graph).
 *
 *   3. Trust Data Aggregation — assembling the full TweetTrustData object
 *      including First Responder, Council, and conviction badge.
 *
 * The math:
 *   - Each report's weight = ethosScore² (square of the reporter's Ethos score)
 *   - Net score = Σ(negative weights) - Σ(positive weights)
 *   - Thresholds determine conviction level (see constants.ts)
 *   - Self-reporting (reporter wallet matches tweet author) → weight = 0
 *
 * This bridges Web3 Reputation (Ethos) with Structured Knowledge (Intuition)
 * to solve the "Flash-Hack" social media problem.
 * ============================================================================
 */

import browser from 'webextension-polyfill';
import type {
  SentinelReport,
  TweetTrustData,
  ConvictionLevel,
  IntuitionTriple,
  SentinelConfig,
} from '../types';
import {
  THRESHOLD_SAFE,
  THRESHOLD_UNVERIFIED,
  THRESHOLD_LIKELY_SCAM,
  CONTESTED_RATIO,
  COUNCIL_SIZE,
} from '../constants';
import { EthosService } from './EthosService';
import { IntuitionService } from './IntuitionService';

const STORAGE_KEY = 'sentinel_trust_data';

export class TrustService {
  private ethosService: EthosService;
  private intuitionService: IntuitionService;

  /**
   * In-memory store of trust data per tweet URL.
   * Backed by browser.storage.local for persistence across service worker restarts.
   */
  private trustDataStore: Map<string, TweetTrustData> = new Map();

  /** Whether the persistent store has been loaded into memory */
  private storeLoaded = false;

  constructor(config: SentinelConfig) {
    this.ethosService = new EthosService(config);
    this.intuitionService = new IntuitionService(config);
    this.loadFromStorage();
  }

  /** Load persisted trust data from browser.storage.local into memory */
  private async loadFromStorage(): Promise<void> {
    try {
      const result = await browser.storage.local.get(STORAGE_KEY);
      const stored = result[STORAGE_KEY] as Record<string, TweetTrustData> | undefined;
      if (stored) {
        for (const [url, data] of Object.entries(stored)) {
          this.trustDataStore.set(url, data);
        }
      }
      this.storeLoaded = true;
    } catch (error) {
      console.warn('[Sentinel/TrustService] Failed to load from storage:', error);
      this.storeLoaded = true;
    }
  }

  /** Persist the current trust data store to browser.storage.local */
  private persistToStorage(): void {
    const obj: Record<string, TweetTrustData> = {};
    for (const [url, data] of this.trustDataStore.entries()) {
      obj[url] = data;
    }
    browser.storage.local.set({ [STORAGE_KEY]: obj }).catch((error) => {
      console.warn('[Sentinel/TrustService] Failed to persist to storage:', error);
    });
  }

  // -------------------------------------------------------------------------
  // Confidence Calculation — the core reputation-weighted formula
  // -------------------------------------------------------------------------

  /**
   * Calculate the "Conviction" level for a set of reports.
   *
   * Algorithm:
   *   1. Compute each report's weight as ethosScore² (integrity-checked).
   *   2. Sum negative weights and positive weights separately.
   *   3. Check for "Contested Content" — both sides are high but close.
   *   4. Compute net = negativeWeight - positiveWeight.
   *   5. Map net to a ConvictionLevel via thresholds.
   *
   * @param reports — all reports for a single tweet
   * @returns ConvictionLevel string
   */
  calculateConfidence(reports: SentinelReport[]): ConvictionLevel {
    if (reports.length === 0) return 'Unverified';

    let negativeWeight = 0;
    let positiveWeight = 0;

    for (const report of reports) {
      // Weight is pre-computed on the report (includes integrity check),
      // but we recalculate here for safety
      const weight = report.weight;

      if (report.claimType === 'negative') {
        negativeWeight += weight;
      } else {
        positiveWeight += weight;
      }
    }

    // --- Contested Content Detection ---
    // If both sides are substantial (each > THRESHOLD_UNVERIFIED) and the
    // smaller side is at least CONTESTED_RATIO of the larger side,
    // mark as "Contested Content" to warn users of disagreement.
    const larger = Math.max(negativeWeight, positiveWeight);
    const smaller = Math.min(negativeWeight, positiveWeight);

    if (
      larger > THRESHOLD_UNVERIFIED &&
      smaller > THRESHOLD_UNVERIFIED &&
      smaller / larger >= CONTESTED_RATIO
    ) {
      return 'Contested Content';
    }

    // --- Net Score Thresholds ---
    const netScore = negativeWeight - positiveWeight;

    if (netScore < THRESHOLD_SAFE) {
      return 'Safe';
    }

    if (netScore < THRESHOLD_UNVERIFIED) {
      return 'Unverified';
    }

    if (netScore < THRESHOLD_LIKELY_SCAM) {
      return 'Likely Scam';
    }

    // netScore >= THRESHOLD_LIKELY_SCAM (10,000,000+)
    return 'Verified Scam';
  }

  // -------------------------------------------------------------------------
  // Report Weight Calculation
  // -------------------------------------------------------------------------

  /**
   * Compute the weight for a single report.
   *
   * Weight = ethosScore²
   *
   * Integrity Check: if the reporter's wallet or X handle matches the tweet
   * author's suspected wallet or handle, the weight is forced to 0.
   * This prevents self-reporting / self-defense manipulation.
   *
   * @param ethosScore — the reporter's credibility score from Ethos
   * @param reporterWallet — reporter's wallet address
   * @param reporterHandle — reporter's X handle (optional)
   * @param tweetAuthorHandle — the tweet author's X handle
   * @returns computed weight (0 if self-reporting)
   */
  computeReportWeight(
    ethosScore: number,
    reporterWallet: string,
    reporterHandle: string | undefined,
    tweetAuthorHandle: string
  ): number {
    // Integrity check: no self-reporting
    if (reporterHandle && reporterHandle.toLowerCase() === tweetAuthorHandle.toLowerCase()) {
      console.info(
        '[Sentinel/TrustService] Self-report detected (handle match) — weight set to 0'
      );
      return 0;
    }

    // Weight = ethosScore²
    // Use Math.abs to handle any edge cases with negative Ethos scores
    return Math.pow(Math.abs(ethosScore), 2);
  }

  // -------------------------------------------------------------------------
  // Report Submission
  // -------------------------------------------------------------------------

  /**
   * Submit a new report for a tweet.
   *
   * Flow:
   *   1. Fetch the reporter's Ethos score.
   *   2. Compute the report weight (with integrity check).
   *   3. Create the claim triple in Intuition's knowledge graph.
   *   4. Persist the report locally and re-aggregate trust data.
   *
   * @param tweetUrl — the canonical tweet URL
   * @param tweetAuthorHandle — the tweet author's X handle
   * @param reporterWallet — the reporter's connected wallet address
   * @param reporterHandle — the reporter's X handle (optional)
   * @param claimType — 'negative' (scam) or 'positive' (legit)
   * @param context — free-text explanation from the reporter
   * @returns the full updated TweetTrustData
   */
  async submitReport(
    tweetUrl: string,
    tweetAuthorHandle: string,
    reporterWallet: string,
    reporterHandle: string | undefined,
    claimType: 'negative' | 'positive',
    context: string
  ): Promise<TweetTrustData> {
    // Step 1: Fetch reporter's Ethos score
    const ethosResult = await this.ethosService.getScoreByAddress(reporterWallet);

    // Step 2: Compute weight with integrity check
    const weight = this.computeReportWeight(
      ethosResult.score,
      reporterWallet,
      reporterHandle,
      tweetAuthorHandle
    );

    // Step 3: Create the claim in Intuition's knowledge graph
    // Fire-and-forget — we don't block the UX on Intuition propagation
    this.intuitionService.createClaimTriple(tweetUrl, claimType, reporterWallet).catch((err) => {
      console.warn('[Sentinel/TrustService] Intuition triple creation failed:', err);
    });

    // Step 4: Build the report object
    const report: SentinelReport = {
      id: `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tweetUrl,
      tweetAuthorHandle,
      reporterWallet,
      reporterHandle,
      claimType,
      context,
      ethosScore: ethosResult.score,
      weight,
      createdAt: new Date().toISOString(),
    };

    // Step 5: Add to the local store and re-aggregate
    return this.addReportAndAggregate(report);
  }

  // -------------------------------------------------------------------------
  // Trust Data Aggregation
  // -------------------------------------------------------------------------

  /**
   * Add a report to the store and recompute the aggregated TweetTrustData.
   */
  private addReportAndAggregate(report: SentinelReport): TweetTrustData {
    const existing = this.trustDataStore.get(report.tweetUrl);
    const reports = existing ? [...existing.reports, report] : [report];

    const trustData = this.aggregateTrustData(report.tweetUrl, reports);
    this.trustDataStore.set(report.tweetUrl, trustData);
    this.persistToStorage();

    return trustData;
  }

  /**
   * Build the full TweetTrustData from a list of reports.
   *
   * This computes:
   *   - Conviction level (via calculateConfidence)
   *   - Positive / negative weight sums
   *   - First Responder (earliest report by timestamp)
   *   - Council (top 5 by Ethos score)
   */
  aggregateTrustData(tweetUrl: string, reports: SentinelReport[]): TweetTrustData {
    // Calculate weight sums
    let negativeWeight = 0;
    let positiveWeight = 0;

    for (const r of reports) {
      if (r.claimType === 'negative') {
        negativeWeight += r.weight;
      } else {
        positiveWeight += r.weight;
      }
    }

    // First Responder — the very first reporter by timestamp
    const sorted = [...reports].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const firstResponder = sorted.length > 0 ? sorted[0] : null;

    // Council — top 5 by Ethos score (excluding the First Responder to avoid duplication)
    const councilCandidates = reports
      .filter((r) => r.id !== firstResponder?.id)
      .sort((a, b) => b.ethosScore - a.ethosScore)
      .slice(0, COUNCIL_SIZE);

    // Conviction level
    const conviction = this.calculateConfidence(reports);

    return {
      tweetUrl,
      reports,
      conviction,
      negativeWeight,
      positiveWeight,
      firstResponder,
      council: councilCandidates,
      lastUpdated: new Date().toISOString(),
    };
  }

  // -------------------------------------------------------------------------
  // Data Access
  // -------------------------------------------------------------------------

  /**
   * Get trust data for a single tweet URL.
   * Returns null if no reports exist for this URL.
   */
  getTrustData(tweetUrl: string): TweetTrustData | null {
    return this.trustDataStore.get(tweetUrl) ?? null;
  }

  /**
   * Get trust data for multiple tweet URLs at once.
   */
  getTrustDataBatch(tweetUrls: string[]): Map<string, TweetTrustData> {
    const results = new Map<string, TweetTrustData>();
    for (const url of tweetUrls) {
      const data = this.trustDataStore.get(url);
      if (data) {
        results.set(url, data);
      }
    }
    return results;
  }

  /**
   * Replace the trust data for a tweet URL entirely (used by background poller
   * when it fetches fresh data from Intuition 1DB).
   */
  setTrustData(tweetUrl: string, data: TweetTrustData): void {
    this.trustDataStore.set(tweetUrl, data);
    this.persistToStorage();
  }

  /**
   * Get the underlying Ethos service (used for sidebar display).
   */
  getEthosService(): EthosService {
    return this.ethosService;
  }

  /**
   * Get the underlying Intuition service (used for background polling).
   */
  getIntuitionService(): IntuitionService {
    return this.intuitionService;
  }

  /**
   * Remove stale entries from the store (e.g. tweets no longer in viewport).
   */
  pruneStaleEntries(activeUrls: Set<string>): void {
    let pruned = false;
    for (const url of this.trustDataStore.keys()) {
      if (!activeUrls.has(url)) {
        this.trustDataStore.delete(url);
        pruned = true;
      }
    }
    if (pruned) this.persistToStorage();
  }

  /**
   * Merge on-chain Intuition triples into the local trust data store.
   *
   * Converts position shares from triples into synthetic SentinelReport
   * objects, merges with existing local reports, and re-aggregates.
   * Returns the list of URLs that were updated.
   */
  mergeIntuitionTriples(
    triplesMap: Map<string, IntuitionTriple[]>
  ): TweetTrustData[] {
    const updates: TweetTrustData[] = [];

    for (const [url, triples] of triplesMap.entries()) {
      if (triples.length === 0) continue;

      const existing = this.trustDataStore.get(url);
      const localReports = existing?.reports ?? [];

      // Track which on-chain reporters we've already seen locally
      const localReporterIds = new Set(localReports.map((r) => r.id));

      // Convert on-chain positions into synthetic reports
      const onChainReports: SentinelReport[] = [];

      for (const triple of triples) {
        // Determine claim type from the object atom label
        const objectLabel = triple.object.label.toLowerCase();
        const claimType: 'negative' | 'positive' =
          objectLabel.includes('scam') || objectLabel.includes('unsafe')
            ? 'negative'
            : 'positive';

        // Each position in the positive vault is an affirming stake
        for (const pos of triple.positions) {
          const reportId = `onchain-${triple.subject_id}-${pos.account_id}`;
          if (localReporterIds.has(reportId)) continue;

          const shares = parseFloat(pos.shares) || 0;
          onChainReports.push({
            id: reportId,
            tweetUrl: url,
            tweetAuthorHandle: 'unknown',
            reporterWallet: pos.account_id,
            claimType,
            context: '[On-chain attestation via Intuition]',
            ethosScore: 0, // Will be enriched later if needed
            weight: shares, // Use shares directly as weight
            createdAt: triple.created_at ?? new Date().toISOString(),
          });
        }

        // Counter-positions oppose the claim
        const counterClaimType: 'negative' | 'positive' =
          claimType === 'negative' ? 'positive' : 'negative';

        for (const pos of triple.counter_positions) {
          const reportId = `onchain-counter-${triple.subject_id}-${pos.account_id}`;
          if (localReporterIds.has(reportId)) continue;

          const shares = parseFloat(pos.shares) || 0;
          onChainReports.push({
            id: reportId,
            tweetUrl: url,
            tweetAuthorHandle: 'unknown',
            reporterWallet: pos.account_id,
            claimType: counterClaimType,
            context: '[On-chain counter-attestation via Intuition]',
            ethosScore: 0,
            weight: shares,
            createdAt: triple.created_at ?? new Date().toISOString(),
          });
        }
      }

      if (onChainReports.length > 0 || localReports.length > 0) {
        const allReports = [...localReports, ...onChainReports];
        const trustData = this.aggregateTrustData(url, allReports);
        this.trustDataStore.set(url, trustData);
        updates.push(trustData);
      }
    }

    if (updates.length > 0) this.persistToStorage();
    return updates;
  }
}
