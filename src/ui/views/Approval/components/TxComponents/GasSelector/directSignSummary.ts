import { formatGasHeaderUsdValue } from '@/ui/utils/number';

type BuildDirectSignSummaryParams = {
  displayGasMethod: 'native' | 'gasAccount';
  gasCostUsdStr: string;
  gasCostAmountStr: string;
  gasAccountCost?: {
    estimate_tx_cost?: number;
    gas_cost?: number;
  };
};

export const calcGasAccountUsd = (value: number | string) => {
  return formatGasHeaderUsdValue(value || '0');
};

export const buildDirectSignSummary = ({
  displayGasMethod,
  gasCostUsdStr,
  gasCostAmountStr,
  gasAccountCost,
}: BuildDirectSignSummaryParams) => {
  if (displayGasMethod === 'gasAccount') {
    const totalCost =
      (gasAccountCost?.estimate_tx_cost || 0) + (gasAccountCost?.gas_cost || 0);

    return {
      primaryText: calcGasAccountUsd(totalCost),
      secondaryText: `~${calcGasAccountUsd(totalCost).replace('$', '')} USD`,
      useGasAccountCost: true,
    };
  }

  return {
    primaryText: gasCostUsdStr,
    secondaryText: `~${gasCostAmountStr}`,
    useGasAccountCost: false,
  };
};
