import i18n from '@/i18n';
import {
  ParseTextResponse,
  CreateKeyAction,
  VerifyAddressAction,
} from '@rabby-wallet/rabby-api/dist/types';
import { ContextActionData } from '@rabby-wallet/rabby-security-engine/dist/rules';

export interface TextActionData {
  sender: string;
  createKey?: CreateKeyAction;
  verifyAddress?: VerifyAddressAction;
  common?: {
    desc: string;
    title: string;
    is_asset_changed: boolean;
    is_involving_privacy: boolean;
  };
}

export const parseAction = (
  data: ParseTextResponse,
  text: string,
  address: string
) => {
  const result: TextActionData = {
    sender: address,
  };
  switch (data.action?.type) {
    case 'create_key':
      result.createKey = data.action.data as CreateKeyAction;
      return result;
    case 'verify_address':
      result.verifyAddress = data.action.data as VerifyAddressAction;
      return result;
    case null:
      result.common = data.action as any;
      return result;
    default:
      return null;
  }
};

export const formatSecurityEngineCtx = ({
  actionData,
  origin,
}: {
  actionData: TextActionData | null;
  origin: string;
}): ContextActionData => {
  if (actionData?.createKey) {
    return {
      createKey: {
        allowOrigins: actionData.createKey.allow_origins,
        origin,
      },
    };
  }
  if (actionData?.verifyAddress) {
    return {
      verifyAddress: {
        allowOrigins: actionData.verifyAddress.allow_origins,
        origin,
      },
    };
  }
  return {};
};

export const getActionTypeText = (data: TextActionData | null) => {
  const { t } = i18n;

  if (data?.createKey) {
    return t('page.signTypedData.createKey.title');
  }
  if (data?.verifyAddress) {
    return t('page.signTypedData.verifyAddress.title');
  }
  if (data?.common) {
    return data.common.title;
  }
  return t('page.signTx.unknownAction');
};
