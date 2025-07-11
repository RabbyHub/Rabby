import i18n from '@/i18n';
import { ParsedTypedDataActionData } from '@rabby-wallet/rabby-action';
import { getActionTypeText as getTransactionActionTypeText } from '../Actions/utils';
import { decodeSingle, encodeSingle } from '@metamask/abi-utils';
import BigNumber from 'bignumber.js';
import { filterPrimaryType } from '../SignTypedDataExplain/parseSignTypedDataMessage';
import { bytesToHex } from '@ethereumjs/util';

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

  function parseAndDecode(data: any, dataType: string) {
    if (dataType.endsWith('[]')) {
      const elementType = dataType.slice(0, -2);
      const decodedArray: any[] = [];
      for (const element of data) {
        decodedArray.push(parseAndDecode(element, elementType));
      }
      return decodedArray;
    } else if (types[dataType]) {
      for (const field of types[dataType]) {
        const { name, type } = field;
        if (type.startsWith('bytes')) {
          // bytes type is complex and no need to normalize
          data[name] = parseAndDecode(data[name], type);
        }
      }
      return data;
    } else {
      const encodedBuffer = encodeSingle(dataType, data);
      let encodedHexValue = bytesToHex(encodedBuffer);
      switch (dataType) {
        case 'address':
          encodedHexValue = bytesToHex(encodedBuffer.slice(12));
          break;
        case 'bool':
          if (new BigNumber(encodedHexValue).eq(0)) {
            return false;
          } else if (new BigNumber(encodedHexValue).eq(1)) {
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
        return new BigNumber(encodedHexValue).toFixed();
      }
      if (dataType === 'string') {
        return decodeSingle('string', encodedBuffer);
      }

      return encodedHexValue;
    }
  }

  for (const { name, type } of types.EIP712Domain) {
    domain[name] = parseAndDecode(domain[name], type);
  }

  typedData.message = parseAndDecode(message, primaryType);

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
