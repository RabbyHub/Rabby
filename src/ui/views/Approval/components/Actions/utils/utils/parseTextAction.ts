import {
  ParseAction,
  ParsedActionData,
  ParseTextActionParameters,
} from '../types';

export const parseTextAction = (
  fn: (options: ParseTextActionParameters) => Partial<ParsedActionData>
): ParseAction<'text'> => {
  return (options) => {
    const { sender } = options;
    const result: ParsedActionData<'text'> = {
      sender,
    };

    return {
      ...result,
      ...fn(options),
    };
  };
};
