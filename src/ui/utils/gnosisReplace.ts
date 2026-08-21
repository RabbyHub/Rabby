import { isValidAddress } from '@ethereumjs/util';

export const GNOSIS_REPLACE_QUERY_KEY = 'gnosisReplace';

export type GnosisSendReplaceContext = {
  safeAddress: string;
  chainId: number;
  nonce: number;
};

export type GnosisSendReplaceContextResult =
  | { status: 'absent' }
  | { status: 'invalid' }
  | { status: 'valid'; context: GnosisSendReplaceContext };

const isSafeIntegerInRange = (
  value: unknown,
  minimum: number
): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum;

export const isGnosisSendReplaceContext = (
  value: unknown
): value is GnosisSendReplaceContext => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const context = value as Partial<GnosisSendReplaceContext>;
  return (
    typeof context.safeAddress === 'string' &&
    isValidAddress(context.safeAddress) &&
    isSafeIntegerInRange(context.chainId, 1) &&
    isSafeIntegerInRange(context.nonce, 0)
  );
};

export const serializeGnosisSendReplaceContext = (
  context: GnosisSendReplaceContext
) => JSON.stringify(context);

export const parseGnosisSendReplaceContext = (
  search: string
): GnosisSendReplaceContextResult => {
  const rawValue = new URLSearchParams(search).get(GNOSIS_REPLACE_QUERY_KEY);
  if (rawValue === null) {
    return { status: 'absent' };
  }

  try {
    const value: unknown = JSON.parse(rawValue);
    if (!isGnosisSendReplaceContext(value)) {
      return { status: 'invalid' };
    }

    return { status: 'valid', context: value };
  } catch {
    return { status: 'invalid' };
  }
};

export const isGnosisSendReplaceTargetMatched = (
  context: GnosisSendReplaceContext,
  input: {
    safeAddress?: string;
    chainId?: number;
  }
) =>
  !!input.safeAddress &&
  input.safeAddress.toLowerCase() === context.safeAddress.toLowerCase() &&
  input.chainId === context.chainId;
