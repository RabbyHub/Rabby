/**
 * @jest-environment node
 */
// eth-sig-util's hashing fails under jsdom, whose Uint8Array is not Node's.
import { SignTypedDataVersion, TypedDataUtils } from '@metamask/eth-sig-util';
import {
  findInvalidTypedDataValue,
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

describe('findInvalidTypedDataValue', () => {
  const Mail = [
    { name: 'contents', type: 'string' },
    { name: 'approved', type: 'bool' },
  ];
  const base = {
    types: { EIP712Domain, Mail },
    primaryType: 'Mail',
    domain: {
      name: 'Ether Mail',
      version: '1',
      chainId: 1,
      verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
    },
    message: { contents: 'hi', approved: true },
  };

  const find = (data: any) => findInvalidTypedDataValue(data)?.path;

  // The walker only matters where the signer actually reads the value: each
  // flagged payload must hash differently from its `false` counterpart.
  const hash = (data: any) =>
    TypedDataUtils.eip712Hash(data, SignTypedDataVersion.V4).toString('hex');

  it.each([true, false])('accepts a boolean (%s)', (approved) => {
    expect(
      find({ ...base, message: { contents: 'hi', approved } })
    ).toBeUndefined();
  });

  it.each(['false', 'true', '', 0, 1, null, {}, []])(
    'rejects %p in a bool field',
    (approved) => {
      expect(find({ ...base, message: { contents: 'hi', approved } })).toBe(
        'message.approved'
      );
    }
  );

  it('signs the string "false" as true', () => {
    const asString = {
      ...base,
      message: { contents: 'hi', approved: 'false' },
    };
    const asTrue = { ...base, message: { contents: 'hi', approved: true } };
    expect(hash(asString)).toBe(hash(asTrue));
  });

  const cases: [string, any, string][] = [
    [
      'a domain field',
      {
        ...base,
        types: {
          EIP712Domain: [
            ...EIP712Domain.slice(0, 3),
            { name: 'x', type: 'bool' },
          ],
          Mail,
        },
        domain: { ...base.domain, x: 'false' },
      },
      'domain.x',
    ],
    [
      'a nested struct',
      {
        ...base,
        types: {
          EIP712Domain,
          Outer: [{ name: 'mail', type: 'Mail' }],
          Mail,
        },
        primaryType: 'Outer',
        message: { mail: { contents: 'hi', approved: 'false' } },
      },
      'message.mail.approved',
    ],
    [
      'a bool[]',
      {
        ...base,
        types: { EIP712Domain, Mail: [{ name: 'flags', type: 'bool[]' }] },
        message: { flags: [true, 'false'] },
      },
      'message.flags[1]',
    ],
    [
      'a bool[2][]',
      {
        ...base,
        types: { EIP712Domain, Mail: [{ name: 'flags', type: 'bool[2][]' }] },
        message: {
          flags: [
            [true, false],
            [false, 'false'],
          ],
        },
      },
      'message.flags[1][1]',
    ],
    [
      'a struct array',
      {
        ...base,
        types: {
          EIP712Domain,
          Box: [{ name: 'mails', type: 'Mail[]' }],
          Mail,
        },
        primaryType: 'Box',
        message: {
          mails: [
            { contents: 'a', approved: true },
            { contents: 'b', approved: 'false' },
          ],
        },
      },
      'message.mails[1].approved',
    ],
  ];

  it.each(cases)('rejects a non-boolean in %s', (_, data, path) => {
    expect(find(data)).toBe(path);
    const fixed = JSON.parse(JSON.stringify(data).replace(/"false"/g, 'false'));
    expect(find(fixed)).toBeUndefined();
    expect(hash(data)).not.toBe(hash(fixed));
  });

  it('rejects a bool field resolved through an inherited key', () => {
    // The signer reads `message.constructor` from the prototype and signs true.
    const data = {
      ...base,
      types: { EIP712Domain, Mail: [{ name: 'constructor', type: 'bool' }] },
      message: {},
    };
    expect(find(data)).toBe('message.constructor');
  });

  it('ignores a missing field, which V3 skips and V4 rejects', () => {
    const data = { ...base, message: { contents: 'hi' } };
    expect(find(data)).toBeUndefined();
    expect(() => hash(data)).toThrow();
  });

  it('ignores the message when the primary type is EIP712Domain', () => {
    const data = {
      ...base,
      primaryType: 'EIP712Domain',
      message: { contents: 'hi', approved: 'false' },
    };
    expect(find(data)).toBeUndefined();
  });

  it('ignores a null struct, which V4 hashes as zero', () => {
    const data = {
      ...base,
      types: { EIP712Domain, Outer: [{ name: 'mail', type: 'Mail' }], Mail },
      primaryType: 'Outer',
      message: { mail: null },
    };
    expect(find(data)).toBeUndefined();
  });

  it.each([undefined, null, 'data', 1])('ignores non-object data (%s)', (v) => {
    expect(find(v)).toBeUndefined();
  });

  it('reports the type and the expected value', () => {
    expect(
      findInvalidTypedDataValue({
        ...base,
        message: { contents: 'hi', approved: 'false' },
      })
    ).toEqual({
      path: 'message.approved',
      type: 'bool',
      expected: 'a boolean',
    });
  });

  describe('address', () => {
    const withTo = (to: unknown) => ({
      ...base,
      types: {
        EIP712Domain,
        Mail: [{ name: 'to', type: 'address' }],
      },
      message: { to },
    });

    it.each([
      '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
      '0xcccccccccccccccccccccccccccccccccccccccc',
      '0X0000000000000000000000000000000000000000',
      '0x0',
      '0x123',
      '0x1234',
    ])('accepts %s', (to) => {
      expect(find(withTo(to))).toBeUndefined();
    });

    it.each([
      'c'.repeat(40),
      '1234',
      1234,
      '0x',
      `0x${'c'.repeat(41)}`,
      `0x${'g'.repeat(40)}`,
      '',
      null,
      true,
    ])('rejects %p', (to) => {
      expect(find(withTo(to))).toBe('message.to');
    });

    it.each([
      ['0x0', '0x0000000000000000000000000000000000000000'],
      ['0x123', '0x0000000000000000000000000000000000000123'],
      ['0x1234', '0x0000000000000000000000000000000000001234'],
    ])('signs the short address %s left-padded', (short, full) => {
      expect(hash(withTo(short))).toBe(hash(withTo(full)));
    });

    it('signs an address without 0x as a decimal number', () => {
      // Each "c" is the digit 12: 12 * (10^40 - 1) / 9.
      expect(hash(withTo('c'.repeat(40)))).toBe(
        hash(withTo('0x000000272ee297af2630ff8fa29c815555555554'))
      );
      expect(hash(withTo('c'.repeat(40)))).not.toBe(
        hash(withTo(`0x${'c'.repeat(40)}`))
      );
    });

    it('rejects an invalid address in the domain', () => {
      const data = {
        ...base,
        domain: { ...base.domain, verifyingContract: 'c'.repeat(40) },
      };
      expect(find(data)).toBe('domain.verifyingContract');
    });

    it('rejects an invalid address in an address[]', () => {
      const data = {
        ...base,
        types: { EIP712Domain, Mail: [{ name: 'to', type: 'address[]' }] },
        message: { to: [base.domain.verifyingContract, 'c'.repeat(40)] },
      };
      expect(find(data)).toBe('message.to[1]');
    });
  });

  describe('string', () => {
    const withContents = (contents: unknown) => ({
      ...base,
      message: { contents, approved: true },
    });

    it.each(['', 'hi', '123'])('accepts %p', (contents) => {
      expect(find(withContents(contents))).toBeUndefined();
    });

    it.each([123, 0, null, true, {}, []])('rejects %p', (contents) => {
      expect(find(withContents(contents))).toBe('message.contents');
    });

    it('signs a number as its bytes', () => {
      // 123 is the byte 0x7b, which is "{".
      expect(hash(withContents(123))).toBe(hash(withContents('{')));
      expect(hash(withContents(123))).not.toBe(hash(withContents('123')));
    });

    it('signs null as the empty string', () => {
      expect(hash(withContents(null))).toBe(hash(withContents('')));
    });

    it('rejects an invalid string in the domain', () => {
      const data = { ...base, domain: { ...base.domain, name: 1 } };
      expect(find(data)).toBe('domain.name');
    });
  });
});
