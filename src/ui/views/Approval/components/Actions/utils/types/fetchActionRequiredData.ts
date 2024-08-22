import { ParseTxResponse, Tx } from '@rabby-wallet/rabby-api/dist/types';
import { ParsedActionData } from './parsedActionData';
import { OpenApiService } from '@rabby-wallet/rabby-api';
import { WalletProvider } from './walletProvider';
import { ActionRequireData } from './actionRequireData';

type BaseFetchActionRequiredDataParameters<
  T extends 'typed_data' | 'transaction' | undefined
> = {
  actionData: ParsedActionData<T>;
  sender: string;
  walletProvider: WalletProvider;
  apiProvider: OpenApiService;
};

export type FetchTransactionRequiredDataParameters = BaseFetchActionRequiredDataParameters<'transaction'> & {
  type: 'transaction';
  contractCall?: ParseTxResponse['contract_call'] | null;
  chainId: string;
  tx: Tx;
};

export type FetchTypedDataRequiredDataParameters = BaseFetchActionRequiredDataParameters<'typed_data'> & {
  type: 'typed_data';
  chainId?: string;
};

export type FetchActionRequiredDataParameters =
  | FetchTransactionRequiredDataParameters
  | FetchTypedDataRequiredDataParameters;

export type FetchActionRequiredData<T = undefined> = (
  options: FetchActionRequiredDataParameters,
  likeAction?: T
) => Promise<ActionRequireData>;
