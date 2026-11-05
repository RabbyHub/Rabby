// Extra Fee Protection: detect signatures that approve a non-zero builder /
// integrator fee, which some browser extensions inject into dapps to
// charge users on every later order.
//
// On the protocol's official frontend origins every non-zero approval is
// blocked. On any other site a third-party frontend may legitimately charge
// its own builder fee, so only approvals to a known injector's builder /
// integrator are blocked there.
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
  // The approved builder / integrator is a known injector (any origin).
  isKnownInjector: (data: T) => boolean;
}

// Fee recipients of a browser extension known to inject builder
// fees into these dapps. ponytail: static list, move to a server-pushed list
// if more injectors or address rotation show up.
const KNOWN_INJECTOR_ADDRESSES = new Set([
  '0x9c87bb379d5ff2fcbf2f83e619f9fccb95a40ad9',
  '0xdd2e29fac34f632c5ad1adc40d38525c6e2500d9',
  '0x147cf09e7373b8fda6f12021f1b0f98d6da1a566',
  '0x00bb4f788d4615c995dc8a64a9585f733bb53d49',
]);

const isKnownInjectorAddress = (v: unknown) =>
  typeof v === 'string' && KNOWN_INJECTOR_ADDRESSES.has(v.toLowerCase());

// That extension's Lighter integrator account per exchange (chainId ->
// account index); indexes only mean something on their own chainId.
const LIGHTER_KNOWN_INJECTORS: Record<string, string> = {
  '304': '737834',
  '466324': '19366',
};

type TypedData = {
  types?: Record<string, any>;
  domain: Record<string, any>;
  primaryType: string;
  message: Record<string, any>;
};

// Zero written as digits only (no Number() rounding: '0.000…01' is not zero).
const ZERO_DECIMAL = /^0+(\.0+)?$/;

// EIP-712 only signs the fields declared in types[primaryType] and ignores any
// other key in message, so rules read those exact names. Returns null when
// the declaration is missing or malformed, or a signed field has an unsigned
// case-variant twin in message (e.g. `builder: ''` next to `Builder`):
// callers fail closed.
const signedFields = (d: TypedData): string[] | null => {
  const declared = d.types?.[d.primaryType];
  if (!Array.isArray(declared)) return null;
  const names = declared.map((f) => f?.name);
  if (!names.every((n): n is string => typeof n === 'string')) return null;
  const keys = Object.keys(d.message).map((k) => k.toLowerCase());
  const ambiguous = names.some(
    (n) => keys.filter((k) => k === n.toLowerCase()).length > 1
  );
  return ambiguous ? null : names;
};

const ASTER_BUILDER_TYPES = ['ApproveBuilder', 'UpdateBuilder'];

const isZeroDecimal = (fee: unknown) => {
  if (typeof fee === 'number') return fee === 0;
  return typeof fee === 'string' && ZERO_DECIMAL.test(fee);
};

// Value of the signed field named `name` (any case); undefined if not signed.
const signedValue = (d: TypedData, fields: string[], name: string) => {
  const field = fields.find((n) => n.toLowerCase() === name.toLowerCase());
  return field === undefined ? undefined : d.message[field];
};

// MaxFeeRate must be signed; any other signed Max*FeeRate (e.g. a spot rate
// such as SpotMaxFeeRate or MaxSpotFeeRate) must also be zero.
const asterFeeIsZero = (d: TypedData) => {
  const fields = signedFields(d);
  if (!fields) return false;
  const feeFields = fields.filter((n) => /max\w*feerate$/i.test(n));
  return (
    feeFields.some((n) => n.toLowerCase() === 'maxfeerate') &&
    feeFields.every((n) => isZeroDecimal(d.message[n]))
  );
};

const asterAgentHasBuilder = (d: TypedData) => {
  const fields = signedFields(d);
  if (!fields) return true;
  return fields
    .filter((n) => /^(spot)?builder$/i.test(n))
    .some((n) => isNonEmptyString(d.message[n]));
};

const isNonEmptyString = (v: unknown) => typeof v === 'string' && v !== '';

const TYPED_DATA_RULES: Rule<TypedData>[] = [
  {
    protocol: 'hyperliquid',
    origins: [
      'https://app.hyperliquid.xyz',
      'https://hyperliquid.xyz',
      'https://app.hyperliquid-testnet.xyz',
      'https://app.trade.xyz',
    ],
    match: (d) =>
      d.domain.name === 'HyperliquidSignTransaction' &&
      d.primaryType === 'HyperliquidTransaction:ApproveBuilderFee',
    hasFee: (d) => {
      const fields = signedFields(d);
      const fee = fields && signedValue(d, fields, 'maxFeeRate');
      return !(
        typeof fee === 'string' &&
        fee.endsWith('%') &&
        ZERO_DECIMAL.test(fee.slice(0, -1))
      );
    },
    isKnownInjector: (d) => {
      const fields = signedFields(d);
      return (
        !!fields && isKnownInjectorAddress(signedValue(d, fields, 'builder'))
      );
    },
  },
  {
    protocol: 'aster',
    origins: ['https://www.asterdex.com', 'https://asterdex.com'],
    match: (d) =>
      d.domain.name === 'AsterSignTransaction' &&
      (ASTER_BUILDER_TYPES.includes(d.primaryType) ||
        (d.primaryType === 'ApproveAgent' && asterAgentHasBuilder(d))),
    hasFee: (d) => !asterFeeIsZero(d),
    isKnownInjector: (d) =>
      (signedFields(d) ?? [])
        .filter((n) => /^(spot)?builder$/i.test(n))
        .some((n) => isKnownInjectorAddress(d.message[n])),
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

// A key must appear on exactly one line; a missing, repeated or non-hex value
// is undefined, so the collector exemption fails and the fee check blocks.
const lighterHex = (lines: string[], key: string) => {
  const found = lines.filter((l) => l.startsWith(`${key}:`));
  const value = found.length === 1 ? found[0].slice(key.length + 1).trim() : '';
  return /^0x[0-9a-fA-F]+$/.test(value) ? BigInt(value) : undefined;
};

const TEXT_RULES: Rule<string[]>[] = [
  {
    protocol: 'lighter',
    origins: [
      'https://app.lighter.xyz',
      'https://lighter.xyz',
      'https://testnet.app.lighter.xyz',
      'https://robinhoodchain.lighter.xyz',
    ],
    match: (lines) =>
      lines[0] === 'Approve Integrator' &&
      lines.includes('Only sign this message for a trusted client!'),
    hasFee: (lines) =>
      LIGHTER_FEE_COLLECTORS[String(lighterHex(lines, 'chainId'))] !==
        String(lighterHex(lines, 'integrator account index')) &&
      !LIGHTER_FEE_KEYS.every((key) => lighterHex(lines, key) === BigInt(0)),
    isKnownInjector: (lines) =>
      LIGHTER_KNOWN_INJECTORS[String(lighterHex(lines, 'chainId'))] ===
      String(lighterHex(lines, 'integrator account index')),
  },
];

const isObject = (v: unknown): v is Record<string, any> =>
  typeof v === 'object' && v !== null;

const detect = <T>(rules: Rule<T>[], data: T, origin: string) =>
  rules.find(
    (r) =>
      r.match(data) &&
      r.hasFee(data) &&
      (r.origins.includes(origin) || r.isKnownInjector(data))
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
