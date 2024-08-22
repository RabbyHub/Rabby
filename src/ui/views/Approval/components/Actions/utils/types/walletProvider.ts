import {
  Tx,
  TxPushType,
  ExplainTxResponse,
  BasicDappInfo,
} from '@rabby-wallet/rabby-api/dist/types';
import { ParsedActionData } from './parsedActionData';
import { ActionRequireData } from './actionRequireData';
import { CHAINS_ENUM, Chain } from '@debank/common';

export interface ConnectedSite {
  origin: string;
  icon: string;
  name: string;
  chain: CHAINS_ENUM;
  e?: number;
  isSigned: boolean;
  isTop: boolean;
  order?: number;
  isConnected: boolean;
  preferMetamask?: boolean;
  isFavorite?: boolean;
  info?: BasicDappInfo;
}

export interface TransactionHistoryItem {
  rawTx: Tx;
  createdAt: number;
  isCompleted: boolean;
  hash?: string;
  failed: boolean;
  gasUsed?: number;
  isSubmitFailed?: boolean;
  site?: ConnectedSite;

  pushType?: TxPushType;
  reqId?: string;
  isWithdrawed?: boolean;
  explain?: TransactionGroup['explain'];
  action?: TransactionGroup['action'];
}

export interface TransactionSigningItem {
  rawTx: Tx;
  explain?: ExplainTxResponse & { approvalId: string; calcSuccess: boolean };
  action?: {
    actionData: ParsedActionData;
    requiredData: ActionRequireData;
  };
  id: string;
  isSubmitted?: boolean;
}

export interface TransactionGroup {
  chainId: number;
  nonce: number;
  txs: TransactionHistoryItem[];
  isPending: boolean;
  createdAt: number;
  explain?: ExplainTxResponse & { approvalId: string; calcSuccess: boolean };

  action?: {
    actionData: ParsedActionData;
    requiredData: ActionRequireData;
  };
  isFailed: boolean;
  isSubmitFailed?: boolean;
  $ctx?: any;
}

export type WalletProvider = {
  hasAddress: (address: string) => Promise<boolean>;
  hasPrivateKeyInWallet: (address: string) => Promise<string>;
  getWhitelist: () => Promise<string[]>;
  isWhitelistEnabled: () => Promise<boolean>;
  getPendingTxsByNonce: (
    address: string,
    chainId: number,
    nonce: number
  ) => Promise<any[]>;
  // TODO: move findChain to a separate file
  findChain: (params: {
    enum?: CHAINS_ENUM | string | null;
    id?: number | null;
    serverId?: string | null;
    hex?: string | null;
    networkId?: string | null;
  }) => Chain | null | undefined;
  // TODO: move ALIAS_ADDRESS to a separate file
  ALIAS_ADDRESS: Record<string, string>;
};
