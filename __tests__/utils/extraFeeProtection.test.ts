import {
  detectExtraFeeTypedData as detectTypedAt,
  detectExtraFeeText as detectTextAt,
  isExtraFeeProtectionOn,
} from '@/utils/extraFeeProtection';
import * as f from '../fixtures/extraFeeProtection';

const HYPERLIQUID = 'https://app.hyperliquid.xyz';
const ASTER = 'https://www.asterdex.com';
const LIGHTER = 'https://app.lighter.xyz';
const THIRD_PARTY = 'https://example.com';

// rule cases run on the protocol's own official origin
const detectExtraFeeTypedData = (data: any) =>
  detectTypedAt(
    data,
    data?.domain?.name === 'AsterSignTransaction' ? ASTER : HYPERLIQUID
  );
const detectExtraFeeText = (text: string) => detectTextAt(text, LIGHTER);

const hl = (maxFeeRate: unknown) => ({
  ...f.hyperliquidApproveBuilderFee,
  message: { ...f.hyperliquidApproveBuilderFee.message, maxFeeRate },
});

// Replace the message and declare exactly its keys as the signed fields.
const withMessage = (data: any, message: Record<string, any>) => ({
  ...data,
  types: {
    ...data.types,
    [data.primaryType]: Object.keys(message).map((name) => ({
      name,
      type: 'string',
    })),
  },
  message,
});

const aster = (MaxFeeRate: unknown) => ({
  ...f.asterApproveBuilder,
  message: { ...f.asterApproveBuilder.message, MaxFeeRate },
});

describe('detectExtraFeeTypedData', () => {
  it('blocks hyperliquid non-zero builder fee approval', () => {
    expect(detectExtraFeeTypedData(f.hyperliquidApproveBuilderFee)).toBe(
      'hyperliquid'
    );
    expect(detectExtraFeeTypedData(hl('0.001%'))).toBe('hyperliquid');
  });

  it('allows hyperliquid revoke', () => {
    expect(detectExtraFeeTypedData(hl('0%'))).toBeNull();
    expect(detectExtraFeeTypedData(hl('0.000%'))).toBeNull();
  });

  it('does not round a tiny fee down to zero', () => {
    const tiny = '0.' + '0'.repeat(400) + '1';
    expect(detectExtraFeeTypedData(hl(tiny + '%'))).toBe('hyperliquid');
    expect(detectExtraFeeTypedData(aster(tiny))).toBe('aster');
  });

  it('reads the signed hyperliquid fee field, not an unsigned decoy', () => {
    const { maxFeeRate, ...rest } = f.hyperliquidApproveBuilderFee.message;
    const declared = withMessage(f.hyperliquidApproveBuilderFee, {
      ...rest,
      MaxFeeRate: maxFeeRate,
    });
    expect(
      detectExtraFeeTypedData({
        ...declared,
        message: { maxFeeRate: '0%', ...declared.message },
      })
    ).toBe('hyperliquid');
  });

  it('blocks hyperliquid malformed fee', () => {
    for (const v of ['0.1', '1e-3%', '', undefined, 0.1, '-0.1%']) {
      expect(detectExtraFeeTypedData(hl(v))).toBe('hyperliquid');
    }
  });

  it('allows hyperliquid ApproveAgent', () => {
    expect(
      detectExtraFeeTypedData({
        ...f.hyperliquidApproveBuilderFee,
        primaryType: 'HyperliquidTransaction:ApproveAgent',
      })
    ).toBeNull();
  });

  it('blocks aster approve and update builder', () => {
    expect(detectExtraFeeTypedData(f.asterApproveBuilder)).toBe('aster');
    expect(
      detectExtraFeeTypedData({
        ...f.asterApproveBuilder,
        primaryType: 'UpdateBuilder',
      })
    ).toBe('aster');
  });

  it('reads aster fee key case-insensitively', () => {
    const { MaxFeeRate, ...rest } = f.asterApproveBuilder.message;
    expect(
      detectExtraFeeTypedData(
        withMessage(f.asterApproveBuilder, { ...rest, maxfeerate: MaxFeeRate })
      )
    ).toBe('aster');
  });

  it('allows aster zero fee', () => {
    expect(detectExtraFeeTypedData(aster('0'))).toBeNull();
    expect(detectExtraFeeTypedData(aster('0.000'))).toBeNull();
    expect(detectExtraFeeTypedData(aster(0))).toBeNull();
  });

  it('blocks aster numeric or malformed fee', () => {
    expect(detectExtraFeeTypedData(aster(0.001))).toBe('aster');
    for (const v of ['0.1%', 'abc', undefined, '']) {
      expect(detectExtraFeeTypedData(aster(v))).toBe('aster');
    }
  });

  it('blocks aster ApproveAgent only when it carries a builder', () => {
    expect(detectExtraFeeTypedData(f.asterApproveAgentWithBuilder)).toBe(
      'aster'
    );
    const {
      Builder,
      BuilderName,
      MaxFeeRate,
      ...plain
    } = f.asterApproveAgentWithBuilder.message;
    const agent = (message: Record<string, any>) =>
      withMessage(f.asterApproveAgentWithBuilder, message);
    expect(detectExtraFeeTypedData(agent(plain))).toBeNull();
    // builder without a fee field still blocks
    expect(detectExtraFeeTypedData(agent({ ...plain, Builder }))).toBe('aster');
    expect(
      detectExtraFeeTypedData(
        agent({ ...plain, SpotBuilder: Builder, MaxFeeRate })
      )
    ).toBe('aster');
  });

  it('blocks aster ApproveAgent with a docs-format spot builder', () => {
    expect(detectExtraFeeTypedData(f.asterApproveAgentWithSpotBuilder)).toBe(
      'aster'
    );
    expect(
      detectExtraFeeTypedData({
        ...f.asterApproveAgentWithSpotBuilder,
        message: {
          ...f.asterApproveAgentWithSpotBuilder.message,
          MaxFeeRate: '0',
        },
      })
    ).toBeNull();
  });

  it('blocks aster when any Max*FeeRate field is non-zero', () => {
    for (const spotFee of ['SpotMaxFeeRate', 'MaxSpotFeeRate']) {
      expect(
        detectExtraFeeTypedData(
          withMessage(f.asterApproveAgentWithBuilder, {
            ...f.asterApproveAgentWithBuilder.message,
            SpotBuilder: '0x1111111111111111111111111111111111111111',
            MaxFeeRate: '0',
            [spotFee]: '0.01',
          })
        )
      ).toBe('aster');
    }
  });

  it('ignores unsigned case-variant decoys in aster messages', () => {
    // EIP-712 ignores undeclared keys, so a decoy must not hide the signed one
    for (const fixture of [
      f.asterApproveAgentWithBuilder,
      f.asterApproveAgentWithSpotBuilder,
    ]) {
      expect(
        detectExtraFeeTypedData({
          ...fixture,
          message: { builder: '', spotBuilder: '', ...fixture.message },
        })
      ).toBe('aster');
      expect(
        detectExtraFeeTypedData({
          ...fixture,
          message: { maxFeeRate: '0', ...fixture.message },
        })
      ).toBe('aster');
    }
    // undeclared builder or fee keys are not signed and do not count
    expect(
      detectExtraFeeTypedData({
        ...f.asterApproveBuilder,
        message: { ...f.asterApproveBuilder.message, SpotMaxFeeRate: '0.01' },
      })
    ).toBe('aster');
  });

  it('fails closed on aster typed data without a type declaration', () => {
    const { types, ...noTypes } = f.asterApproveAgentWithBuilder;
    expect(detectExtraFeeTypedData(noTypes)).toBe('aster');
    // malformed declaration
    expect(
      detectExtraFeeTypedData({
        ...f.asterApproveAgentWithBuilder,
        types: { ApproveAgent: ['Builder', 'MaxFeeRate'] },
      })
    ).toBe('aster');
  });

  it('allows aster DelBuilder', () => {
    expect(
      detectExtraFeeTypedData({
        ...f.asterApproveBuilder,
        primaryType: 'DelBuilder',
      })
    ).toBeNull();
  });

  it('ignores unrelated typed data', () => {
    expect(
      detectExtraFeeTypedData({
        ...f.hyperliquidApproveBuilderFee,
        domain: { name: 'Other' },
      })
    ).toBeNull();
    expect(detectExtraFeeTypedData(null)).toBeNull();
    expect(detectExtraFeeTypedData('x')).toBeNull();
  });
});

describe('detectExtraFeeText', () => {
  const zero = '0x0000000000000000';
  const withFees = (fees: string[]) =>
    f.lighterApproveIntegratorText.replace(
      /^(max (?:perps|spot) (?:taker|maker) fee: ).*$/gm,
      (_, prefix) => prefix + fees.shift()
    );

  it('blocks lighter non-zero integrator approval', () => {
    expect(detectExtraFeeText(f.lighterApproveIntegratorText)).toBe('lighter');
    expect(
      detectExtraFeeText(withFees([zero, zero, zero, '0x00000000000003e8']))
    ).toBe('lighter');
  });

  it('allows lighter all-zero revoke', () => {
    expect(detectExtraFeeText(withFees([zero, zero, zero, zero]))).toBeNull();
  });

  it('blocks lighter malformed or missing fee', () => {
    expect(detectExtraFeeText(withFees([zero, zero, zero, '1000']))).toBe(
      'lighter'
    );
    expect(
      detectExtraFeeText(
        f.lighterApproveIntegratorText.replace(/^max spot maker fee: .*\n/m, '')
      )
    ).toBe('lighter');
  });

  it('fails closed on repeated lighter lines', () => {
    // a second integrator line must not inherit the collector exemption
    expect(
      detectExtraFeeText(
        f.lighterOfficialApproveIntegratorText.replace(
          'integrator account index: 0x0000fffffffcbb5c',
          'integrator account index: 0x0000fffffffcbb5c\nintegrator account index: 0x0000000000000def'
        )
      )
    ).toBe('lighter');
    const zero = '0x0000000000000000';
    const allZero = f.lighterApproveIntegratorText.replace(
      /^(max (?:perps|spot) (?:taker|maker) fee: ).*$/gm,
      (_, prefix) => prefix + zero
    );
    expect(detectExtraFeeText(allZero)).toBeNull();
    expect(
      detectExtraFeeText(
        allZero.replace(
          'max spot maker fee: ' + zero,
          'max spot maker fee: ' +
            zero +
            '\nmax spot maker fee: 0x0000000000002710'
        )
      )
    ).toBe('lighter');
  });

  it('allows the official lighter fee collector', () => {
    expect(
      detectExtraFeeText(f.lighterOfficialApproveIntegratorText)
    ).toBeNull();
    const rh = f.lighterOfficialApproveIntegratorText.replace(
      '0x0000fffffffcbb5c',
      '0x0000000000004a1b'
    );
    // RH collector 18971 on Robinhood Chain (466324)
    expect(
      detectExtraFeeText(rh.replace('0x0000000000000130', '0x0000000000071d94'))
    ).toBeNull();
    // 18971 is a regular account on mainnet
    expect(detectExtraFeeText(rh)).toBe('lighter');
    // core collector index on RH is not exempt
    expect(
      detectExtraFeeText(
        f.lighterOfficialApproveIntegratorText.replace(
          '0x0000000000000130',
          '0x0000000000071d94'
        )
      )
    ).toBe('lighter');
    // malformed collector index is not exempt
    expect(
      detectExtraFeeText(
        f.lighterOfficialApproveIntegratorText.replace(
          '0x0000fffffffcbb5c',
          '281474976496476'
        )
      )
    ).toBe('lighter');
  });

  it('handles CRLF and trailing spaces', () => {
    expect(
      detectExtraFeeText(f.lighterApproveIntegratorText.replace(/\n/g, ' \r\n'))
    ).toBe('lighter');
  });

  it('ignores unrelated text', () => {
    expect(detectExtraFeeText('Approve Integrator')).toBeNull();
    expect(detectExtraFeeText('hello')).toBeNull();
  });
});

describe('origin', () => {
  it('only checks official origins of the matching protocol', () => {
    expect(detectTypedAt(f.hyperliquidApproveBuilderFee, HYPERLIQUID)).toBe(
      'hyperliquid'
    );
    expect(detectTypedAt(f.asterApproveBuilder, ASTER)).toBe('aster');
    expect(detectTextAt(f.lighterApproveIntegratorText, LIGHTER)).toBe(
      'lighter'
    );
    expect(
      detectTypedAt(f.hyperliquidApproveBuilderFee, 'https://app.trade.xyz')
    ).toBe('hyperliquid');
    expect(
      detectTextAt(
        f.lighterApproveIntegratorText,
        'https://robinhoodchain.lighter.xyz'
      )
    ).toBe('lighter');
    // third-party sites may charge their own builder fee
    expect(
      detectTypedAt(f.hyperliquidApproveBuilderFee, THIRD_PARTY)
    ).toBeNull();
    expect(detectTypedAt(f.asterApproveBuilder, THIRD_PARTY)).toBeNull();
    expect(
      detectTextAt(f.lighterApproveIntegratorText, THIRD_PARTY)
    ).toBeNull();
    // another protocol's official site does not count
    expect(detectTypedAt(f.hyperliquidApproveBuilderFee, ASTER)).toBeNull();
    // exact origin only, no lookalike hosts
    expect(
      detectTypedAt(
        f.hyperliquidApproveBuilderFee,
        'https://app.hyperliquid.xyz.evil.com'
      )
    ).toBeNull();
    expect(
      detectTypedAt(
        f.hyperliquidApproveBuilderFee,
        'http://app.hyperliquid.xyz'
      )
    ).toBeNull();
  });
});

describe('known injectors on any origin', () => {
  // known injector fee recipient, mixed case on purpose
  const INJECTOR = '0x9C87bb379d5ff2fcbf2f83e619f9fccb95a40AD9';

  const lighterWith = (index: string, chainId: string) =>
    f.lighterApproveIntegratorText
      .replace(
        'integrator account index: 0x0000000000000def',
        `integrator account index: ${index}`
      )
      .replace('chainId: 0x0000000000000130', `chainId: ${chainId}`);

  it('blocks a hyperliquid approval to a known injector on a third-party site', () => {
    const data = {
      ...f.hyperliquidApproveBuilderFee,
      message: { ...f.hyperliquidApproveBuilderFee.message, builder: INJECTOR },
    };
    expect(detectTypedAt(data, THIRD_PARTY)).toBe('hyperliquid');
    // revoking it is still allowed
    expect(
      detectTypedAt(
        { ...data, message: { ...data.message, maxFeeRate: '0%' } },
        THIRD_PARTY
      )
    ).toBeNull();
  });

  it('only trusts the signed builder field', () => {
    const { builder, ...rest } = f.hyperliquidApproveBuilderFee.message;
    const declared = withMessage(f.hyperliquidApproveBuilderFee, {
      ...rest,
      Builder: builder,
    });
    expect(
      detectTypedAt(
        { ...declared, message: { builder: INJECTOR, ...declared.message } },
        THIRD_PARTY
      )
    ).toBeNull();
  });

  it('blocks aster builder approvals to a known injector on a third-party site', () => {
    expect(
      detectTypedAt(
        {
          ...f.asterApproveBuilder,
          message: { ...f.asterApproveBuilder.message, Builder: INJECTOR },
        },
        THIRD_PARTY
      )
    ).toBe('aster');
    expect(
      detectTypedAt(
        {
          ...f.asterApproveAgentWithSpotBuilder,
          message: {
            ...f.asterApproveAgentWithSpotBuilder.message,
            SpotBuilder: INJECTOR,
          },
        },
        THIRD_PARTY
      )
    ).toBe('aster');
  });

  it('blocks a lighter approval to a known injector on its own exchange only', () => {
    // mainnet 304 -> 737834, Robinhood Chain 466324 -> 19366
    expect(
      detectTextAt(
        lighterWith('0x00000000000b422a', '0x0000000000000130'),
        THIRD_PARTY
      )
    ).toBe('lighter');
    expect(
      detectTextAt(
        lighterWith('0x0000000000004ba6', '0x0000000000071d94'),
        THIRD_PARTY
      )
    ).toBe('lighter');
    // an index means nothing on another exchange
    expect(
      detectTextAt(
        lighterWith('0x00000000000b422a', '0x0000000000071d94'),
        THIRD_PARTY
      )
    ).toBeNull();
  });
});

describe('injector-only venues (aevo, grvt, sodex)', () => {
  const INJECTOR_ADDRESS = '0x9C87bb379d5ff2fcbf2f83e619f9fccb95a40AD9';
  const AEVO = 'https://app.aevo.xyz';

  const set = (data: any, patch: Record<string, unknown>) => ({
    ...data,
    message: { ...data.message, ...patch },
  });

  const cases = [
    {
      protocol: 'aevo',
      data: f.aevoApproveBuilder,
      injector: { builderId: 'builder_9a123be818849b20' },
      zero: { maxFeeRate: '0' },
    },
    {
      protocol: 'grvt',
      data: f.grvtAuthorizeBuilder,
      injector: { builderAccountID: INJECTOR_ADDRESS },
      zero: { maxFutureFeeRate: 0, maxSpotFeeRate: 0 },
    },
    {
      protocol: 'sodex',
      data: f.sodexApproveBuilderFee,
      injector: { builderID: '230500' },
      zero: { maxFeeRate: '0' },
    },
  ];

  it.each(cases)(
    'blocks a $protocol approval to a known injector on any origin',
    ({ protocol, data, injector }) => {
      const injected = set(data, injector);
      expect(detectTypedAt(injected, THIRD_PARTY)).toBe(protocol);
      expect(detectTypedAt(injected, AEVO)).toBe(protocol);
    }
  );

  it.each(cases)(
    'allows a $protocol zero-fee approval to a known injector',
    ({ data, injector, zero }) => {
      expect(
        detectTypedAt(set(data, { ...injector, ...zero }), THIRD_PARTY)
      ).toBeNull();
    }
  );

  it.each(cases)(
    "leaves the $protocol venue's own builders alone, even on its site",
    ({ data }) => {
      expect(detectTypedAt(data, THIRD_PARTY)).toBeNull();
      expect(detectTypedAt(data, AEVO)).toBeNull();
    }
  );

  it('blocks grvt when only one of its fee fields is zero', () => {
    const injected = set(f.grvtAuthorizeBuilder, {
      builderAccountID: INJECTOR_ADDRESS,
      maxFutureFeeRate: 0,
    });
    expect(detectTypedAt(injected, THIRD_PARTY)).toBe('grvt');
  });

  it('ignores an unsigned injector builder', () => {
    const { builderId, ...rest } = f.aevoApproveBuilder.message;
    const declared = withMessage(f.aevoApproveBuilder, {
      ...rest,
      BuilderId: builderId,
    });
    expect(
      detectTypedAt(
        {
          ...declared,
          message: {
            builderId: 'builder_9a123be818849b20',
            ...declared.message,
          },
        },
        THIRD_PARTY
      )
    ).toBeNull();
  });
});

it('treats missing preference as enabled', () => {
  expect(isExtraFeeProtectionOn(undefined)).toBe(true);
  expect(isExtraFeeProtectionOn(true)).toBe(true);
  expect(isExtraFeeProtectionOn(false)).toBe(false);
});
