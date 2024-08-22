import {
  ParseAction,
  ParsedActionData,
  ParseTypedDataActionParameters,
} from '../types';

export const parseTypedDataAction = (
  fn: (options: ParseTypedDataActionParameters) => Partial<ParsedActionData>
): ParseAction<'typed_data'> => {
  return (options) => {
    const { data, typedData, sender } = options;
    const result: ParsedActionData<'typed_data'> = {
      sender,
      actionType: null,
      brand: (data?.data as any)?.brand,
    };
    if (typedData?.domain) {
      if (typedData.domain.verifyingContract) {
        result.contractId = typedData.domain.verifyingContract;
      }
      if (typedData.domain.chainId) {
        result.chainId = typedData.domain.chainId;
      }
    }
    result.actionType = data?.type || null;
    const action = fn(options) as ParsedActionData<'typed_data'>;
    if ('contractCall' in action && action.contractCall && result.actionType) {
      result.actionType = 'contractCall';
    }

    return {
      ...result,
      ...action,
    };
  };
};
