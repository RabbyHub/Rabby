import { filterPrimaryType } from './SignTypedDataExplain/parseSignTypedDataMessage';

export const MAX_TYPED_DATA_DEPTH = 100;

export function cleanEIP712Payload(rawPayload: {
  primaryType: string;
  types: Record<string, any>;
  domain: Record<string, any>;
  message: Record<string, any>;
}) {
  if (!rawPayload || typeof rawPayload !== 'object') {
    throw new Error('Invalid payload');
  }
  const { types, primaryType } = rawPayload;

  if (!types || typeof types !== 'object') {
    throw new Error('Missing types');
  }
  if (!primaryType || typeof primaryType !== 'string') {
    throw new Error('Missing primaryType');
  }

  const cleanTypes: Record<string, any> = {};
  const visitedTypes = new Set();

  function extractDependencies(typeName: string, currentDepth = 0) {
    if (currentDepth > MAX_TYPED_DATA_DEPTH) {
      throw new Error(
        `Type dependency depth exceeded limit of ${MAX_TYPED_DATA_DEPTH}`
      );
    }

    if (visitedTypes.has(typeName)) return;

    const typeDef = types[typeName];
    if (!typeDef || !Array.isArray(typeDef)) return;

    visitedTypes.add(typeName);

    const cleanTypeDef: { name: string; type: string }[] = [];
    for (const field of typeDef) {
      if (typeof field.name === 'string' && typeof field.type === 'string') {
        cleanTypeDef.push({ name: field.name, type: field.type });

        const baseFieldType = field.type.replace(/\[.*?\]/g, '');
        if (types[baseFieldType]) {
          extractDependencies(baseFieldType, currentDepth + 1);
        }
      }
    }

    cleanTypes[typeName] = cleanTypeDef;
  }

  extractDependencies(primaryType);

  if (types.EIP712Domain) {
    extractDependencies('EIP712Domain');
  }

  return {
    domain: filterPrimaryType({
      primaryType: 'EIP712Domain',
      types: cleanTypes,
      message: rawPayload.domain || {},
    }),
    types: cleanTypes,
    primaryType: rawPayload.primaryType,
    message: filterPrimaryType({
      primaryType,
      types: cleanTypes,
      message: rawPayload.message || {},
    }),
  };
}

export function isDeepJSON(
  json: object | null,
  maxDepth: number,
  currentDepth: number = 1
): boolean {
  if (currentDepth > maxDepth) {
    return true;
  }

  if (typeof json !== 'object' || json === null) {
    return false;
  }

  for (const key in json) {
    if (Object.prototype.hasOwnProperty.call(json, key)) {
      if (isDeepJSON((json as any)[key], maxDepth, currentDepth + 1)) {
        return true;
      }
    }
  }

  return false;
}

export function truncateDeepJSON(
  value: unknown,
  maxDepth: number,
  currentDepth: number = 1
): unknown {
  if (currentDepth > maxDepth) {
    return '[Truncated: nested value omitted]';
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      truncateDeepJSON(item, maxDepth, currentDepth + 1)
    );
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce<Record<string, unknown>>(
      (acc, [key, nestedValue]) => {
        acc[key] = truncateDeepJSON(nestedValue, maxDepth, currentDepth + 1);
        return acc;
      },
      {}
    );
  }

  return value;
}
