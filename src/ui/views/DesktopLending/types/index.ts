import { ReserveDataHumanized } from '@aave/contract-helpers';
import {
  ComputedUserReserve,
  FormatReserveUSDResponse,
  FormatUserSummaryAndIncentivesResponse,
} from '@aave/math-utils';
import { CHAINS_ENUM } from '@debank/common';

export interface IWalletBalance {
  address: string;
  amount: string;
}

export type DisplayPoolReserveInfo = ComputedUserReserve & {
  walletBalance?: string;
  walletBalanceUSD?: string;
  chain: CHAINS_ENUM;
  tokenLogo?: string;
};

export type UserSummary = FormatUserSummaryAndIncentivesResponse<
  ReserveDataHumanized & FormatReserveUSDResponse
>;
export type PopupDetailProps = {
  reserve: DisplayPoolReserveInfo;
  userSummary: UserSummary;
  onClose?: () => void;
};
export type OpenDetailProps = {
  underlyingAsset: string;
  onClose?: () => void;
};

export type EmodeCategory = {
  id: number;
  label: string;
  ltv: string;
  liquidationThreshold: string;
  liquidationBonus: string;
  assets: Array<{
    underlyingAsset: string;
    symbol: string;
    iconSymbol: string;
    collateral: boolean;
    borrowable: boolean;
  }>;
};
