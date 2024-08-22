import { ParseAction } from '../../types';

export const parseActionCommon: ParseAction = (options) => {
  const { data } = options;
  if (data?.type !== null) {
    return {};
  }

  const from =
    options.type === 'transaction'
      ? options.tx.from
      : options.type === 'text'
      ? undefined
      : options.sender;

  return {
    common: {
      from,
      ...(data as any),
    },
  };
};
