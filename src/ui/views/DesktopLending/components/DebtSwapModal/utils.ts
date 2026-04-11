import {
  calculateSignedAmount,
  getToAmountAfterSlippage,
} from '../../utils/swapAction';

export const DEFAULT_DEBT_SWAP_SLIPPAGE = 40;

export const SIGNATURE_AMOUNT_MARGIN = 0.1;
export const SIGNATURE_AMOUNT_MARGIN_HIGH = 0.25;

export const getApproveAmount = (amount: string, slippage: number) => {
  const amountAfterSlippage = getToAmountAfterSlippage({
    inputAmount: amount,
    slippage: Number(slippage || 0) * 100,
  });

  return calculateSignedAmount(
    amountAfterSlippage,
    SIGNATURE_AMOUNT_MARGIN_HIGH
  );
};
