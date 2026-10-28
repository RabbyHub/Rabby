// Names the signer treats as built-in when they are absent from `types`.
// Anchored at the start so an over-long key cannot trigger quadratic backtracking.
const BUILTIN_TYPE_REG = /^(address|bool|string|function|bytes\d*|u?int\d*|u?fixed(\d+x\d+)?)(\[\d*\])*$/;

/**
 * A struct declared under a built-in name is read as a struct by one EIP-712
 * implementation and as the built-in by another, so what gets parsed for
 * display may not be what gets signed. Returns the first such name, if any.
 */
export const findShadowedBuiltinType = (types: unknown): string | undefined => {
  if (!types || typeof types !== 'object') return undefined;
  return Object.keys(types).find((name) => BUILTIN_TYPE_REG.test(name));
};

// The signer coerces some values instead of rejecting them, so what is
// displayed is not what is signed: `bool` is encoded as `Boolean(value)` (the
// string "false" signs true), `string` encodes a number as its bytes (123
// signs "{"), and `address` reads a string without `0x` as a decimal number
// with letters as digits. Each listed type only accepts values the signer
// encodes as displayed; a short hex address is left-padded like a number.
const STRICT_VALUE_CHECKS: Record<
  string,
  { expected: string; test: (value: unknown) => boolean }
> = {
  bool: { expected: 'a boolean', test: (v) => typeof v === 'boolean' },
  address: {
    expected: 'a 0x-prefixed hex string of at most 20 bytes',
    test: (v) => typeof v === 'string' && /^0x[0-9a-f]{1,40}$/i.test(v),
  },
  string: { expected: 'a string', test: (v) => typeof v === 'string' },
};

export type InvalidTypedDataValue = {
  path: string;
  type: string;
  expected: string;
};

// `findInvalidTypedDataValue` follows the signer's encoding traversal and
// returns the first value that fails its type's check.

const findInvalidValueInField = (
  types: Record<string, unknown>,
  type: string,
  value: unknown,
  path: string
): InvalidTypedDataValue | undefined => {
  // Like the signer, a name in `types` is a struct before anything else.
  if (types[type] !== undefined) {
    return findInvalidValueInStruct(types, type, value, path);
  }
  const check = STRICT_VALUE_CHECKS[type];
  if (check) {
    return check.test(value)
      ? undefined
      : { path, type, expected: check.expected };
  }
  if (type.endsWith(']') && Array.isArray(value)) {
    const itemType = type.slice(0, type.lastIndexOf('['));
    for (let i = 0; i < value.length; i++) {
      const found = findInvalidValueInField(
        types,
        itemType,
        value[i],
        `${path}[${i}]`
      );
      if (found) return found;
    }
  }
  return undefined;
};

const findInvalidValueInStruct = (
  types: Record<string, unknown>,
  type: string,
  value: unknown,
  path: string
): InvalidTypedDataValue | undefined => {
  const fields = types[type];
  // A null struct is hashed as zero in V4; anything else here the signer rejects.
  if (!Array.isArray(fields) || value === null || value === undefined) {
    return undefined;
  }
  for (const field of fields) {
    if (typeof field?.type !== 'string') continue;
    // Plain property access, as the signer does: it also reads inherited keys
    // such as `constructor`.
    const fieldValue = (value as any)[field.name];
    // V3 skips a missing field and V4 rejects it.
    if (fieldValue === undefined) continue;
    const found = findInvalidValueInField(
      types,
      field.type,
      fieldValue,
      `${path}.${String(field.name)}`
    );
    if (found) return found;
  }
  return undefined;
};

export const findInvalidTypedDataValue = (
  typedData: any
): InvalidTypedDataValue | undefined => {
  if (!typedData || typeof typedData !== 'object') return undefined;
  const types = Object.assign({ EIP712Domain: [] }, typedData.types);
  const found = findInvalidValueInStruct(
    types,
    'EIP712Domain',
    typedData.domain,
    'domain'
  );
  if (found) return found;
  const { primaryType } = typedData;
  if (typeof primaryType !== 'string' || primaryType === 'EIP712Domain') {
    return undefined;
  }
  return findInvalidValueInStruct(
    types,
    primaryType,
    typedData.message,
    'message'
  );
};

/**
 * `JSON.parse` keeps `__proto__` as a plain own key, but the signer's
 * `Object.assign` turns it into the prototype, so a type hidden there is
 * invisible to validation and display yet still resolved when signing.
 * Parses `data` and reports whether a `__proto__` key appears at any depth.
 */
export const parseTypedDataJson = (data: string) => {
  let hasProtoKey = false;
  const json = JSON.parse(data, (key, value) => {
    if (key === '__proto__') hasProtoKey = true;
    return value;
  });
  return { json, hasProtoKey };
};
