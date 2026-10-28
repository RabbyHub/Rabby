// Extra Fee Protection: detect signatures that approve a non-zero builder /
// integrator fee, which extensions like Pocket Universe inject into dapps to
// charge users on every later order.
//
// Only requests from the protocol's official frontend origins are checked;
// the same signature from any other site is left alone.
//
// To cover a new protocol, add one rule to TYPED_DATA_RULES or TEXT_RULES.
// Once a rule matches, only a fee that parses strictly as zero is allowed;
// a missing or malformed fee counts as a fee (fail closed).

export type ExtraFeeProtocol = 'hyperliquid' | 'aster' | 'lighter';

interface Rule<T> {
  protocol: ExtraFeeProtocol;
  origins: string[];
  match: (data: T) => boolean;
  hasFee: (data: T) => boolean;
}

type TypedData = {
  domain: Record<string, any>;
  primaryType: string;
  message: Record<string, any>;
};

const DECIMAL = /^\d+(\.\d+)?$/;

const getIgnoreCase = (obj: Record<string, any>, key: string) => {
  const found = Object.keys(obj).find(
    (k) => k.toLowerCase() === key.toLowerCase()
  );
  return found === undefined ? undefined : obj[found];
};

const ASTER_BUILDER_TYPES = ['ApproveBuilder', 'UpdateBuilder'];

const isZeroDecimal = (fee: unknown) => {
  if (typeof fee === 'number') return fee === 0;
  return typeof fee === 'string' && DECIMAL.test(fee) && Number(fee) === 0;
};

// MaxFeeRate must be present; any other *MaxFeeRate (e.g. a spot rate) must
// also be zero.
const asterFeeIsZero = (message: Record<string, any>) =>
  getIgnoreCase(message, 'MaxFeeRate') !== undefined &&
  Object.keys(message)
    .filter((k) => /maxfeerate$/i.test(k))
    .every((k) => isZeroDecimal(message[k]));

const isNonEmptyString = (v: unknown) => typeof v === 'string' && v !== '';

const TYPED_DATA_RULES: Rule<TypedData>[] = [
  {
    protocol: 'hyperliquid',
    origins: [
      'https://app.hyperliquid.xyz',
      'https://hyperliquid.xyz',
      'https://app.hyperliquid-testnet.xyz',
    ],
    match: (d) =>
      d.domain.name === 'HyperliquidSignTransaction' &&
      d.primaryType === 'HyperliquidTransaction:ApproveBuilderFee',
    hasFee: (d) => {
      const fee = d.message.maxFeeRate;
      return !(
        typeof fee === 'string' &&
        /^\d+(\.\d+)?%$/.test(fee) &&
        Number(fee.slice(0, -1)) === 0
      );
    },
  },
  {
    protocol: 'aster',
    origins: ['https://www.asterdex.com', 'https://asterdex.com'],
    match: (d) =>
      d.domain.name === 'AsterSignTransaction' &&
      (ASTER_BUILDER_TYPES.includes(d.primaryType) ||
        (d.primaryType === 'ApproveAgent' &&
          (isNonEmptyString(getIgnoreCase(d.message, 'Builder')) ||
            isNonEmptyString(getIgnoreCase(d.message, 'SpotBuilder'))))),
    hasFee: (d) => !asterFeeIsZero(d.message),
  },
];

const LIGHTER_FEE_KEYS = [
  'max perps taker fee',
  'max perps maker fee',
  'max spot taker fee',
  'max spot maker fee',
];

// Lighter's official fee collector per exchange (chainId -> account index),
// from fee_collector_account_index in GET /api/v1/systemConfig. Account
// indexes don't carry over between exchanges, so each is only valid on its
// own chainId. The official frontend asks users to approve them.
const LIGHTER_FEE_COLLECTORS: Record<string, string> = {
  '304': '281474976496476', // mainnet, api.lighter.xyz
  '466324': '18971', // Robinhood Chain, api.rh.lighter.xyz
};

const lighterHex = (lines: string[], key: string) => {
  const line = lines.find((l) => l.startsWith(`${key}:`));
  const value = line?.slice(key.length + 1).trim();
  return value && /^0x[0-9a-fA-F]+$/.test(value) ? BigInt(value) : undefined;
};

const TEXT_RULES: Rule<string[]>[] = [
  {
    protocol: 'lighter',
    origins: [
      'https://app.lighter.xyz',
      'https://lighter.xyz',
      'https://testnet.app.lighter.xyz',
    ],
    match: (lines) =>
      lines[0] === 'Approve Integrator' &&
      lines.includes('Only sign this message for a trusted client!'),
    hasFee: (lines) =>
      LIGHTER_FEE_COLLECTORS[String(lighterHex(lines, 'chainId'))] !==
        String(lighterHex(lines, 'integrator account index')) &&
      !LIGHTER_FEE_KEYS.every((key) => lighterHex(lines, key) === BigInt(0)),
  },
];

const isObject = (v: unknown): v is Record<string, any> =>
  typeof v === 'object' && v !== null;

const detect = <T>(rules: Rule<T>[], data: T, origin: string) =>
  rules.find(
    (r) => r.origins.includes(origin) && r.match(data) && r.hasFee(data)
  )?.protocol ?? null;

export const detectExtraFeeTypedData = (
  typedData: unknown,
  origin: string
): ExtraFeeProtocol | null => {
  if (
    !isObject(typedData) ||
    !isObject(typedData.domain) ||
    !isObject(typedData.message) ||
    typeof typedData.primaryType !== 'string'
  ) {
    return null;
  }
  return detect(TYPED_DATA_RULES, typedData as TypedData, origin);
};

export const detectExtraFeeText = (
  text: string,
  origin: string
): ExtraFeeProtocol | null =>
  detect(
    TEXT_RULES,
    text.split(/\r?\n/).map((l) => l.trim()),
    origin
  );

export const isExtraFeeProtectionOn = (value?: boolean) => value !== false;
