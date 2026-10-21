import {
  findShadowedBuiltinType,
  parseTypedDataJson,
} from '@/background/utils/typedDataTypes';

const EIP712Domain = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
];
const Permit = [
  { name: 'owner', type: 'address' },
  { name: 'spender', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'deadline', type: 'uint256' },
];

describe('findShadowedBuiltinType', () => {
  it('accepts a standard permit', () => {
    expect(findShadowedBuiltinType({ EIP712Domain, Permit })).toBeUndefined();
  });

  it('rejects a permit whose domain-only `string` type is redefined as a struct chain', () => {
    const types: Record<string, { name: string; type: string }[]> = {
      EIP712Domain,
      Permit,
      string: [{ name: 'v', type: 'S0' }],
    };
    for (let i = 0; i < 110; i++) {
      types[`S${i}`] = [{ name: 'v', type: `S${i + 1}` }];
    }
    types.S110 = [{ name: 'v', type: 'uint256' }];

    expect(findShadowedBuiltinType(types)).toBe('string');
  });

  it.each([
    'address',
    'bool',
    'string',
    'bytes',
    'bytes32',
    'uint256',
    'uint',
    'int8',
    'function',
    'string[]',
    'uint256[2][]',
  ])('rejects built-in name %s', (name) => {
    expect(findShadowedBuiltinType({ EIP712Domain, [name]: [] })).toBe(name);
  });

  it.each([
    'String',
    'Bytes',
    'Uint256',
    'intent',
    'Interest',
    'bytesLike',
    'stringList',
    'address_',
    'OrderComponents',
    'HyperliquidTransaction:Withdraw',
  ])('accepts struct name %s', (name) => {
    expect(
      findShadowedBuiltinType({ EIP712Domain, [name]: [] })
    ).toBeUndefined();
  });

  it('checks an over-long key in linear time', () => {
    const suffix = '[]'.repeat(200000);
    const start = Date.now();
    expect(
      findShadowedBuiltinType({ EIP712Domain, [`${suffix}x`]: [] })
    ).toBeUndefined();
    expect(
      findShadowedBuiltinType({ EIP712Domain, [`string${suffix}x`]: [] })
    ).toBeUndefined();
    expect(
      findShadowedBuiltinType({ EIP712Domain, [`string${suffix}`]: [] })
    ).toBe(`string${suffix}`);
    expect(Date.now() - start).toBeLessThan(1000);
  });

  it.each([undefined, null, 'types', 1])(
    'ignores non-object types (%s)',
    (v) => {
      expect(findShadowedBuiltinType(v)).toBeUndefined();
    }
  );
});

describe('parseTypedDataJson', () => {
  const domain = {
    name: 'Dai Stablecoin',
    version: '1',
    chainId: 1,
    verifyingContract: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  };
  const message = {
    owner: '0x1111111111111111111111111111111111111111',
    spender: '0x2222222222222222222222222222222222222222',
    value: '1',
    nonce: 0,
    deadline: 1,
  };

  it('accepts a standard permit', () => {
    const data = JSON.stringify({
      types: { EIP712Domain, Permit },
      primaryType: 'Permit',
      domain,
      message,
    });
    const { json, hasProtoKey } = parseTypedDataJson(data);
    expect(hasProtoKey).toBe(false);
    expect(json.types.Permit).toEqual(Permit);
  });

  // JSON.stringify never emits `__proto__`, so these are hand-written strings.
  const d = JSON.stringify(domain);
  const m = JSON.stringify(message);
  const ed = JSON.stringify(EIP712Domain);
  const p = JSON.stringify(Permit);

  it.each([
    [
      'types',
      `{"types":{"EIP712Domain":${ed},"__proto__":{"Permit":${p}}},"primaryType":"Permit","domain":${d},"message":${m}}`,
    ],
    [
      'top level',
      `{"__proto__":{"types":{"EIP712Domain":${ed},"Permit":${p}}},"primaryType":"Permit","domain":${d},"message":${m}}`,
    ],
    [
      'domain',
      `{"types":{"EIP712Domain":${ed},"Permit":${p}},"primaryType":"Permit","domain":{"__proto__":${d}},"message":${m}}`,
    ],
    [
      'nested message',
      `{"types":{"EIP712Domain":${ed},"Permit":${p}},"primaryType":"Permit","domain":${d},"message":{"owner":"0x1111111111111111111111111111111111111111","x":[{"__proto__":{}}]}}`,
    ],
    [
      'escaped key',
      `{"types":{"EIP712Domain":${ed},"\\u005f_proto__":{"Permit":${p}}},"primaryType":"Permit","domain":${d},"message":${m}}`,
    ],
  ])('flags __proto__ in %s', (_, data) => {
    expect(parseTypedDataJson(data).hasProtoKey).toBe(true);
  });

  it('does not flag __proto__ as a value', () => {
    const data = JSON.stringify({
      types: { EIP712Domain, Permit },
      primaryType: 'Permit',
      domain: { ...domain, name: '__proto__' },
      message,
    });
    expect(parseTypedDataJson(data).hasProtoKey).toBe(false);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseTypedDataJson('{')).toThrow();
  });
});
