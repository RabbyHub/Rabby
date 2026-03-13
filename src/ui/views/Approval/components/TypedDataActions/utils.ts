import i18n from '@/i18n';
import { ParsedTypedDataActionData } from '@rabby-wallet/rabby-action';
import { getActionTypeText as getTransactionActionTypeText } from '../Actions/utils';
import { decodeSingle, encodeSingle } from '@metamask/abi-utils';
import { TypedDataUtils, SignTypedDataVersion } from '@metamask/eth-sig-util';
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

export function normalizeTypeData(data: {
  primaryType: string;
  types: Record<string, any>;
  domain: Record<string, any>;
  message: Record<string, any>;
}) {
  try {
    return parseSignTypedData(data);
  } catch (e) {
    return data;
  }
}
function parseSignTypedData(typedData: {
  primaryType: string;
  types: Record<string, any>;
  domain: Record<string, any>;
  message: Record<string, any>;
}) {
  const { domain, message, types, primaryType } = typedData;

  function parseAndDecode(data: any, dataType: string, name: string) {
    if (dataType.endsWith('[]')) {
      const elementType = dataType.slice(0, -2);
      const decodedArray: any[] = [];
      for (const element of data) {
        decodedArray.push(parseAndDecode(element, elementType, ''));
      }
      return decodedArray;
    } else if (types[dataType]) {
      for (const field of types[dataType]) {
        const { name, type } = field;
        data[name] = parseAndDecode(data[name], type, name);
      }
      return data;
    } else {
      if (dataType.startsWith('bytes')) {
        // bytes type is complex and no need to normalize
        return data;
      }
      const [t, v] = TypedDataUtils.encodeField(
        types,
        name,
        dataType,
        data,
        SignTypedDataVersion.V4
      );
      const encoded = encodeSingle(dataType, dataType === 'string' ? data : v);
      const decoded = decodeSingle(dataType, encoded);
      switch (dataType) {
        case 'address':
          return decoded;
        case 'bool':
          if (decoded === 0n) {
            return false;
          } else if (decoded === 1n) {
            return true;
          }
          break;
        default:
        // NOTHING
      }
      if (
        dataType.startsWith('uint') ||
        dataType.startsWith('int') ||
        dataType.startsWith('ufixed') ||
        dataType.startsWith('fixed')
      ) {
        return (decoded as bigint).toString();
      }
      if (dataType === 'string') {
        return decoded;
      }

      return decoded;
    }
  }

  for (const field of types[primaryType]) {
    typedData.message[field.name] = parseAndDecode(
      message[field.name],
      field.type,
      field.name
    );
  }

  for (const field of types.EIP712Domain) {
    domain[field.name] = parseAndDecode(
      domain[field.name],
      field.type,
      field.name
    );
  }

  // Filter out the fields that are not part of the primary type
  typedData.message = filterPrimaryType({
    primaryType,
    types,
    message: typedData.message,
  });

  typedData.domain = filterPrimaryType({
    primaryType: 'EIP712Domain',
    types,
    message: domain,
  });

  return typedData;
}

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
