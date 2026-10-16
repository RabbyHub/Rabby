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
