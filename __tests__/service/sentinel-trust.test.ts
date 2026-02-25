/**
 * Sentinel TrustService Unit Tests
 *
 * Tests the core conviction calculation, report weighting, and
 * data aggregation logic with mock data — no API calls needed.
 *
 * Run with: npx jest __tests__/service/sentinel-trust.test.ts
 */

import type {
  SentinelReport,
  TweetTrustData,
  ConvictionLevel,
  IntuitionTriple,
  IntuitionPosition,
} from '@/sentinel/types';
import {
  THRESHOLD_SAFE,
  THRESHOLD_UNVERIFIED,
  THRESHOLD_LIKELY_SCAM,
  CONTESTED_RATIO,
  COUNCIL_SIZE,
} from '@/sentinel/constants';

// ---------------------------------------------------------------------------
// Extracted logic (mirrors TrustService methods for isolated testing)
// We test the algorithms directly without instantiating the full class,
// which would require browser.storage mocks.
// ---------------------------------------------------------------------------

function calculateConfidence(reports: SentinelReport[]): ConvictionLevel {
  if (reports.length === 0) return 'Unverified';

  let negativeWeight = 0;
  let positiveWeight = 0;

  for (const report of reports) {
    if (report.claimType === 'negative') {
      negativeWeight += report.weight;
    } else {
      positiveWeight += report.weight;
    }
  }

  const larger = Math.max(negativeWeight, positiveWeight);
  const smaller = Math.min(negativeWeight, positiveWeight);

  if (
    larger > THRESHOLD_UNVERIFIED &&
    smaller > THRESHOLD_UNVERIFIED &&
    smaller / larger >= CONTESTED_RATIO
  ) {
    return 'Contested Content';
  }

  const netScore = negativeWeight - positiveWeight;

  if (netScore < THRESHOLD_SAFE) return 'Safe';
  if (netScore < THRESHOLD_UNVERIFIED) return 'Unverified';
  if (netScore < THRESHOLD_LIKELY_SCAM) return 'Likely Scam';
  return 'Verified Scam';
}

function computeReportWeight(
  ethosScore: number,
  reporterHandle: string | undefined,
  tweetAuthorHandle: string
): number {
  if (reporterHandle && reporterHandle.toLowerCase() === tweetAuthorHandle.toLowerCase()) {
    return 0;
  }
  return Math.pow(Math.abs(ethosScore), 2);
}

function makeReport(overrides: Partial<SentinelReport> = {}): SentinelReport {
  return {
    id: `test-${Math.random().toString(36).slice(2)}`,
    tweetUrl: 'https://x.com/test/status/123',
    tweetAuthorHandle: '@target',
    reporterWallet: '0xReporter',
    claimType: 'negative',
    context: 'test report',
    ethosScore: 1000,
    weight: 1000000, // 1000²
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// calculateConfidence Tests
// ---------------------------------------------------------------------------

describe('calculateConfidence', () => {
  it('returns "Unverified" for empty reports', () => {
    expect(calculateConfidence([])).toBe('Unverified');
  });

  it('returns "Safe" when positive weight exceeds negative', () => {
    const reports = [
      makeReport({ claimType: 'positive', weight: 2_000_000 }),
      makeReport({ claimType: 'negative', weight: 500_000 }),
    ];
    // netScore = 500K - 2M = -1.5M < 0 → Safe
    expect(calculateConfidence(reports)).toBe('Safe');
  });

  it('returns "Unverified" when net score is between 0 and 1M', () => {
    const reports = [
      makeReport({ claimType: 'negative', weight: 800_000 }),
      makeReport({ claimType: 'positive', weight: 200_000 }),
    ];
    // netScore = 800K - 200K = 600K → Unverified
    expect(calculateConfidence(reports)).toBe('Unverified');
  });

  it('returns "Likely Scam" when net score is between 1M and 10M', () => {
    const reports = [
      makeReport({ claimType: 'negative', weight: 5_000_000 }),
    ];
    // netScore = 5M → Likely Scam
    expect(calculateConfidence(reports)).toBe('Likely Scam');
  });

  it('returns "Verified Scam" when net score exceeds 10M', () => {
    const reports = [
      makeReport({ claimType: 'negative', weight: 15_000_000 }),
    ];
    // netScore = 15M → Verified Scam
    expect(calculateConfidence(reports)).toBe('Verified Scam');
  });

  it('returns "Contested Content" when both sides are strong and close', () => {
    const reports = [
      makeReport({ claimType: 'negative', weight: 3_000_000 }),
      makeReport({ claimType: 'positive', weight: 2_000_000 }),
    ];
    // larger=3M, smaller=2M, both > 1M, ratio = 2/3 = 0.67 > 0.4 → Contested
    expect(calculateConfidence(reports)).toBe('Contested Content');
  });

  it('does NOT flag as contested when ratio is below threshold', () => {
    const reports = [
      makeReport({ claimType: 'negative', weight: 5_000_000 }),
      makeReport({ claimType: 'positive', weight: 1_500_000 }),
    ];
    // larger=5M, smaller=1.5M, ratio = 1.5/5 = 0.3 < 0.4 → NOT Contested
    // netScore = 5M - 1.5M = 3.5M → Likely Scam
    expect(calculateConfidence(reports)).toBe('Likely Scam');
  });

  it('does NOT flag as contested when one side is below threshold', () => {
    const reports = [
      makeReport({ claimType: 'negative', weight: 3_000_000 }),
      makeReport({ claimType: 'positive', weight: 500_000 }),
    ];
    // smaller=500K < 1M → not contested
    // netScore = 2.5M → Likely Scam
    expect(calculateConfidence(reports)).toBe('Likely Scam');
  });

  it('handles multiple reports accumulating to Verified Scam', () => {
    // Three reporters each with score ~1800 → weight = 1800² = 3,240,000 each
    const reports = [
      makeReport({ claimType: 'negative', weight: 3_240_000 }),
      makeReport({ claimType: 'negative', weight: 3_240_000 }),
      makeReport({ claimType: 'negative', weight: 3_240_000 }),
      makeReport({ claimType: 'negative', weight: 3_240_000 }),
    ];
    // netScore = 12,960,000 → Verified Scam
    expect(calculateConfidence(reports)).toBe('Verified Scam');
  });
});

// ---------------------------------------------------------------------------
// computeReportWeight Tests
// ---------------------------------------------------------------------------

describe('computeReportWeight', () => {
  it('returns ethosScore² for a normal report', () => {
    expect(computeReportWeight(1000, '@reporter', '@target')).toBe(1_000_000);
  });

  it('returns ethosScore² for high-rep reporter', () => {
    expect(computeReportWeight(2800, '@reporter', '@target')).toBe(7_840_000);
  });

  it('returns 0 for self-reporting (handle match)', () => {
    expect(computeReportWeight(2800, '@target', '@target')).toBe(0);
  });

  it('self-report check is case-insensitive', () => {
    expect(computeReportWeight(1000, '@Target', '@target')).toBe(0);
    expect(computeReportWeight(1000, '@TARGET', '@target')).toBe(0);
  });

  it('does not flag self-report when handle is undefined', () => {
    expect(computeReportWeight(1000, undefined, '@target')).toBe(1_000_000);
  });

  it('handles zero ethosScore', () => {
    expect(computeReportWeight(0, '@reporter', '@target')).toBe(0);
  });

  it('handles negative ethosScore (uses abs)', () => {
    expect(computeReportWeight(-100, '@reporter', '@target')).toBe(10_000);
  });
});

// ---------------------------------------------------------------------------
// Ethos Score Range Analysis
// ---------------------------------------------------------------------------

describe('Ethos Score Range Analysis', () => {
  it('maps score 0 → weight 0 (no voting power)', () => {
    expect(computeReportWeight(0, undefined, '@target')).toBe(0);
  });

  it('maps score 1200 (default) → weight 1,440,000 (crosses Unverified threshold)', () => {
    const weight = computeReportWeight(1200, undefined, '@target');
    expect(weight).toBe(1_440_000);
    expect(weight).toBeGreaterThan(THRESHOLD_UNVERIFIED);
    console.log(`  Default Ethos score (1200): weight = ${weight.toLocaleString()} → crosses "Likely Scam" threshold with 1 report`);
  });

  it('maps score 2800 (max) → weight 7,840,000 (still below Verified Scam)', () => {
    const weight = computeReportWeight(2800, undefined, '@target');
    expect(weight).toBe(7_840_000);
    expect(weight).toBeLessThan(THRESHOLD_LIKELY_SCAM);
    console.log(`  Max Ethos score (2800): weight = ${weight.toLocaleString()} → "Likely Scam" but NOT "Verified Scam" alone`);
  });

  it('requires at least 2 high-score reporters for Verified Scam', () => {
    const reports = [
      makeReport({ claimType: 'negative', weight: 7_840_000 }),
      makeReport({ claimType: 'negative', weight: 7_840_000 }),
    ];
    expect(calculateConfidence(reports)).toBe('Verified Scam');
    console.log(`  Two max-score reporters: combined weight = ${(7_840_000 * 2).toLocaleString()} → "Verified Scam"`);
  });
});

// ---------------------------------------------------------------------------
// mergeIntuitionTriples Logic Tests
// ---------------------------------------------------------------------------

describe('mergeIntuitionTriples logic', () => {
  function makeTriple(overrides: Partial<IntuitionTriple> = {}): IntuitionTriple {
    return {
      subject_id: 'subject-hash',
      predicate_id: 'predicate-hash',
      object_id: 'object-hash',
      subject: { term_id: 'subject-hash', label: 'https://x.com/user/status/123', type: 'TextObject' },
      predicate: { term_id: 'predicate-hash', label: 'has tag', type: 'Keywords' },
      object: { term_id: 'object-hash', label: 'Scam', type: 'Thing' },
      creator_id: '0xCreator',
      created_at: '2025-01-01T00:00:00Z',
      positions: [],
      counter_positions: [],
      ...overrides,
    };
  }

  /**
   * Simulates TrustService.mergeIntuitionTriples() logic
   */
  function mergeTriples(
    triplesMap: Map<string, IntuitionTriple[]>,
    existingStore: Map<string, TweetTrustData> = new Map()
  ): { url: string; reports: SentinelReport[] }[] {
    const results: { url: string; reports: SentinelReport[] }[] = [];

    for (const [url, triples] of triplesMap.entries()) {
      if (triples.length === 0) continue;

      const existing = existingStore.get(url);
      const localReports = existing?.reports ?? [];
      const localReporterIds = new Set(localReports.map((r) => r.id));
      const onChainReports: SentinelReport[] = [];

      for (const triple of triples) {
        const objectLabel = triple.object.label.toLowerCase();
        const claimType: 'negative' | 'positive' =
          objectLabel.includes('scam') || objectLabel.includes('unsafe')
            ? 'negative'
            : 'positive';

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
            ethosScore: 0,
            weight: shares,
            createdAt: triple.created_at ?? new Date().toISOString(),
          });
        }

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

      const allReports = [...localReports, ...onChainReports];
      if (allReports.length > 0) {
        results.push({ url, reports: allReports });
      }
    }

    return results;
  }

  it('converts positions into negative reports for "Scam" triples', () => {
    const triplesMap = new Map<string, IntuitionTriple[]>();
    triplesMap.set('https://x.com/user/status/123', [
      makeTriple({
        object: { term_id: 'obj', label: 'Scam', type: 'Thing' },
        positions: [
          { account_id: '0xStaker1', shares: '5000000' },
          { account_id: '0xStaker2', shares: '3000000' },
        ],
      }),
    ]);

    const results = mergeTriples(triplesMap);
    expect(results.length).toBe(1);
    expect(results[0].reports.length).toBe(2);
    expect(results[0].reports[0].claimType).toBe('negative');
    expect(results[0].reports[0].weight).toBe(5000000);
    expect(results[0].reports[1].claimType).toBe('negative');
    expect(results[0].reports[1].weight).toBe(3000000);
  });

  it('converts positions into positive reports for "trustworthy" triples', () => {
    const triplesMap = new Map<string, IntuitionTriple[]>();
    triplesMap.set('https://x.com/user/status/456', [
      makeTriple({
        object: { term_id: 'obj', label: 'trustworthy', type: 'Thing' },
        positions: [
          { account_id: '0xStaker1', shares: '2000000' },
        ],
      }),
    ]);

    const results = mergeTriples(triplesMap);
    expect(results[0].reports[0].claimType).toBe('positive');
    expect(results[0].reports[0].weight).toBe(2000000);
  });

  it('counter-positions get the opposite claim type', () => {
    const triplesMap = new Map<string, IntuitionTriple[]>();
    triplesMap.set('https://x.com/user/status/789', [
      makeTriple({
        object: { term_id: 'obj', label: 'Scam', type: 'Thing' },
        positions: [
          { account_id: '0xStaker1', shares: '5000000' },
        ],
        counter_positions: [
          { account_id: '0xCounterStaker', shares: '3000000' },
        ],
      }),
    ]);

    const results = mergeTriples(triplesMap);
    expect(results[0].reports.length).toBe(2);

    const negReport = results[0].reports.find(r => r.claimType === 'negative');
    const posReport = results[0].reports.find(r => r.claimType === 'positive');

    expect(negReport).toBeDefined();
    expect(posReport).toBeDefined();
    expect(negReport!.weight).toBe(5000000);
    expect(posReport!.weight).toBe(3000000);
  });

  it('deduplicates against existing local reports', () => {
    const existingStore = new Map<string, TweetTrustData>();
    existingStore.set('https://x.com/user/status/123', {
      tweetUrl: 'https://x.com/user/status/123',
      reports: [
        makeReport({ id: 'onchain-subject-hash-0xStaker1' }), // Already tracked
      ],
      conviction: 'Likely Scam',
      negativeWeight: 1000000,
      positiveWeight: 0,
      firstResponder: null,
      council: [],
      lastUpdated: new Date().toISOString(),
    });

    const triplesMap = new Map<string, IntuitionTriple[]>();
    triplesMap.set('https://x.com/user/status/123', [
      makeTriple({
        positions: [
          { account_id: '0xStaker1', shares: '5000000' }, // Duplicate
          { account_id: '0xStaker2', shares: '3000000' }, // New
        ],
      }),
    ]);

    const results = mergeTriples(triplesMap, existingStore);
    // Should have 2 reports: 1 existing + 1 new (Staker1 is deduped)
    expect(results[0].reports.length).toBe(2);

    const ids = results[0].reports.map(r => r.id);
    expect(ids).toContain('onchain-subject-hash-0xStaker1'); // existing
    expect(ids).toContain('onchain-subject-hash-0xStaker2'); // new
  });

  it('skips empty triples arrays', () => {
    const triplesMap = new Map<string, IntuitionTriple[]>();
    triplesMap.set('https://x.com/user/status/empty', []);

    const results = mergeTriples(triplesMap);
    expect(results.length).toBe(0);
  });

  it('"unsafe" label is treated as negative', () => {
    const triplesMap = new Map<string, IntuitionTriple[]>();
    triplesMap.set('https://x.com/user/status/unsafe', [
      makeTriple({
        object: { term_id: 'obj', label: 'unsafe link', type: 'Thing' },
        positions: [{ account_id: '0xStaker', shares: '1000000' }],
      }),
    ]);

    const results = mergeTriples(triplesMap);
    expect(results[0].reports[0].claimType).toBe('negative');
  });
});

// ---------------------------------------------------------------------------
// Aggregation Tests (Council & First Responder)
// ---------------------------------------------------------------------------

describe('Trust Data Aggregation', () => {
  function aggregateTrustData(tweetUrl: string, reports: SentinelReport[]): TweetTrustData {
    let negativeWeight = 0;
    let positiveWeight = 0;

    for (const r of reports) {
      if (r.claimType === 'negative') negativeWeight += r.weight;
      else positiveWeight += r.weight;
    }

    const sorted = [...reports].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const firstResponder = sorted.length > 0 ? sorted[0] : null;

    const councilCandidates = reports
      .filter((r) => r.id !== firstResponder?.id)
      .sort((a, b) => b.ethosScore - a.ethosScore)
      .slice(0, COUNCIL_SIZE);

    const conviction = calculateConfidence(reports);

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

  it('identifies the first responder by earliest timestamp', () => {
    const reports = [
      makeReport({ id: 'r1', createdAt: '2025-01-03T00:00:00Z', ethosScore: 2000 }),
      makeReport({ id: 'r2', createdAt: '2025-01-01T00:00:00Z', ethosScore: 500 }),
      makeReport({ id: 'r3', createdAt: '2025-01-02T00:00:00Z', ethosScore: 1500 }),
    ];

    const data = aggregateTrustData('https://x.com/test/status/1', reports);
    expect(data.firstResponder?.id).toBe('r2'); // Earliest timestamp
  });

  it('builds council from top ethosScore reporters (excluding first responder)', () => {
    const reports = [
      makeReport({ id: 'r1', createdAt: '2025-01-01T00:00:00Z', ethosScore: 100 }), // First responder
      makeReport({ id: 'r2', createdAt: '2025-01-02T00:00:00Z', ethosScore: 2800 }),
      makeReport({ id: 'r3', createdAt: '2025-01-03T00:00:00Z', ethosScore: 2500 }),
      makeReport({ id: 'r4', createdAt: '2025-01-04T00:00:00Z', ethosScore: 2000 }),
      makeReport({ id: 'r5', createdAt: '2025-01-05T00:00:00Z', ethosScore: 1800 }),
      makeReport({ id: 'r6', createdAt: '2025-01-06T00:00:00Z', ethosScore: 1500 }),
      makeReport({ id: 'r7', createdAt: '2025-01-07T00:00:00Z', ethosScore: 1200 }),
    ];

    const data = aggregateTrustData('https://x.com/test/status/2', reports);

    expect(data.firstResponder?.id).toBe('r1');
    expect(data.council.length).toBe(COUNCIL_SIZE); // Should be 5
    expect(data.council[0].id).toBe('r2'); // Highest ethosScore
    expect(data.council[1].id).toBe('r3');
    // First responder (r1) should NOT be in the council
    expect(data.council.find(c => c.id === 'r1')).toBeUndefined();
  });

  it('computes correct weight sums', () => {
    const reports = [
      makeReport({ claimType: 'negative', weight: 3_000_000 }),
      makeReport({ claimType: 'negative', weight: 2_000_000 }),
      makeReport({ claimType: 'positive', weight: 1_000_000 }),
    ];

    const data = aggregateTrustData('https://x.com/test/status/3', reports);
    expect(data.negativeWeight).toBe(5_000_000);
    expect(data.positiveWeight).toBe(1_000_000);
    expect(data.conviction).toBe('Likely Scam'); // netScore = 4M
  });
});
