import { getArrayType, isArrayType } from '@metamask/abi-utils/dist/parsers';
import { BigNumber as EthersBigNumber } from 'ethers';
import { isStrictHexString, add0x } from 'ui/utils/address';
import i18n from '@/i18n';
import { parseNumber } from '@metamask/eth-sig-util';
import { padStart } from 'lodash';
import { ParsedTypedDataActionData } from '@rabby-wallet/rabby-action';

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
  return t('page.signTx.unknownAction');
};

export function normalizeTypeData(data: {
  primaryType: string;
  types: Record<string, any>;
  domain: Record<string, any>;
  message: Record<string, any>;
}) {
  try {
    const { types, primaryType, domain, message } = data;
    const domainTypes = types.EIP712Domain;
    const messageTypes = types[primaryType];
    domainTypes.forEach((item) => {
      const { name, type } = item;
      domain[name] = normalizeValue(type, domain[name]);
    });
    messageTypes.forEach((item) => {
      const { name, type } = item;
      message[name] = normalizeValue(type, message[name]);
    });
    return { types, primaryType, domain, message };
  } catch (e) {
    return data;
  }
}

export function normalizeValue(type: string, value: unknown): any {
  if (isArrayType(type) && Array.isArray(value)) {
    const [innerType] = getArrayType(type);
    return value.map((item) => normalizeValue(innerType, item));
  }

  if (type === 'address') {
    let address = value as string;
    if (typeof value === 'string' && !/^(0x|0X)/.test(value)) {
      address = EthersBigNumber.from(value).toHexString();
    } else if (isStrictHexString(value)) {
      address = add0x(value);
    }
    try {
      const parseAddress = padStart(
        parseNumber(address).toString('hex'),
        40,
        '0'
      );
      return `0x${parseAddress}`;
    } catch (e) {
      return address;
    }
  }

  return value;
}
