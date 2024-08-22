import { FormatSecurityEngineContext } from '../../types';

export const formatSecurityEngineCreateKey: FormatSecurityEngineContext = async (
  options
) => {
  if (options.type !== 'text' && options.type !== 'typed_data') {
    return {};
  }
  const { actionData, origin } = options;

  if (!actionData.createKey) {
    return {};
  }
  return {
    createKey: {
      allowOrigins: actionData.createKey.allow_origins,
      origin,
    },
  };
};
