import {
  GNOSIS_REPLACE_QUERY_KEY,
  GnosisSendReplaceContext,
  isGnosisSendReplaceTargetMatched,
  parseGnosisSendReplaceContext,
  serializeGnosisSendReplaceContext,
} from '@/ui/utils/gnosisReplace';

const context: GnosisSendReplaceContext = {
  safeAddress: '0x0000000000000000000000000000000000000001',
  chainId: 42161,
  nonce: 7,
};

const buildSearch = (value: string) => {
  const search = new URLSearchParams();
  search.set(GNOSIS_REPLACE_QUERY_KEY, value);
  return `?${search.toString()}`;
};

describe('Gnosis send replacement context', () => {
  it('distinguishes an absent context from an invalid one', () => {
    expect(parseGnosisSendReplaceContext('?action=send')).toEqual({
      status: 'absent',
    });
    expect(parseGnosisSendReplaceContext(buildSearch('{'))).toEqual({
      status: 'invalid',
    });
  });

  it('round-trips a valid replacement context through URL search params', () => {
    expect(
      parseGnosisSendReplaceContext(
        buildSearch(serializeGnosisSendReplaceContext(context))
      )
    ).toEqual({
      status: 'valid',
      context,
    });
  });

  it.each([
    { ...context, safeAddress: '0xinvalid' },
    { ...context, chainId: 0 },
    { ...context, chainId: 1.5 },
    { ...context, nonce: -1 },
    { ...context, nonce: Number.MAX_SAFE_INTEGER + 1 },
  ])('rejects malformed context %#', (invalidContext) => {
    expect(
      parseGnosisSendReplaceContext(buildSearch(JSON.stringify(invalidContext)))
    ).toEqual({ status: 'invalid' });
  });

  it('binds the replacement nonce to both the Safe address and chain', () => {
    expect(
      isGnosisSendReplaceTargetMatched(context, {
        safeAddress: context.safeAddress.toUpperCase(),
        chainId: context.chainId,
      })
    ).toBe(true);
    expect(
      isGnosisSendReplaceTargetMatched(context, {
        safeAddress: context.safeAddress,
        chainId: 1,
      })
    ).toBe(false);
    expect(
      isGnosisSendReplaceTargetMatched(context, {
        safeAddress: '0x0000000000000000000000000000000000000002',
        chainId: context.chainId,
      })
    ).toBe(false);
  });
});
