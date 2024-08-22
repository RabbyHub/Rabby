import {
  ParseTxResponse,
  ExplainTxResponse,
  Tx,
  ParseTypedDataResponse,
  ParseTextResponse,
} from '@rabby-wallet/rabby-api/dist/types';
import { ParsedActionData } from './parsedActionData';

export type ParseTransactionActionParameters = {
  type: 'transaction';
  data: ParseTxResponse['action'];
  balanceChange: ExplainTxResponse['balance_change'];
  tx: Tx;
  preExecVersion: 'v0' | 'v1' | 'v2';
  gasUsed: number;
};

export type ParseTypedDataActionParameters = {
  type: 'typed_data';
  data: ParseTypedDataResponse['action'];
  typedData: null | Record<string, any>;
  sender: string;
};

export type ParseTextActionParameters = {
  type: 'text';
  data: ParseTextResponse['action'];
  text: string;
  sender: string;
};

export type ParseActionParameters =
  | ParseTransactionActionParameters
  | ParseTypedDataActionParameters
  | ParseTextActionParameters;

export type ActionType = ParseActionParameters['type'];

export type ParseAction<T extends ActionType | undefined = undefined> = (
  options: T extends 'transaction'
    ? ParseTransactionActionParameters
    : T extends 'typed_data'
    ? ParseTypedDataActionParameters
    : T extends 'text'
    ? ParseTextActionParameters
    : ParseActionParameters
) => ParsedActionData<T>;

export type PartialParseAction<T extends ActionType | undefined = undefined> = (
  options: T extends 'transaction'
    ? ParseTransactionActionParameters
    : T extends 'typed_data'
    ? ParseTypedDataActionParameters
    : T extends 'text'
    ? ParseTextActionParameters
    : ParseActionParameters
) => Partial<ParsedActionData<T>>;
