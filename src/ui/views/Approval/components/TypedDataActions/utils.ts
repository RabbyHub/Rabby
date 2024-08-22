import {
  SellNFTOrderAction,
  SignMultiSigActions,
  ContractDesc,
  BuyNFTOrderAction,
  PermitAction,
  Permit2Action,
  TokenItem,
  CreateKeyAction,
  VerifyAddressAction,
  BatchPermit2Action,
  BatchSellNFTOrderAction,
  CreateCoboSafeAction,
  SubmitSafeRoleModificationAction,
  SubmitDelegatedAddressModificationAction,
  SubmitTokenApprovalModificationAction,
  SendAction,
  RevokeTokenApproveAction,
  NFTItem,
  ApproveNFTAction,
} from '@rabby-wallet/rabby-api/dist/types';
import { getArrayType, isArrayType } from '@metamask/abi-utils/dist/parsers';
import { BigNumber as EthersBigNumber } from 'ethers';
import { isStrictHexString, add0x } from 'ui/utils/address';
import i18n from '@/i18n';
import { SendRequireData, ApproveNFTRequireData } from '../Actions/utils';
import { ReceiverData } from '../Actions/components/ViewMorePopup/ReceiverPopup';
import { parseNumber } from '@metamask/eth-sig-util';
import { padStart } from 'lodash';

interface PermitActionData extends PermitAction {
  expire_at: number | undefined;
}

interface Permit2ActionData extends Permit2Action {
  sig_expire_at: number | undefined;
}

interface BatchPermit2ActionData extends BatchPermit2Action {
  sig_expire_at: number | undefined;
}

export interface TypedDataActionData {
  chainId?: string;
  brand?: {
    logo_url: string;
    name: string;
  };
  contractId?: string;
  sender: string;
  actionType: string | null;
  sellNFT?: SellNFTOrderAction;
  batchSellNFT?: BatchSellNFTOrderAction;
  signMultiSig?: SignMultiSigActions;
  buyNFT?: BuyNFTOrderAction;
  permit?: PermitActionData;
  permit2?: Permit2ActionData;
  approveNFT?: ApproveNFTAction;
  batchPermit2?: BatchPermit2ActionData;
  swapTokenOrder?: {
    payToken: TokenItem;
    receiveToken: TokenItem;
    receiver: string;
    usdValueDiff: string;
    usdValuePercentage: number;
    expireAt: number | null;
  };
  createKey?: CreateKeyAction;
  verifyAddress?: VerifyAddressAction;
  send?: SendAction;
  contractCall?: object;
  coboSafeCreate?: CreateCoboSafeAction;
  coboSafeModificationDelegatedAddress?: SubmitSafeRoleModificationAction;
  coboSafeModificationRole?: SubmitDelegatedAddressModificationAction;
  coboSafeModificationTokenApproval?: SubmitTokenApprovalModificationAction;
  revokePermit?: RevokeTokenApproveAction;
  assetOrder?: {
    payTokenList: TokenItem[];
    payNFTList: NFTItem[];
    receiveTokenList: TokenItem[];
    receiveNFTList: NFTItem[];
    takers: string[];
    receiver: string | null;
    expireAt: string | null;
  };
  common?: {
    title: string;
    desc: string;
    is_asset_changed: boolean;
    is_involving_privacy: boolean;
    receiver?: string;
    from: string;
  };
}

export interface ContractRequireData {
  id: string;
  protocol: {
    name: string;
    logo_url: string;
  } | null;
  bornAt: number;
  hasInteraction: boolean;
  rank: number | null;
  unexpectedAddr: ReceiverData | null;
  receiverInWallet: boolean;
}

export interface ApproveTokenRequireData {
  isEOA: boolean;
  contract: Record<string, ContractDesc> | null;
  riskExposure: number;
  rank: number | null;
  hasInteraction: boolean;
  bornAt: number;
  protocol: {
    id: string;
    name: string;
    logo_url: string;
  } | null;
  isDanger: boolean | null;
  token: TokenItem;
}

export interface BatchApproveTokenRequireData {
  isEOA: boolean;
  contract: Record<string, ContractDesc> | null;
  riskExposure: number;
  rank: number | null;
  hasInteraction: boolean;
  bornAt: number;
  protocol: {
    id: string;
    name: string;
    logo_url: string;
  } | null;
  isDanger: boolean | null;
  tokens: TokenItem[];
}

export interface MultiSigRequireData {
  id: string;
  contract: Record<string, ContractDesc> | null;
}

export interface SwapTokenOrderRequireData extends ContractRequireData {
  sender: string;
}

export type TypedDataRequireData =
  | SwapTokenOrderRequireData
  | ContractRequireData
  | MultiSigRequireData
  | ApproveTokenRequireData
  | BatchApproveTokenRequireData
  | SendRequireData
  | ApproveNFTRequireData
  | null;

export const getActionTypeText = (data: TypedDataActionData | null) => {
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
