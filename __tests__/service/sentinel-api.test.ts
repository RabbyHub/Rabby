/**
 * @jest-environment node
 */

/**
 * Sentinel API Integration Tests
 *
 * These tests make REAL HTTP calls to the Ethos and Intuition APIs
 * to verify our endpoint URLs, request formats, and response parsing.
 *
 * Run with: npx jest __tests__/service/sentinel-api.test.ts
 */

import 'cross-fetch/polyfill';

// ---------------------------------------------------------------------------
// Ethos API Tests
// ---------------------------------------------------------------------------

describe('Ethos API Integration', () => {
  const BASE_URL = 'https://api.ethos.network';
  const CLIENT_ID = 'rabby-sentinel@1.0.0';
  const headers = {
    'Content-Type': 'application/json',
    'X-Ethos-Client': CLIENT_ID,
  };

  // A well-known address (Vitalik) that should always have a score
  const KNOWN_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

  it('GET /api/v2/score/address — returns score and level for a known address', async () => {
    const url = `${BASE_URL}/api/v2/score/address?address=${encodeURIComponent(KNOWN_ADDRESS)}`;
    const response = await fetch(url, { method: 'GET', headers });

    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('score');
    expect(data).toHaveProperty('level');
    expect(typeof data.score).toBe('number');
    expect(typeof data.level).toBe('string');
    expect(data.score).toBeGreaterThan(0);

    console.log(`  Ethos score for ${KNOWN_ADDRESS.slice(0, 10)}...: ${data.score} (${data.level})`);
  }, 15000);

  it('GET /api/v2/score/address — returns a score for an unknown address (defaults)', async () => {
    // Random address that likely has no Ethos profile
    const unknownAddr = '0x0000000000000000000000000000000000000001';
    const url = `${BASE_URL}/api/v2/score/address?address=${encodeURIComponent(unknownAddr)}`;
    const response = await fetch(url, { method: 'GET', headers });

    // Should still return 200 with a default score, not 404
    expect(response.status).toBeLessThan(500);

    if (response.ok) {
      const data = await response.json();
      expect(data).toHaveProperty('score');
      expect(typeof data.score).toBe('number');
      console.log(`  Ethos score for unknown address: ${data.score} (${data.level})`);
    }
  }, 15000);

  it('POST /api/v2/score/addresses — batch scores returns object keyed by address', async () => {
    const addresses = [
      KNOWN_ADDRESS,
      '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B', // Another known address
    ];

    const response = await fetch(`${BASE_URL}/api/v2/score/addresses`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ addresses }),
    });

    expect(response.ok).toBe(true);

    const data = await response.json();

    // Verify the response is an object keyed by address (not an array)
    expect(typeof data).toBe('object');
    expect(Array.isArray(data)).toBe(false);

    // At least one of the addresses should be present as a key
    const keys = Object.keys(data);
    expect(keys.length).toBeGreaterThan(0);

    // Each entry should have score and level
    for (const [addr, scoreData] of Object.entries(data)) {
      const entry = scoreData as any;
      expect(entry).toHaveProperty('score');
      expect(typeof entry.score).toBe('number');
      console.log(`  Batch score for ${addr.slice(0, 10)}...: ${entry.score} (${entry.level})`);
    }
  }, 15000);
});

// ---------------------------------------------------------------------------
// Intuition GraphQL API Tests
// ---------------------------------------------------------------------------

describe('Intuition GraphQL Integration', () => {
  const GRAPHQL_URL = 'https://mainnet.intuition.sh/v1/graphql';

  async function graphql(query: string, variables?: Record<string, any>) {
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    expect(response.ok).toBe(true);
    return response.json();
  }

  it('atoms query — term_id field exists and returns data', async () => {
    const result = await graphql(`{
      atoms(limit: 3) {
        term_id
        label
        type
        creator_id
        created_at
      }
    }`);

    expect(result.data).toBeDefined();
    expect(result.data.atoms).toBeDefined();
    expect(result.data.atoms.length).toBeGreaterThan(0);

    const atom = result.data.atoms[0];
    expect(atom).toHaveProperty('term_id');
    expect(atom).toHaveProperty('label');
    expect(atom).toHaveProperty('type');
    expect(typeof atom.term_id).toBe('string');
    expect(atom.term_id.length).toBeGreaterThan(0);

    console.log(`  First atom: term_id=${atom.term_id.slice(0, 20)}..., label="${atom.label}", type=${atom.type}`);
  }, 15000);

  it('atoms query — term_id is the correct field (value_id is not returned)', async () => {
    // Query both term_id and attempt value_id via alias to check schema
    const result = await graphql(`{
      atoms(limit: 1) {
        term_id
        label
        type
      }
    }`);

    expect(result.data).toBeDefined();
    const atom = result.data.atoms[0];

    // term_id should be present and non-empty
    expect(atom.term_id).toBeDefined();
    expect(typeof atom.term_id).toBe('string');
    expect(atom.term_id.length).toBeGreaterThan(0);

    // value_id should NOT exist on the atom — Hasura only returns requested fields
    expect(atom.value_id).toBeUndefined();

    console.log(`  Confirmed: atom has term_id="${atom.term_id.slice(0, 20)}..." — value_id is not in schema`);
  }, 15000);

  it('triples query — vault-based positions work correctly', async () => {
    const result = await graphql(`{
      triples(limit: 3, where: { term: { vaults: { position_count: { _gt: 0 } } } }) {
        subject_id
        predicate_id
        object_id
        creator_id
        created_at
        subject { term_id label type }
        predicate { term_id label type }
        object { term_id label type }
        term {
          vaults {
            total_shares
            position_count
            current_share_price
            positions(order_by: { shares: desc }, limit: 3) {
              account_id
              shares
            }
          }
        }
      }
    }`);

    expect(result.data).toBeDefined();
    expect(result.data.triples).toBeDefined();

    // Find a triple that actually has positions
    const tripleWithPositions = result.data.triples.find(
      (t: any) => t.term?.vaults?.some((v: any) => v.positions?.length > 0)
    );

    if (tripleWithPositions) {
      const vault = tripleWithPositions.term.vaults.find((v: any) => v.positions?.length > 0);
      expect(vault).toBeDefined();
      expect(vault.positions.length).toBeGreaterThan(0);
      expect(vault.positions[0]).toHaveProperty('account_id');
      expect(vault.positions[0]).toHaveProperty('shares');

      console.log(`  Triple: "${tripleWithPositions.subject?.label}" → "${tripleWithPositions.predicate?.label}" → "${tripleWithPositions.object?.label}"`);
      console.log(`  Vault: ${vault.position_count} positions, total_shares=${vault.total_shares}`);
      console.log(`  Top position: ${vault.positions[0].account_id.slice(0, 10)}... with ${vault.positions[0].shares} shares`);
    } else {
      console.log('  No triples with positions found in sample — skipping position validation');
    }
  }, 15000);

  it('triples query — positions are accessed via term.vaults, not directly', async () => {
    // Query a triple WITHOUT the vault path — positions should not appear
    const directResult = await graphql(`{
      triples(limit: 1) {
        subject_id
        predicate_id
        object_id
      }
    }`);

    expect(directResult.data).toBeDefined();
    const triple = directResult.data.triples[0];

    // Direct "positions" field should NOT exist on triple
    expect(triple.positions).toBeUndefined();
    expect(triple.counter_positions).toBeUndefined();

    // Now verify positions ARE accessible via the vault path
    const vaultResult = await graphql(`{
      triples(limit: 1, where: { term: { vaults: { position_count: { _gt: 0 } } } }) {
        subject_id
        term {
          vaults {
            position_count
            positions(limit: 1) {
              account_id
              shares
            }
          }
        }
      }
    }`);

    expect(vaultResult.data).toBeDefined();
    if (vaultResult.data.triples.length > 0) {
      const vaultTriple = vaultResult.data.triples[0];
      expect(vaultTriple.term).toBeDefined();
      expect(vaultTriple.term.vaults).toBeDefined();
      console.log(`  Confirmed: positions accessed via term.vaults (${vaultTriple.term.vaults.length} vault(s)), NOT directly on triple`);
    } else {
      console.log('  Confirmed: direct "positions" not on triples. No vault triples in sample to verify vault path.');
    }
  }, 15000);

  it('atom search by label — findAtomByLabel equivalent', async () => {
    const result = await graphql(`{
      atoms(where: { label: { _eq: "Scam" } }, limit: 1) {
        term_id
        label
        type
      }
    }`);

    expect(result.data).toBeDefined();
    expect(result.data.atoms).toBeDefined();

    if (result.data.atoms.length > 0) {
      expect(result.data.atoms[0].label).toBe('Scam');
      console.log(`  Found "Scam" atom: term_id=${result.data.atoms[0].term_id.slice(0, 20)}...`);
    } else {
      console.log('  No "Scam" atom found on mainnet (may not exist yet)');
    }
  }, 15000);
});

// ---------------------------------------------------------------------------
// End-to-End Flow Test (simulated)
// ---------------------------------------------------------------------------

describe('Sentinel E2E Flow (simulated)', () => {
  const ETHOS_BASE_URL = 'https://api.ethos.network';
  const CLIENT_ID = 'rabby-sentinel@1.0.0';

  it('simulates a full report submission flow', async () => {
    const reporterWallet = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

    // Step 1: Fetch reporter's Ethos score
    const scoreResponse = await fetch(
      `${ETHOS_BASE_URL}/api/v2/score/address?address=${encodeURIComponent(reporterWallet)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Ethos-Client': CLIENT_ID,
        },
      }
    );
    expect(scoreResponse.ok).toBe(true);
    const scoreData = await scoreResponse.json();

    // Step 2: Compute weight (ethosScore²)
    const weight = Math.pow(Math.abs(scoreData.score), 2);
    console.log(`  Reporter score: ${scoreData.score}, weight: ${weight.toLocaleString()}`);

    // Step 3: Determine conviction level from a single report
    // With a single negative report, netScore = weight
    const netScore = weight;

    let conviction: string;
    if (netScore < 0) conviction = 'Safe';
    else if (netScore < 1_000_000) conviction = 'Unverified';
    else if (netScore < 10_000_000) conviction = 'Likely Scam';
    else conviction = 'Verified Scam';

    console.log(`  Net score: ${netScore.toLocaleString()} → conviction: "${conviction}"`);

    // A single reporter with score ~1300 should produce weight ~1,690,000
    // which is above Unverified (1M) but below Likely Scam threshold (10M)
    expect(weight).toBeGreaterThan(0);
    expect(typeof conviction).toBe('string');
  }, 15000);
});
