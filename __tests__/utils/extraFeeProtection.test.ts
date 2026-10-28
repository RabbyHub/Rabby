import {
  detectExtraFeeTypedData,
  detectExtraFeeText,
  isExtraFeeProtectionOn,
} from '@/utils/extraFeeProtection';
import * as f from '../fixtures/extraFeeProtection';

const hl = (maxFeeRate: unknown) => ({
  ...f.hyperliquidApproveBuilderFee,
  message: { ...f.hyperliquidApproveBuilderFee.message, maxFeeRate },
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
      detectExtraFeeTypedData({
        ...f.asterApproveBuilder,
        message: { ...rest, maxfeerate: MaxFeeRate },
      })
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
    const agent = (message: Record<string, any>) => ({
      ...f.asterApproveAgentWithBuilder,
      message,
    });
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

  it('blocks aster when any *MaxFeeRate field is non-zero', () => {
    expect(
      detectExtraFeeTypedData({
        ...f.asterApproveAgentWithBuilder,
        message: {
          ...f.asterApproveAgentWithBuilder.message,
          SpotBuilder: '0x1111111111111111111111111111111111111111',
          MaxFeeRate: '0',
          SpotMaxFeeRate: '0.01',
        },
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

it('treats missing preference as enabled', () => {
  expect(isExtraFeeProtectionOn(undefined)).toBe(true);
  expect(isExtraFeeProtectionOn(true)).toBe(true);
  expect(isExtraFeeProtectionOn(false)).toBe(false);
});
