import { ContextActionData } from '@rabby-wallet/rabby-security-engine/dist/rules';
import { ActionRequireData } from './actionRequireData';
import { ParsedActionData } from './parsedActionData';

export type FormatSecurityEngineContextParameters =
  | {
      type: 'transaction';
      actionData: ParsedActionData<'transaction'>;
      requireData: ActionRequireData;
      chainId?: string;
      provider: {
        getTimeSpan: (
          time: number
        ) => { d: number; h: number; m: number; s: number };
        hasAddress: (address: string) => Promise<boolean>;
      };
    }
  | {
      type: 'typed_data';
      actionData: ParsedActionData<'typed_data'>;
      requireData?: ActionRequireData;
      chainId?: string;
      origin: string;
      provider: {
        getTimeSpan: (
          time: number
        ) => { d: number; h: number; m: number; s: number };
        hasAddress: (address: string) => Promise<boolean>;
      };
    }
  | {
      type: 'text';
      actionData: ParsedActionData<'text'>;
      origin: string;
    };

export type FormatSecurityEngineContext = (
  options: FormatSecurityEngineContextParameters
) => Promise<ContextActionData>;
