const assert = require('node:assert/strict');
const test = require('node:test');

const { detectEip7702 } = require('./check-eip7702');
const {
  appendSupportedEnums,
  classifyChain,
  parseChainRpcPayload,
  parseSupportedChains,
} = require('./update-eip7702-supported-chains');

const WORD_42 = `0x${'0'.repeat(62)}2a`;
const WORD_ZERO = `0x${'0'.repeat(64)}`;

function mockRpc(baseline, probe) {
  const calls = [];

  return {
    calls,
    rpc: async (method, params) => {
      calls.push({ method, params });
      if (method === 'eth_chainId') return '0x1';
      if (method === 'eth_blockNumber') return '0x123';
      if (method !== 'eth_call') throw new Error(`Unexpected ${method}`);

      const value = calls.filter((call) => call.method === 'eth_call').length;
      const response = value === 1 ? baseline : probe;
      if (response instanceof Error) throw response;
      return response;
    },
  };
}

test('detects EIP-7702 execution semantics without sending a transaction', async () => {
  const cases = [
    [WORD_42, WORD_42, 'supported'],
    [WORD_42, WORD_ZERO, 'unsupported'],
    ['0x', WORD_42, 'unknown'],
    [new Error('override unavailable'), WORD_42, 'unknown'],
    [WORD_42, new Error('probe unavailable'), 'unknown'],
    [WORD_42, '0x01', 'unknown'],
  ];

  for (const [baseline, probe, status] of cases) {
    const mocked = mockRpc(baseline, probe);
    const result = await detectEip7702(mocked.rpc);

    assert.equal(result.status, status);
    assert.equal(
      mocked.calls.some((call) => call.method === 'eth_sendRawTransaction'),
      false
    );
    for (const call of mocked.calls.filter(
      (item) => item.method === 'eth_call'
    )) {
      assert.equal(call.params[1], '0x123');
      assert.equal(call.params[0].gas, '0xf4240');
    }
  }
});

test('updates the whitelist only from conclusive chain results', () => {
  assert.equal(
    classifyChain([{ status: 'supported', chainId: '1' }], '1'),
    'supported'
  );
  assert.equal(
    classifyChain(
      [
        { status: 'supported', chainId: '1' },
        { status: 'unsupported', chainId: '1' },
      ],
      '1'
    ),
    'unknown'
  );
  assert.equal(
    classifyChain(
      [
        { status: 'unsupported', chainId: '250' },
        { status: 'unknown', chainId: '250' },
      ],
      '250'
    ),
    'unknown'
  );
  assert.equal(
    classifyChain([{ status: 'supported', chainId: '10' }], '1'),
    'unknown'
  );
  assert.equal(
    classifyChain([{ status: 'supported', chainId: '1' }]),
    'unknown'
  );

  const parsed = parseChainRpcPayload({
    status: 'ok',
    rpcs: [
      { chainId: 'arb', rpcUrl: ['https://rpc.example/a'] },
      {
        chainId: 'arb',
        rpcUrl: ['https://rpc.example/a', 'https://rpc.example/b?token=x'],
      },
      { chainId: '../bad', rpcUrl: ['https://rpc.example/bad'] },
      { chainId: 'http', rpcUrl: ['http://rpc.example'] },
    ],
  });
  assert.deepEqual(parsed.chains, [
    {
      serverId: 'arb',
      rpcUrls: ['https://rpc.example/a', 'https://rpc.example/b?token=x'],
    },
  ]);
  assert.equal(parsed.skippedEntries, 2);
  assert.deepEqual(
    [
      ...parseSupportedChains([
        { id: 'eth', community_id: 1, is_disabled: false },
        { id: 'ftm', community_id: 250, is_disabled: true },
        { id: '../bad', community_id: 2, is_disabled: false },
      ]),
    ],
    [['eth', '1']]
  );
  assert.throws(
    () => parseChainRpcPayload({ status: 'ok', rpcs: [] }),
    /no usable RPCs/
  );

  const source = `export const EIP7702_REVOKE_CHAIN_CANDIDATES = [
  CHAINS_ENUM.ETH,
  'INK' as CHAINS_ENUM,
] as CHAINS_ENUM[];`;
  const updated = appendSupportedEnums(source, ['ETH', 'ABS', 'INK', 'SEI']);
  assert.deepEqual(updated.added, ['ABS', 'SEI']);
  assert.equal(
    updated.source,
    `export const EIP7702_REVOKE_CHAIN_CANDIDATES = [
  CHAINS_ENUM.ETH,
  'INK' as CHAINS_ENUM,
  'ABS' as CHAINS_ENUM,
  'SEI' as CHAINS_ENUM,
] as CHAINS_ENUM[];`
  );
});
