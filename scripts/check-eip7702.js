#!/usr/bin/env node

const AUTHORITY = '0x7701000000000000000000000000000000000001';
const DELEGATE = '0x7702000000000000000000000000000000000002';
const WRAPPER = '0x7703000000000000000000000000000000000003';

const RETURN_42_CODE = '0x602a60005260206000f3';
const DELEGATION_CODE = `0xef0100${DELEGATE.slice(2)}`;
// STATICCALL AUTHORITY and return its 32-byte output; a failed subcall returns zero.
const WRAPPER_CODE = `0x602060006000600073${AUTHORITY.slice(
  2
)}5afa5060206000f3`;
const WORD_42 = `0x${'0'.repeat(62)}2a`;
const WORD_ZERO = `0x${'0'.repeat(64)}`;
const CALL_GAS = '0xf4240';
const RPC_TIMEOUT_MS = 15_000;

const baselineOverrides = {
  [WRAPPER]: { code: WRAPPER_CODE },
  [AUTHORITY]: { code: RETURN_42_CODE },
};

const delegationOverrides = {
  [WRAPPER]: { code: WRAPPER_CODE },
  [AUTHORITY]: { code: DELEGATION_CODE },
  [DELEGATE]: { code: RETURN_42_CODE },
};

function shortError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/\s+/g, ' ').slice(0, 240);
}

function toDecimalQuantity(value, name) {
  if (typeof value !== 'string' || !/^0x[0-9a-f]+$/i.test(value)) {
    throw new Error(`Invalid ${name} returned by RPC`);
  }

  return BigInt(value).toString();
}

function createRpcClient(rpcUrl) {
  let id = 0;

  return async (method, params) => {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }),
      signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error('RPC returned invalid JSON');
    }

    if (payload?.error) {
      throw new Error(
        `RPC ${payload.error.code ?? 'error'}: ${
          payload.error.message || 'unknown error'
        }`
      );
    }
    if (!Object.prototype.hasOwnProperty.call(payload || {}, 'result')) {
      throw new Error('RPC response has no result');
    }

    return payload.result;
  };
}

async function detectEip7702(rpc) {
  let chainIdHex;
  let blockTag;

  try {
    chainIdHex = await rpc('eth_chainId', []);
    blockTag = await rpc('eth_blockNumber', []);
  } catch (error) {
    return { status: 'unknown', reason: shortError(error) };
  }

  let context;
  try {
    context = {
      scope: 'rpc_execution',
      chainId: toDecimalQuantity(chainIdHex, 'chain id'),
      blockNumber: toDecimalQuantity(blockTag, 'block number'),
    };
  } catch (error) {
    return { status: 'unknown', reason: shortError(error) };
  }

  let baseline;
  try {
    baseline = await rpc('eth_call', [
      { to: WRAPPER, data: '0x', gas: CALL_GAS },
      blockTag,
      baselineOverrides,
    ]);
  } catch (error) {
    return {
      status: 'unknown',
      ...context,
      reason: `State override unavailable: ${shortError(error)}`,
    };
  }

  if (typeof baseline !== 'string' || baseline.toLowerCase() !== WORD_42) {
    return {
      status: 'unknown',
      ...context,
      reason: 'RPC ignored or incorrectly applied state override',
    };
  }

  let result;
  try {
    result = await rpc('eth_call', [
      { to: WRAPPER, data: '0x', gas: CALL_GAS },
      blockTag,
      delegationOverrides,
    ]);
  } catch (error) {
    return {
      status: 'unknown',
      ...context,
      reason: `Delegation probe failed: ${shortError(error)}`,
    };
  }

  const normalizedResult =
    typeof result === 'string' ? result.toLowerCase() : undefined;
  if (normalizedResult === WORD_42) {
    return {
      status: 'supported',
      ...context,
      evidence: 'RPC executed an EIP-7702 delegation designator',
    };
  }
  if (normalizedResult === WORD_ZERO) {
    return {
      status: 'unsupported',
      ...context,
      evidence: 'RPC executed the delegation designator as ordinary code',
    };
  }

  return {
    status: 'unknown',
    ...context,
    reason: 'Delegation probe returned an unexpected value',
  };
}

function parseRpcUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('RPC URL is invalid');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('RPC URL must use http or https');
  }

  return url.href;
}

function printUsage() {
  console.error(
    'Usage: RPC_URL=<http-rpc-url> node scripts/check-eip7702.js\n' +
      '   or: node scripts/check-eip7702.js <http-rpc-url>\n\n' +
      'Exit codes: 0=supported, 1=unsupported, 2=unknown, 64=bad usage'
  );
}

async function main() {
  if (process.argv[2] === '--help' || process.argv[2] === '-h') {
    printUsage();
    return;
  }

  const input = process.argv[2] || process.env.RPC_URL;
  if (!input) {
    printUsage();
    process.exitCode = 64;
    return;
  }

  let rpcUrl;
  try {
    rpcUrl = parseRpcUrl(input);
  } catch (error) {
    console.error(shortError(error));
    process.exitCode = 64;
    return;
  }

  const result = await detectEip7702(createRpcClient(rpcUrl));
  console.log(JSON.stringify(result));
  process.exitCode =
    result.status === 'supported' ? 0 : result.status === 'unsupported' ? 1 : 2;
}

if (require.main === module) {
  main();
}

module.exports = { createRpcClient, detectEip7702 };
