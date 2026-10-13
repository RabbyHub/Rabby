import { findShadowedBuiltinType } from '@/background/utils/typedDataTypes';

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
