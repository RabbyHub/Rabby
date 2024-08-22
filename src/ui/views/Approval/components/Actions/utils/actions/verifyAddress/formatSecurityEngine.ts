import { FormatSecurityEngineContext } from '../../types';

export const formatSecurityEngineVerifyAddress: FormatSecurityEngineContext = async (
  options
) => {
  if (options.type !== 'text' && options.type !== 'typed_data') {
    return {};
  }
  const { actionData, origin } = options;

  if (!actionData.verifyAddress) {
    return {};
  }
  return {
    verifyAddress: {
      allowOrigins: actionData.verifyAddress.allow_origins,
      origin,
    },
  };
};
