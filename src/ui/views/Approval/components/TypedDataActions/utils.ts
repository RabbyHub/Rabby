import * as Sentry from '@sentry/browser';
import i18n from '@/i18n';
import { ParsedTypedDataActionData } from '@rabby-wallet/rabby-action';
import { getActionTypeText as getTransactionActionTypeText } from '../Actions/utils';
import { decodeSingle, encodeSingle } from '@metamask/abi-utils';
import {
  TypedDataUtils,
  SignTypedDataVersion,
  MessageTypes,
  TypedMessage,
} from '@metamask/eth-sig-util';
import { filterPrimaryType } from '../SignTypedDataExplain/parseSignTypedDataMessage';

export const getActionTypeText = (data: ParsedTypedDataActionData | null) => {
  const { t } = i18n;

  if (data?.permit) {
    return t('page.signTypedData.permit.title');
  }
  if (data?.permit2 || data?.batchPermit2) {
    return t('page.signTypedData.permit2.title');
  }
  if (data?.approveNFT) {
    return t('page.signTx.nftApprove.title');
  }
  if (data?.swapTokenOrder) {
    return t('page.signTypedData.swapTokenOrder.title');
  }
  if (data?.buyNFT || data?.sellNFT || data?.batchSellNFT) {
    return t('page.signTypedData.sellNFT.title');
  }
  if (data?.signMultiSig) {
    return t('page.signTypedData.signMultiSig.title');
  }
  if (data?.createKey) {
    return t('page.signTypedData.createKey.title');
  }
  if (data?.verifyAddress) {
    return t('page.signTypedData.verifyAddress.title');
  }
  if (data?.contractCall) {
    return t('page.signTx.unknownAction');
  }
  if (data?.coboSafeCreate) {
    return t('page.signTx.coboSafeCreate.title');
  }
  if (data?.coboSafeModificationRole) {
    return t('page.signTx.coboSafeModificationRole.title');
  }
  if (data?.coboSafeModificationDelegatedAddress) {
    return t('page.signTx.coboSafeModificationDelegatedAddress.title');
  }
  if (data?.coboSafeModificationTokenApproval) {
    return t('page.signTx.coboSafeModificationTokenApproval.title');
  }
  if (data?.send) {
    return t('page.signTx.send.title');
  }
  if (data?.revokePermit) {
    return t('page.signTx.revokePermit.title');
  }
  if (data?.assetOrder) {
    return t('page.signTx.assetOrder.title');
  }
  if (data?.common) {
    return data.common.title;
  }
  if (data && getTransactionActionTypeText(data)) {
    return getTransactionActionTypeText(data);
  }

  return t('page.signTx.unknownAction');
};

type TypedDataPayload = {
  primaryType: string;
  types: Record<string, any>;
  domain: Record<string, any>;
  message: Record<string, any>;
};

export type NormalizeTypeDataVersion =
  | SignTypedDataVersion.V3
  | SignTypedDataVersion.V4;

export type NormalizeTypeDataFailure = {
  // `field`: a value could not be re-encoded and keeps its original form.
  // `digest`: the result does not hash to what the original does.
  reason: 'field' | 'digest';
  path: string;
  type: string;
  error?: unknown;
};

// Like the signer, `T[2]`, `T[]` and `T[2][]` are arrays of what precedes the
// last brackets.
const ARRAY_TYPE_REG = /^(.*)\[\d*\]$/;

export const getNormalizeTypeDataVersion = (
  method: string
): NormalizeTypeDataVersion =>
  /v3$/i.test(method) ? SignTypedDataVersion.V3 : SignTypedDataVersion.V4;

/**
 * Re-encodes each value the way the signer does and keeps only the declared
 * fields, so the result holds the canonical form of what is signed. The input
 * is not modified. A value that cannot be re-encoded keeps its original form;
 * it is listed in `failures`, as is a result whose digest differs.
 */
export function normalizeTypeData(
  data: TypedDataPayload,
  version: NormalizeTypeDataVersion
): { typedData: TypedDataPayload; failures: NormalizeTypeDataFailure[] } {
  const types = Object.assign({ EIP712Domain: [] }, data.types);
  const failures: NormalizeTypeDataFailure[] = [];

  const normalizeAtom = (value: any, type: string, name: string) => {
    if (type.startsWith('bytes')) {
      // bytes type is complex and no need to normalize
      return value;
    }
    const [, encodedValue] = TypedDataUtils.encodeField(
      types,
      name,
      type,
      value,
      version
    );
    const encoded = encodeSingle(
      type,
      type === 'string' ? value : encodedValue
    );
    const decoded = decodeSingle(type, encoded);
    if (type === 'bool') {
      if (decoded === 0n) return false;
      if (decoded === 1n) return true;
    }
    if (
      type.startsWith('uint') ||
      type.startsWith('int') ||
      type.startsWith('ufixed') ||
      type.startsWith('fixed')
    ) {
      return (decoded as bigint).toString();
    }
    return decoded;
  };

  const normalizeStruct = (value: any, type: string, path: string) => {
    const normalized: Record<string, any> = {};
    for (const field of types[type]) {
      const fieldValue = value[field.name];
      // V3 skips a missing field.
      if (version === SignTypedDataVersion.V3 && fieldValue === undefined) {
        continue;
      }
      normalized[field.name] = normalizeValue(
        fieldValue,
        field.type,
        field.name,
        `${path}.${field.name}`
      );
    }
    return normalized;
  };

  // Follows the signer's `encodeField`: a name in `types` is a struct first.
  const normalizeValue = (
    value: any,
    type: string,
    name: string,
    path: string
  ): any => {
    try {
      if (types[type] !== undefined) {
        // V4 hashes a missing struct as zero.
        if (value === null || value === undefined) return value;
        return normalizeStruct(value, type, path);
      }
      const arrayMatch = ARRAY_TYPE_REG.exec(type);
      if (arrayMatch) {
        return (value as any[]).map((item, i) =>
          normalizeValue(item, arrayMatch[1], name, `${path}[${i}]`)
        );
      }
      return normalizeAtom(value, type, name);
    } catch (error) {
      failures.push({ reason: 'field', path, type, error });
      return value;
    }
  };

  const typedData = {
    ...data,
    domain: normalizeValue(data.domain, 'EIP712Domain', 'domain', 'domain'),
    message: normalizeValue(
      data.message,
      data.primaryType,
      'message',
      'message'
    ),
  };

  const hash = (payload: TypedDataPayload) =>
    TypedDataUtils.eip712Hash(
      payload as TypedMessage<MessageTypes>,
      version
    ).toString('hex');
  let originalHash: string | undefined;
  try {
    originalHash = hash(data);
  } catch (e) {
    // The signer rejects it as well.
  }
  if (originalHash !== undefined) {
    const digestFailure = {
      reason: 'digest' as const,
      path: '',
      type: String(data.primaryType),
    };
    try {
      if (hash(typedData) !== originalHash) failures.push(digestFailure);
    } catch (error) {
      failures.push({ ...digestFailure, error });
    }
  }

  return { typedData, failures };
}

/**
 * Reports a request whose typed data did not normalize, to learn how often it
 * happens before such a request is rejected.
 */
export const reportNormalizeTypeDataFailures = (
  failures: NormalizeTypeDataFailure[],
  context: { rawTypedData: string }
) => {
  if (!failures.length) return;
  try {
    Sentry.captureMessage('eip712-sec: typed data normalize failed', {
      extra: {
        rawTypedData: context.rawTypedData,
      },
    });
  } catch (e) {
    // Reporting must not change what the approval shows.
  }
};

export function cleanEIP712Payload(rawPayload: {
  primaryType: string;
  types: Record<string, any>;
  domain: Record<string, any>;
  message: Record<string, any>;
}) {
  if (!rawPayload || typeof rawPayload !== 'object')
    throw new Error('Invalid payload');
  const { types, primaryType } = rawPayload;

  if (!types || typeof types !== 'object') throw new Error('Missing types');
  if (!primaryType || typeof primaryType !== 'string')
    throw new Error('Missing primaryType');

  const cleanTypes: Record<string, any> = {};
  const visitedTypes = new Set();

  function extractDependencies(typeName, currentDepth = 0) {
    const MAX_DEPTH = 100;

    if (currentDepth > MAX_DEPTH) {
      throw new Error(`Type dependency depth exceeded limit of ${MAX_DEPTH}`);
    }

    if (visitedTypes.has(typeName)) return;

    const typeDef = types[typeName];
    if (!typeDef) return;

    // 根据 EIP-712 规范，类型定义必须是数组
    if (!Array.isArray(typeDef)) return;

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
