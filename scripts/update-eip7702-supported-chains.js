#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const { createRpcClient, detectEip7702 } = require('./check-eip7702');

const CHAIN_RPC_URL = 'https://api.rabby.io/v1/chainrpc';
const SUPPORTED_CHAINS_URL = 'https://static.debank.com/supported_chains.json';
const ROOT = path.resolve(__dirname, '..');
const TARGET_FILE = path.join(ROOT, 'src/constant/eip7702.ts');
const DEFAULT_CHAINS_FILE = path.join(
  ROOT,
  'src/constant/default-support-chains.json'
);
const PROBE_CONCURRENCY = 8;
const HTTP_TIMEOUT_MS = 15_000;

function parseChainRpcPayload(payload) {
  if (payload?.status !== 'ok' || !Array.isArray(payload.rpcs)) {
    throw new Error('Invalid chainrpc response');
  }

  const chains = new Map();
  let skippedEntries = 0;

  for (const item of payload.rpcs) {
    if (!item || !/^[a-z0-9]+$/.test(item.chainId || '')) {
      skippedEntries += 1;
      continue;
    }

    const urls = (Array.isArray(item.rpcUrl) ? item.rpcUrl : []).filter(
      (value) => {
        if (typeof value !== 'string') return false;
        try {
          return new URL(value).protocol === 'https:';
        } catch {
          return false;
        }
      }
    );

    if (!urls.length) {
      skippedEntries += 1;
      continue;
    }

    const existing = chains.get(item.chainId) || [];
    chains.set(item.chainId, [...new Set([...existing, ...urls])]);
  }
  if (!chains.size) throw new Error('chainrpc response has no usable RPCs');

  return {
    chains: [...chains].map(([serverId, rpcUrls]) => ({ serverId, rpcUrls })),
    skippedEntries,
  };
}

function parseSupportedChains(payload) {
  if (!Array.isArray(payload)) {
    throw new Error('Invalid supported chains response');
  }

  const chains = new Map();
  for (const chain of payload) {
    const chainId = String(chain?.community_id);
    if (
      !chain ||
      chain.is_disabled ||
      typeof chain.id !== 'string' ||
      !/^[a-z0-9]+$/.test(chain.id) ||
      !/^[1-9][0-9]*$/.test(chainId)
    ) {
      continue;
    }

    const existing = chains.get(chain.id);
    if (existing && existing !== chainId) {
      throw new Error(`Conflicting chain id for ${chain.id}`);
    }
    chains.set(chain.id, chainId);
  }
  if (!chains.size) throw new Error('Supported chains response is empty');

  return chains;
}

function parseWhitelist(source) {
  const listPattern = /export const EIP7702_REVOKE_CHAIN_CANDIDATES = \[\n([\s\S]*?)\n\] as CHAINS_ENUM\[\];/;
  const match = listPattern.exec(source);
  if (!match) throw new Error('EIP-7702 whitelist was not found');

  const entryPattern = /CHAINS_ENUM\.([A-Z][A-Z0-9_]*)|'([A-Z][A-Z0-9_]*)'\s+as\s+CHAINS_ENUM/g;
  const enums = [...match[1].matchAll(entryPattern)].map(
    (entry) => entry[1] || entry[2]
  );
  const unparsed = match[1].replace(entryPattern, '').replace(/[\s,]/g, '');

  if (!enums.length || unparsed) {
    throw new Error('EIP-7702 whitelist has an unsupported format');
  }

  return {
    enums,
    insertionIndex: match.index + match[0].lastIndexOf('\n]'),
  };
}

function appendSupportedEnums(source, enumNames) {
  const whitelist = parseWhitelist(source);
  const existing = new Set(whitelist.enums);
  const added = [];

  for (const enumName of enumNames) {
    if (!/^[A-Z][A-Z0-9_]*$/.test(enumName)) {
      throw new Error(`Invalid chain enum: ${enumName}`);
    }
    if (!existing.has(enumName)) {
      existing.add(enumName);
      added.push(enumName);
    }
  }

  if (!added.length) return { source, added };

  const lines = added
    .map((enumName) => `  '${enumName}' as CHAINS_ENUM,`)
    .join('\n');

  return {
    source:
      source.slice(0, whitelist.insertionIndex) +
      `\n${lines}` +
      source.slice(whitelist.insertionIndex),
    added,
  };
}

function classifyChain(results, expectedChainId) {
  if (!expectedChainId) return 'unknown';

  const conclusive = results.filter(
    (result) => result.status === 'supported' || result.status === 'unsupported'
  );
  const chainIds = new Set(conclusive.map((result) => result.chainId));

  if (
    (expectedChainId &&
      conclusive.some((result) => result.chainId !== expectedChainId)) ||
    chainIds.size > 1
  ) {
    return 'unknown';
  }

  const supported = results.some((result) => result.status === 'supported');
  const unsupported = results.some((result) => result.status === 'unsupported');

  if (supported && unsupported) return 'unknown';
  if (supported) return 'supported';
  if (
    results.length &&
    results.every((result) => result.status === 'unsupported')
  ) {
    return 'unsupported';
  }
  return 'unknown';
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await fn(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  );
  return results;
}

async function loadChainMaps() {
  const { CHAINS_RAW } = await import('@debank/common/dist/chain-data');
  const defaultChains = JSON.parse(
    fs.readFileSync(DEFAULT_CHAINS_FILE, 'utf8')
  );
  const serverIdToEnum = new Map();
  const enumToServerId = new Map();
  const expectedChainIds = new Map();

  for (const chain of Object.values(CHAINS_RAW)) {
    serverIdToEnum.set(chain.serverId, chain.enum);
    enumToServerId.set(chain.enum, chain.serverId);
    expectedChainIds.set(chain.serverId, String(chain.id));
  }
  for (const chain of defaultChains) {
    expectedChainIds.set(chain.id, String(chain.community_id));
  }

  return { serverIdToEnum, enumToServerId, expectedChainIds };
}

async function fetchJson(url, name) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${name} HTTP ${response.status}`);

  try {
    return await response.json();
  } catch {
    throw new Error(`${name} returned invalid JSON`);
  }
}

async function probeCandidates(candidates, expectedChainIds) {
  const endpoints = candidates.flatMap((chain) =>
    chain.rpcUrls.map((rpcUrl) => ({ serverId: chain.serverId, rpcUrl }))
  );
  const endpointResults = await mapLimit(
    endpoints,
    PROBE_CONCURRENCY,
    async ({ serverId, rpcUrl }) => {
      try {
        const result = await detectEip7702(createRpcClient(rpcUrl));
        return { serverId, status: result.status, chainId: result.chainId };
      } catch {
        return { serverId, status: 'unknown' };
      }
    }
  );

  return candidates.map((candidate) => {
    const results = endpointResults.filter(
      (result) => result.serverId === candidate.serverId
    );
    return {
      serverId: candidate.serverId,
      status: classifyChain(results, expectedChainIds.get(candidate.serverId)),
    };
  });
}

function writeGitHubOutput(values) {
  if (!process.env.GITHUB_OUTPUT) return;
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    Object.entries(values)
      .map(([key, value]) => `${key}=${value}\n`)
      .join('')
  );
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const unknownArgs = process.argv
    .slice(2)
    .filter((arg) => arg !== '--dry-run');
  if (unknownArgs.length) {
    console.error(
      'Usage: node scripts/update-eip7702-supported-chains.js [--dry-run]'
    );
    process.exitCode = 64;
    return;
  }

  const source = fs.readFileSync(TARGET_FILE, 'utf8');
  const whitelist = parseWhitelist(source);
  const {
    serverIdToEnum,
    enumToServerId,
    expectedChainIds,
  } = await loadChainMaps();
  const currentServerIds = new Set(
    whitelist.enums.map(
      (enumName) => enumToServerId.get(enumName) || enumName.toLowerCase()
    )
  );

  const [chainRpcPayload, supportedChainsPayload] = await Promise.all([
    fetchJson(CHAIN_RPC_URL, 'chainrpc'),
    fetchJson(SUPPORTED_CHAINS_URL, 'supported chains'),
  ]);
  const parsed = parseChainRpcPayload(chainRpcPayload);
  const supportedChains = parseSupportedChains(supportedChainsPayload);
  for (const [serverId, chainId] of supportedChains) {
    expectedChainIds.set(serverId, chainId);
  }
  const candidates = parsed.chains.filter(
    (chain) =>
      supportedChains.has(chain.serverId) &&
      !currentServerIds.has(chain.serverId)
  );
  const results = await probeCandidates(candidates, expectedChainIds);
  const supported = results
    .filter((result) => result.status === 'supported')
    .sort((a, b) => a.serverId.localeCompare(b.serverId));
  const enumNames = supported.map(
    ({ serverId }) => serverIdToEnum.get(serverId) || serverId.toUpperCase()
  );
  const updated = appendSupportedEnums(source, enumNames);

  if (updated.added.length && !dryRun) {
    fs.writeFileSync(TARGET_FILE, updated.source);
  }

  const count = (status) =>
    results.filter((result) => result.status === status).length;
  console.log(`Checked ${candidates.length} candidate chains.`);
  console.log(
    `Supported: ${count('supported')}; unsupported: ${count(
      'unsupported'
    )}; unknown: ${count('unknown')}.`
  );
  console.log(
    `New supported chains: ${
      supported.length
        ? supported.map(({ serverId }) => serverId).join(', ')
        : 'none'
    }.`
  );
  if (parsed.skippedEntries) {
    console.log(
      `Skipped malformed chainrpc entries: ${parsed.skippedEntries}.`
    );
  }
  if (dryRun) console.log('Dry run: whitelist was not changed.');

  writeGitHubOutput({
    changed: updated.added.length && !dryRun ? 'true' : 'false',
    added_chains:
      supported.map(({ serverId }) => serverId).join(', ') || 'none',
  });
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

module.exports = {
  appendSupportedEnums,
  classifyChain,
  parseChainRpcPayload,
  parseSupportedChains,
};
