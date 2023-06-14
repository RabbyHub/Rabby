import {
  ParseTextResponse,
  CreateKeyAction,
  VerifyAddressAction,
} from '@debank/rabby-api/dist/types';
import { ContextActionData } from '@debank/rabby-security-engine/dist/rules';

export interface TextActionData {
  sender: string;
  createKey?: CreateKeyAction;
  verifyAddress?: VerifyAddressAction;
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
  }
  return null;
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

export const getActionTypeText = (data: TextActionData) => {
  if (data.createKey) {
    return 'Create Key';
  }
  if (data.verifyAddress) {
    return 'Verify Address';
  }
  return '';
};
