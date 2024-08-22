import { ParseAction } from '../../types';

export const parseActionDeployContract: ParseAction<'transaction'> = (
  options
) => {
  const { data } = options;

  if (data?.type !== 'deploy_contract') {
    return {};
  }

  return {
    deployContract: {},
  };
};
