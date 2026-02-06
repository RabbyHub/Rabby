import { ReactElement } from 'react';

export enum TxAction {
  APPROVAL,
  MAIN_ACTION,
  GAS_ESTIMATION,
}

export type TxErrorType = {
  blocking: boolean;
  actionBlocked: boolean;
  rawError: Error;
  error: ReactElement | undefined;
  txAction: TxAction;
};

export const LendingReportType = {
  Supply: 'Supply',
  Withdraw: 'Withdraw',
  Borrow: 'Borrow',
  Repay: 'Repay',
  RepayWithAToken: 'RepayWithAToken',
};
